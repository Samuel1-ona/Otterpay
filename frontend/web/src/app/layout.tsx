import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
};

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
        <html lang="en" className="h-full antialiased">
            <body
                className="min-h-full flex flex-col"
                style={{ backgroundColor: "#F5EFE4", color: "#0D1B4B" }}
            >
                {children}
            </body>
        </html>
    );
}
