import { PrivyClient } from "@privy-io/node";
import { NextResponse } from "next/server";

// Note: Using the user's specific env var names from .env
const PRIVY_APP_ID = process.env.SPAY_PRIVY;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_ID;

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

    // Sign the hash using Privy's rawSign
    const result = await privy.wallets().rawSign(walletId, {
        hash,
    });

    return NextResponse.json({ signature: result.signature });
  } catch (error: any) {
    console.error("Privy Sign Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
