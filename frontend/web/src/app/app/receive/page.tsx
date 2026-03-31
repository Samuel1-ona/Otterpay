"use client";

import React from "react";
import Link from "next/link";

export default function ReceivePage() {
    return (
        <main
            className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full space-y-8"
            style={{ backgroundColor: "#FDFAF4" }}
        >
            <header className="flex items-center space-x-4">
                <Link
                    href="/app"
                    className="p-2 font-bold hover:opacity-70 transition-all"
                    style={{
                        backgroundColor: "#4A9EB5",
                        borderColor: "#0D1B4B",
                        borderWidth: "3px",
                        color: "#0D1B4B",
                        boxShadow: "4px 4px 0px rgba(26,42,108,0.3)",
                    }}
                >
                    <ArrowLeftIcon />
                </Link>
                <h1 className="text-2xl font-black" style={{ color: "#0D1B4B" }}>
                    Receive
                </h1>
            </header>

            <section className="flex-1 flex flex-col items-center justify-center space-y-8">
                <div
                    className="p-8"
                    style={{
                        backgroundColor: "#C8960A",
                        borderColor: "#0D1B4B",
                        borderWidth: "5px",
                        boxShadow: "12px 12px 0px rgba(26,42,108,0.3)",
                    }}
                >
                    <div
                        className="w-64 h-64 flex items-center justify-center"
                        style={{
                            backgroundColor: "#FDFAF4",
                            borderColor: "#0D1B4B",
                            borderWidth: "4px",
                        }}
                    >
                        <div
                            className="text-center space-y-2 font-black"
                            style={{ color: "#0D1B4B" }}
                        >
                            <QrCodeIcon />
                            <p className="text-[10px] font-black uppercase tracking-widest">
                                QR Code
                            </p>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-2">
                    <label
                        className="text-xs font-black uppercase tracking-wider block text-center"
                        style={{ color: "#0D1B4B" }}
                    >
                        Your Wallet Address
                    </label>
                    <div
                        className="flex items-center space-x-2 group hover:opacity-80 transition-opacity cursor-pointer p-4 font-black"
                        style={{
                            backgroundColor: "#0D1B4B",
                            color: "#4A9EB5",
                            borderColor: "#0D1B4B",
                            borderWidth: "4px",
                            boxShadow: "6px 6px 0px rgba(26,42,108,0.3)",
                        }}
                    >
                        <span className="flex-1 text-sm font-mono truncate">
                            0x0000...0000
                        </span>
                        <div className="p-2">
                            <CopyIcon />
                        </div>
                    </div>
                </div>
            </section>

            <footer className="py-4">
                <p
                    className="text-[10px] text-center leading-relaxed max-w-[240px] mx-auto font-bold"
                    style={{ color: "#0D1B4B" }}
                >
                    Only send Starknet-native tokens to this address. Assets
                    sent on other networks may be permanently lost.
                </p>
            </footer>
        </main>
    );
}

function ArrowLeftIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function QrCodeIcon() {
    return (
        <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
        </svg>
    );
}
