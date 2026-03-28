'use client';

import React from 'react';
import { useStarkZap } from '@/providers/StarkZapProvider';

export default function Dashboard() {
  const { wallet, isLoading, error } = useStarkZap();

  return (
    <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">StarkPay</h1>
          <p className="text-zinc-400 text-sm">Yield-bearing payments</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20" />
      </header>

      {/* Balance Card */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Balance</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-5xl font-bold text-white">$ 0.00</span>
            <span className="text-indigo-400 text-sm font-medium transition-all hover:scale-105 cursor-default">
              + $0.00 today
            </span>
          </div>
          <div className="mt-6 flex space-x-2">
             <div className="px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-400">
               0 STRK 
             </div>
             <div className="px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-400">
               0 USDC
             </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-4">
        <button className="flex flex-col items-center justify-center space-y-2 py-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all active:scale-95 group">
          <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            <SendIcon />
          </div>
          <span className="text-sm font-medium text-zinc-300">Send</span>
        </button>
        <button className="flex flex-col items-center justify-center space-y-2 py-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 transition-all active:scale-95 group">
          <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <ReceiveIcon />
          </div>
          <span className="text-sm font-medium text-zinc-300">Receive</span>
        </button>
      </section>

      {/* Yield Section */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 px-1">Yield Performance</h3>
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center space-y-1">
             <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mr-3">
               <TrendingUpIcon />
             </div>
             <div>
               <p className="text-xs text-zinc-500 leading-none">Net APY</p>
               <p className="text-sm font-semibold text-emerald-400">12.4%</p>
             </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Supplied in Vesu</p>
            <p className="text-sm font-medium text-white">$ 0.00</p>
          </div>
        </div>
      </section>

      {/* Wallet Status */}
      <footer className="mt-auto py-8">
        {!wallet ? (
          <button 
            className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm shadow-xl shadow-white/10 active:scale-98 transition-all hover:bg-zinc-200"
            onClick={() => {/* Trigger connect flow */}}
          >
            Connect with Social Login
          </button>
        ) : (
          <div className="flex items-center justify-center space-x-2 text-zinc-500 text-xs font-mono">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected: {(wallet as any).account.address.slice(0, 6)}...{(wallet as any).account.address.slice(-4)}</span>
          </div>
        )}
      </footer>
    </main>
  );
}

// Simple Icons
function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ReceiveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 7 7 17 7 7" /><polyline points="17 17 7 17 17 7" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
