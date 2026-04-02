import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#0D1B4B" },
        { media: "(prefers-color-scheme: dark)", color: "#0D1B4B" },
    ],
};

export const metadata: Metadata = {
    title: "OtterPay - Yield-bearing Payments",
    description:
        "The most fun way to send and manage your crypto with built-in yield",
    applicationName: "OtterPay",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "OtterPay",
    },
    formatDetection: {
        telephone: false,
    },
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
                suppressHydrationWarning
            >
                <ServiceWorkerRegistration />
                {children}
            </body>
        </html>
    );
}
