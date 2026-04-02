import { AppProviders } from "@/providers/AppProviders";
import React from "react";

export default function ReceiveLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AppProviders>{children}</AppProviders>;
}
