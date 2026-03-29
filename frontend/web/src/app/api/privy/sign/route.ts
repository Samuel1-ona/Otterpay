import { PrivyClient } from "@privy-io/node";
import { NextResponse } from "next/server";
import fs from "fs";

function logToFile(data: any) {
    const logPath = "/tmp/privy.log";
    const timestamp = new Date().toISOString();
    const message = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
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
    const body = await req.json();
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
    } catch (signError: any) {
        const is401 = signError.message?.includes('401') || signError.status === 401 || signError.response?.status === 401;
        logToFile({ event: 'sign_error', is401, message: signError.message, response: signError.response?.data });
        
        // If it's a 401, try to fix-up the wallet by adding our authorization key as an additional signer
        if (is401 && PRIVY_AUTHORIZATION_KEY_ID) {
            logToFile({ event: 'attempting_fixup', walletId, keyId: PRIVY_AUTHORIZATION_KEY_ID });
            try {
                // @ts-ignore - _update is a semi-private/low-level method
                await privy.wallets()._update(walletId, {
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
            } catch (patchError: any) {
                logToFile({ event: 'fixup_failed', message: patchError.message, response: patchError.response?.data });
            }
        }
        throw signError;
    }
  } catch (error: any) {
    console.error("Privy Sign Error:", error);
    
    const responseData = error.response?.data;
    const errorMessage = error.message;

    return NextResponse.json({ 
        error: errorMessage,
        details: responseData,
        debug: {
            is401: error.status === 401 || error.response?.status === 401,
            hasAuthId: !!PRIVY_AUTHORIZATION_KEY_ID,
            walletId: walletId?.substring(0, 10) + '...'
        }
    }, { status: error.response?.status || 500 });
  }
}
