"use client";

import React from "react";

interface SkeletonProps {
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Brutalist shimmer skeleton — matches the OtterPay design system.
 * Sharp corners, navy border, animated shimmer on parchment.
 */
export function Skeleton({ className = "", style }: SkeletonProps) {
    return (
        <div
            className={`relative overflow-hidden ${className}`}
            style={{
                backgroundColor: "#E8E0D0",
                border: "2px solid rgba(13,27,75,0.15)",
                ...style,
            }}
        >
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(90deg, transparent 0%, rgba(253,250,244,0.6) 50%, transparent 100%)",
                    animation: "skeleton-shimmer 1.5s infinite",
                }}
            />
            <style>{`
                @keyframes skeleton-shimmer {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}

/** A block of stacked skeleton lines — useful for text content. */
export function SkeletonLines({
    lines = 3,
    className = "",
}: {
    lines?: number;
    className?: string;
}) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="h-4"
                    style={{ width: i === lines - 1 ? "60%" : "100%" }}
                />
            ))}
        </div>
    );
}

/** A pill-shaped chip skeleton — matches the token chip style. */
export function SkeletonChip({ width = 72 }: { width?: number }) {
    return <Skeleton className="h-7 inline-block" style={{ width }} />;
}

/** A full asset row skeleton — matches the supplied-asset card style. */
export function SkeletonAssetRow() {
    return (
        <div
            className="p-4 flex items-center justify-between"
            style={{
                backgroundColor: "#E8E0D0",
                border: "3px solid rgba(13,27,75,0.15)",
            }}
        >
            <div className="space-y-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-9 w-20" />
        </div>
    );
}

/** A transaction history row skeleton. */
export function SkeletonTxRow() {
    return (
        <div
            className="p-4 flex items-center justify-between"
            style={{ backgroundColor: "#C8960A30", borderBottom: "2px solid rgba(13,27,75,0.15)" }}
        >
            <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 shrink-0" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </div>
            <div className="text-right space-y-2">
                <Skeleton className="h-5 w-16 ml-auto" />
                <Skeleton className="h-3 w-12 ml-auto" />
            </div>
        </div>
    );
}
