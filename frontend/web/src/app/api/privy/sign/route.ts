import { PrivyClient } from "@privy-io/node";
import { NextResponse } from "next/server";
import fs from "fs";

type PrivyRouteError = Error & {
    status?: number;
    response?: {
        status?: number;
        data?: unknown;
    };
};

type PrivyWalletUpdateApi = ReturnType<PrivyClient["wallets"]> & {
    _update: (
        walletId: string,
        payload: {
            additional_signers: Array<{ signer_id: string }>;
        },
    ) => Promise<unknown>;
};

function logToFile(data: unknown) {
    const logPath = "/tmp/privy.log";
    const timestamp = new Date().toISOString();
    const message = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

function asPrivyRouteError(error: unknown): PrivyRouteError {
    if (error instanceof Error) {
        return error as PrivyRouteError;
    }

    return new Error(String(error)) as PrivyRouteError;
}

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

const PRIVY_AUTHORIZATION_KEY = process.env.PRIVY_AUTHORIZATION_KEY;

const PRIVY_AUTHORIZATION_KEY_ID = process.env.PRIVY_AUTHORIZATION_KEY_ID;

const privy = new PrivyClient({
  appId: PRIVY_APP_ID!,
  appSecret: PRIVY_APP_SECRET!,
});

export async function POST(req: Request) {
  let walletId: string | undefined;
  let hash: string | undefined;

  try {
    const body = (await req.json()) as { walletId?: string; hash?: string };
    walletId = body.walletId;
    hash = body.hash;
    
    logToFile({ event: 'sign_request', walletId, hash: hash?.substring(0, 10) + '...' });

    if (!walletId || !hash) {
      return NextResponse.json({ error: "walletId and hash are required" }, { status: 400 });
    }

    if (!PRIVY_AUTHORIZATION_KEY) {
      logToFile({ event: 'error_no_auth_key' });
      throw new Error("PRIVY_AUTHORIZATION_KEY is not configured on the server");
    }

    // Sign the hash using the high-level rawSign method
    // If this fails with 401, it might be because the wallet doesn't have the server key as a signer yet.
    try {
        const result = await privy.wallets().rawSign(walletId, {
            params: { hash },
            authorization_context: {
                authorization_private_keys: [PRIVY_AUTHORIZATION_KEY],
            }
        });

        console.log('[PrivySign] Success:', { signature: result.signature?.substring(0, 10) + '...' });
        return NextResponse.json({ signature: result.signature });
    } catch (signError: unknown) {
        const nextSignError = asPrivyRouteError(signError);
        const is401 =
            nextSignError.message?.includes('401') ||
            nextSignError.status === 401 ||
            nextSignError.response?.status === 401;
        logToFile({
            event: 'sign_error',
            is401,
            message: nextSignError.message,
            response: nextSignError.response?.data,
        });
        
        // If it's a 401, try to fix-up the wallet by adding our authorization key as an additional signer
        if (is401 && PRIVY_AUTHORIZATION_KEY_ID) {
            logToFile({ event: 'attempting_fixup', walletId, keyId: PRIVY_AUTHORIZATION_KEY_ID });
            try {
                await (privy.wallets() as PrivyWalletUpdateApi)._update(walletId, {
                    additional_signers: [{ signer_id: PRIVY_AUTHORIZATION_KEY_ID }]
                });
                logToFile({ event: 'fixup_success' });
                
                // Retry the sign
                const result = await privy.wallets().rawSign(walletId, {
                    params: { hash },
                    authorization_context: {
                        authorization_private_keys: [PRIVY_AUTHORIZATION_KEY!],
                    }
                });
                return NextResponse.json({ signature: result.signature });
            } catch (patchError: unknown) {
                const nextPatchError = asPrivyRouteError(patchError);
                logToFile({
                    event: 'fixup_failed',
                    message: nextPatchError.message,
                    response: nextPatchError.response?.data,
                });
            }
        }
        throw nextSignError;
    }
  } catch (error: unknown) {
    const nextError = asPrivyRouteError(error);
    console.error("Privy Sign Error:", nextError);
    
    const responseData = nextError.response?.data;
    const errorMessage = nextError.message;

    return NextResponse.json({ 
        error: errorMessage,
        details: responseData,
        debug: {
            is401:
                nextError.status === 401 ||
                nextError.response?.status === 401,
            hasAuthId: !!PRIVY_AUTHORIZATION_KEY_ID,
            walletId: walletId?.substring(0, 10) + '...'
        }
    }, { status: nextError.response?.status || 500 });
  }
}
