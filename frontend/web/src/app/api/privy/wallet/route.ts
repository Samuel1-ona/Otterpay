import { PrivyClient, LinkedAccountEmbeddedWallet } from "@privy-io/node";
import { NextResponse } from "next/server";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

const PRIVY_AUTHORIZATION_KEY_ID = process.env.PRIVY_AUTHORIZATION_KEY_ID;

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

    // Fetch user to check for existing wallet
    const user = await privy.users()._get(userId);
    
    // Check if user already has a Starknet wallet
    const existingWallet = user.linked_accounts.find(
      (acc): acc is LinkedAccountEmbeddedWallet => 
        acc.type === 'wallet' && 'chain_type' in acc && acc.chain_type === 'starknet'
    );

    if (existingWallet) {
      console.log("[Privy Wallet] Found existing wallet for user:", userId);
      const publicKey = 'public_key' in existingWallet ? existingWallet.public_key : 
                       'publicKey' in existingWallet ? (existingWallet as {publicKey: string}).publicKey : 
                       undefined;
      
      return NextResponse.json({ 
        wallet: {
          id: existingWallet.id,
          address: existingWallet.address,
          publicKey: publicKey
        }
      });
    }

    // Create a new wallet associated with the user
    // We add the PRIVY_AUTHORIZATION_KEY_ID as an additional signer to authorize server signing directly on the wallet
    const wallet = await privy.wallets().create({
      chain_type: 'starknet',
      owner: { user_id: userId },
      additional_signers: PRIVY_AUTHORIZATION_KEY_ID ? [{ signer_id: PRIVY_AUTHORIZATION_KEY_ID }] : undefined
    });

    return NextResponse.json({ 
      wallet: {
        id: wallet.id,
        address: wallet.address,
        publicKey: wallet.public_key
      }
    });
  } catch (error: unknown) {
    console.error("Privy Wallet Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
