import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/AppProviders";

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
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
