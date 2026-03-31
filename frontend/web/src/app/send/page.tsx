"use client";

import React from "react";
import Link from "next/link";

export default function SendPage() {
    return (
        <main
            className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full space-y-8"
            style={{ backgroundColor: "#FDFAF4" }}
        >
            <header className="flex items-center space-x-4">
                <Link
                    href="/"
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
                    Send Tokens
                </h1>
            </header>

            <section className="space-y-6">
                <div className="space-y-2">
                    <label
                        className="text-xs font-black uppercase tracking-wider"
                        style={{ color: "#0D1B4B" }}
                    >
                        Recipient Address
                    </label>
                    <input
                        type="text"
                        placeholder="0x... or ENS name"
                        className="w-full p-4 placeholder:opacity-50 focus:outline-none transition-colors text-sm font-mono"
                        style={{
                            backgroundColor: "#4A9EB5",
                            color: "#0D1B4B",
                            borderColor: "#0D1B4B",
                            borderWidth: "4px",
                            boxShadow: "4px 4px 0px rgba(26,42,108,0.2)",
                        }}
                    />
                </div>

                <div className="space-y-2">
                    <label
                        className="text-xs font-black uppercase tracking-wider"
                        style={{ color: "#0D1B4B" }}
                    >
                        Amount
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            placeholder="0.00"
                            className="w-full p-4 pr-20 placeholder:opacity-50 focus:outline-none transition-colors text-2xl font-black"
                            style={{
                                backgroundColor: "#4A9EB5",
                                color: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "4px",
                                boxShadow: "4px 4px 0px rgba(26,42,108,0.2)",
                            }}
                        />
                        <div
                            className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-black"
                            style={{
                                backgroundColor: "#1B7A4E",
                                color: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "2px",
                                boxShadow: "2px 2px 0px rgba(26,42,108,0.3)",
                            }}
                        >
                            USDC
                        </div>
                    </div>
                    <p
                        className="text-[10px] px-1 font-bold"
                        style={{ color: "#0D1B4B" }}
                    >
                        Available: 0.00 USDC
                    </p>
                </div>
            </section>

            <div className="mt-auto space-y-4">
                <div
                    className="p-4 flex items-center justify-between font-bold"
                    style={{
                        backgroundColor: "#C8960A",
                        color: "#0D1B4B",
                        borderColor: "#0D1B4B",
                        borderWidth: "4px",
                        boxShadow: "6px 6px 0px rgba(26,42,108,0.3)",
                    }}
                >
                    <div className="flex items-center space-x-3">
                        <div className="p-2" style={{ color: "#0D1B4B" }}>
                            <ZapIcon />
                        </div>
                        <span className="text-xs font-black">
                            Gasless Transaction
                        </span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        Sponsored
                    </span>
                </div>

                <button
                    className="w-full py-4 font-black text-sm active:scale-95 transition-all"
                    style={{
                        backgroundColor: "#C8960A",
                        color: "#0D1B4B",
                        borderColor: "#0D1B4B",
                        borderWidth: "4px",
                        boxShadow: "8px 8px 0px rgba(26,42,108,0.3)",
                    }}
                >
                    Preview Transaction
                </button>
            </div>
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

function ZapIcon() {
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
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}
