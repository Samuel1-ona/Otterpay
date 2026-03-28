"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

export default function PrivyProvider({ children }: { children: ReactNode }) {
  // Using the App ID provided by the user in .env
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "client-WY6WjKEDLRQDLNC51jntyddRj5R9cmHPo7aLbTwcn4Re1";

  return (
    <BasePrivyProvider
      appId={appId}
      config={{
        // Customize Privy's appearance and behavior
        loginMethods: ["email", "google", "twitter", "apple"],
        appearance: {
          theme: "dark",
          accentColor: "#676FFF",
          showWalletLoginFirst: false,
        },
        // Embedded wallets configuration
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
