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
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Check if wallet exists or create one
    // Note: Privy's create wallet is idempotent if you use the same user_id and chain_type
    const wallet = await privy.wallets().create({
      chain_type: "starknet",
    });

    return NextResponse.json({ 
      wallet: {
        id: wallet.id,
        address: wallet.address,
        publicKey: wallet.public_key
      }
    });
  } catch (error: any) {
    console.error("Privy Wallet Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
