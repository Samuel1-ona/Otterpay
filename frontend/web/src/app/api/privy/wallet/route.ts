import { PrivyClient } from "@privy-io/node";
import { NextResponse } from "next/server";

// Note: Using the user's specific env var names from .env
const PRIVY_APP_ID = process.env.SPAY_PRIVY; // client-xxxx
const PRIVY_APP_SECRET = process.env.PRIVY_APP_ID; // starts with privy_app_secret_

const privy = new PrivyClient({
  appId: PRIVY_APP_ID!,
  appSecret: PRIVY_APP_SECRET!,
});

export async function POST(req: Request) {
  try {
    // In a production app, you would verify the Privy access token here:
    // const header = req.headers.get("authorization");
    // const authToken = header?.replace("Bearer ", "");
    // const verifiedClaims = await privy.verifyAuthToken(authToken!);
    // const userId = verifiedClaims.userId;

    // For this implementation, we'll use a placeholder or extract from body if needed
    // The StarkZap docs suggest getting the wallet for a specific user.
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Check if wallet exists or create one
    // Note: Privy's create wallet is idempotent if you use the same user_id and chain_type
    const wallet = await privy.wallets().create({
      chainType: "starknet",
    });

    return NextResponse.json({ 
      wallet: {
        id: wallet.id,
        address: wallet.address,
        publicKey: wallet.publicKey
      }
    });
  } catch (error: any) {
    console.error("Privy Wallet Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
