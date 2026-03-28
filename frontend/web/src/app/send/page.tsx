'use client';

import React from 'react';
import { useStarkZap } from '@/providers/StarkZapProvider';
import Link from 'next/link';

export default function SendPage() {
  return (
    <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full space-y-8">
      <header className="flex items-center space-x-4">
        <Link href="/" className="p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-xl font-bold text-white">Send Tokens</h1>
      </header>

      <section className="space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recipient Address</label>
          <input 
            type="text" 
            placeholder="0x... or ENS name"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount</label>
          <div className="relative">
            <input 
              type="number" 
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 pr-20 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors text-2xl font-bold"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-zinc-800 text-xs font-bold text-zinc-400">
              USDC
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 px-1">Available: 0.00 USDC</p>
        </div>
      </section>

      <div className="mt-auto space-y-4">
        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
           <div className="flex items-center space-x-3">
             <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
               <ZapIcon />
             </div>
             <span className="text-xs font-medium text-zinc-300">Gasless Transaction</span>
           </div>
           <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Sponsored</span>
        </div>

        <button className="w-full py-4 rounded-2xl bg-white text-black font-bold text-sm shadow-xl shadow-white/5 active:scale-95 transition-all hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed">
          Preview Transaction
        </button>
      </div>
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

function ZapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
