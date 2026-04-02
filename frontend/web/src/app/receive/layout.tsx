import { AppProviders } from "@/providers/AppProviders";

export default function ReceiveLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <AppProviders>{children}</AppProviders>;
}
