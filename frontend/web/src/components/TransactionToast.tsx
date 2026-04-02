"use client";

import React, { useEffect, useRef } from "react";

export type TxStatus = {
    type: "idle" | "loading" | "success" | "error";
    message?: string;
};

interface TransactionToastProps {
    status: TxStatus;
    onDismiss?: () => void;
}

/**
 * Fixed-position transaction status toast.
 * Mobile: floats above the bottom nav bar.
 * Desktop: anchored to bottom-right.
 * Auto-dismisses after 4 s on success.
 */
export function TransactionToast({ status, onDismiss }: TransactionToastProps) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (status.type === "success") {
            timerRef.current = setTimeout(() => onDismiss?.(), 4000);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [status.type, onDismiss]);

    if (status.type === "idle") return null;

    const bg =
        status.type === "loading" ? "#0D1B4B"
        : status.type === "success" ? "#1B7A4E"
        : "#8B1A0A";

    const label =
        status.type === "loading" ? "Processing"
        : status.type === "success" ? "Done"
        : "Failed";

    return (
        <>
            <style>{`
                .tx-toast {
                    position: fixed;
                    z-index: 60;
                    left: 1rem;
                    right: 1rem;
                    bottom: calc(env(safe-area-inset-bottom, 0px) + 76px);
                    max-width: 480px;
                    margin-inline: auto;
                }
                @media (min-width: 768px) {
                    .tx-toast {
                        left: auto;
                        right: 1.5rem;
                        bottom: 1.5rem;
                        margin-inline: 0;
                        max-width: 380px;
                    }
                }
            `}</style>
            <div
                role="status"
                aria-live="polite"
                className="tx-toast flex items-start gap-3 px-4 py-3"
                style={{
                    backgroundColor: bg,
                    color: "#FDFAF4",
                    border: "4px solid #C8960A",
                    boxShadow: "8px 8px 0px rgba(13,27,75,0.4)",
                }}
            >
                <span className="shrink-0 mt-0.5">
                    {status.type === "loading" ? <SpinnerIcon /> : status.type === "success" ? <CheckIcon /> : <XIcon />}
                </span>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest">
                        {label}
                    </p>
                    {status.message && (
                        <p className="mt-0.5 text-sm font-bold leading-snug break-words">
                            {status.message}
                        </p>
                    )}
                </div>
                {status.type !== "loading" && onDismiss && (
                    <button
                        onClick={onDismiss}
                        aria-label="Dismiss notification"
                        style={{ background: "transparent", border: "none", boxShadow: "none", color: "#FDFAF4", opacity: 0.7, padding: 4 }}
                    >
                        <XIcon size={14} />
                    </button>
                )}
            </div>
        </>
    );
}

function SpinnerIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <style>{`@keyframes tx-spin{to{transform:rotate(360deg)}}`}</style>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" style={{ animation: "tx-spin 0.8s linear infinite" }} />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function XIcon({ size = 18 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}
