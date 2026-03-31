import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PrivyProvider from "@/providers/PrivyProvider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "OtterPay - Yield-bearing Payments",
    description:
        "The most fun way to send and manage your crypto with built-in yield",
};

import { StarknetProvider } from "@/providers/StarknetProvider";
import { StarkZapProvider } from "@/providers/StarkZapProvider";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <body
                className="min-h-full flex flex-col"
                style={{ backgroundColor: "#F5EFE4", color: "#0D1B4B" }}
            >
                <StarknetProvider>
                    <PrivyProvider>
                        <StarkZapProvider
                            network="sepolia"
                            avnuApiKey={process.env.NEXT_PUBLIC_AVNU_API_KEY}
                        >
                            {children}
                        </StarkZapProvider>
                    </PrivyProvider>
                </StarknetProvider>
            </body>
        </html>
    );
}
