import { PrivyClient } from "@privy-io/node";
import { NextResponse } from "next/server";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

const privy = new PrivyClient({
  appId: PRIVY_APP_ID!,
  appSecret: PRIVY_APP_SECRET!,
});

export async function POST(req: Request) {
  try {
    const { walletId, hash } = await req.json();

    if (!walletId || !hash) {
      return NextResponse.json({ error: "walletId and hash are required" }, { status: 400 });
    }

    // Note: The Node SDK uses _rawSign according to the type definitions
    const result = await privy.wallets()._rawSign(walletId, {
        params: {
            hash,
        },
    });

    return NextResponse.json({ signature: result.data.signature });
  } catch (error: any) {
    console.error("Privy Sign Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
