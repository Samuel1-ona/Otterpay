'use client';

import React from 'react';
import Link from 'next/link';

export default function ReceivePage() {
  return (
    <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full space-y-8">
      <header className="flex items-center space-x-4">
        <Link href="/" className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-xl font-bold text-white">Receive</h1>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center space-y-8">
        <div className="p-8 rounded-[2.5rem] bg-white shadow-2xl shadow-indigo-500/20">
          <div className="w-64 h-64 bg-zinc-100 rounded-2xl flex items-center justify-center border-4 border-zinc-50">
             {/* Placeholder for QR Code */}
             <div className="text-zinc-300 text-center space-y-2">
                <QrCodeIcon />
                <p className="text-[10px] font-bold uppercase tracking-widest">QR Code Placeholder</p>
             </div>
          </div>
        </div>

        <div className="w-full space-y-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block text-center">Your Wallet Address</label>
          <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 group hover:border-zinc-700 transition-colors cursor-pointer">
            <span className="flex-1 text-sm font-mono text-zinc-400 truncate">0x0000...0000</span>
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-500 group-hover:text-white transition-colors">
              <CopyIcon />
            </div>
          </div>
        </div>
      </section>

      <footer className="py-4">
        <p className="text-[10px] text-zinc-500 text-center leading-relaxed max-w-[240px] mx-auto">
          Only send Starknet-native tokens to this address. Assets sent on other networks may be permanently lost.
        </p>
      </footer>
    </main>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function QrCodeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
