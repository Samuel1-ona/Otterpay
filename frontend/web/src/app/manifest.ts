import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "OtterPay - Yield-bearing Payments",
        short_name: "OtterPay",
        description: "The most fun way to send and manage your crypto with built-in yield",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F5EFE4",
        theme_color: "#0D1B4B",
        categories: ["finance", "utilities"],
        icons: [
            {
                src: "/icons/icon-192",
                sizes: "192x192",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/icons/icon-512",
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
            {
                src: "/icons/icon-192",
                sizes: "192x192",
                type: "image/png",
                purpose: "any",
            },
            {
                src: "/icons/icon-512",
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
        ],
        shortcuts: [
            {
                name: "Send",
                url: "/app?tab=send",
                description: "Send crypto to anyone",
            },
            {
                name: "Receive",
                url: "/app?tab=receive",
                description: "Receive crypto payments",
            },
        ],
    };
}
