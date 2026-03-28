'use client';

import React, { useEffect } from 'react';
import { useStarkZap } from '@/providers/StarkZapProvider';
import { useDashboard } from '@/hooks/useDashboard';
import { usePrivy } from '@privy-io/react-auth';
import { useAutoYield } from '@/hooks/useAutoYield';

export default function Dashboard() {
  const { wallet, connect, isLoading: isConnecting } = useStarkZap();
  const { assets, totalBalanceUsd, totalYieldUsd, history, loading, refresh, supportedTokens } = useDashboard();
  const { login, logout, authenticated, user, getAccessToken, ready } = usePrivy();

  const { isDepositing: isAutoYielding } = useAutoYield({
    wallet,
    supportedTokens,
    onDepositSuccess: (token, amount) => {
      console.log(`Successfully auto-deposited ${amount.toFormatted()} ${token.symbol}`);
      refresh();
    }
  });

  useEffect(() => {
    const syncWallet = async () => {
      if (ready && authenticated && user && !wallet && !isConnecting) {
        try {
          const token = await getAccessToken();
          if (token && user) {
            await connect(token, user.id);
          }
        } catch (err) {
          console.error('Failed to sync Privy wallet with StarkZap:', err);
        }
      }
    };

    syncWallet();
  }, [ready, authenticated, user, wallet, isConnecting, connect, getAccessToken]);

  const handleConnect = async () => {
    if (!authenticated) {
      login();
    } else {
      const token = await getAccessToken();
      if (token && user) {
        await connect(token, user.id);
      }
    }
  };

  return (
    <main className="flex-1 flex flex-col p-6 max-w-lg mx-auto w-full space-y-8">
      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">StarkPay</h1>
          <p className="text-zinc-400 text-sm">Yield-bearing payments</p>
        </div>
        <div className="flex items-center space-x-2">
          {isAutoYielding && (
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Yielding...</span>
            </div>
          )}
          {authenticated && (
            <button 
              onClick={logout}
              className="text-[10px] font-bold text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-tighter"
            >
              Logout
            </button>
          )}
          <button 
            onClick={refresh}
            disabled={loading}
            className={`p-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all ${loading ? 'animate-spin' : ''}`}
          >
            <RefreshIcon />
          </button>
        </div>
      </header>

      {/* Balance Card */}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Balance</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-5xl font-bold text-white">
              $ {totalBalanceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-indigo-400 text-sm font-medium transition-all hover:scale-105 cursor-default">
              + ${totalYieldUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} yield
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {assets.map((asset) => (
              <div key={asset.token.address} className="px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-300">
                {asset.walletBalance.add(asset.lendingBalance).toFormatted(true)} {asset.token.symbol}
              </div>
            ))}
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
          <div className="flex items-center">
             <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mr-3">
               <TrendingUpIcon />
             </div>
             <div>
               <p className="text-xs text-zinc-500 leading-none">Net APY</p>
               <p className="text-sm font-semibold text-emerald-400 mt-1">12.4%</p>
             </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 mb-1">Supplied in Vesu</p>
            <p className="text-sm font-medium text-white">$ {totalYieldUsd.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 px-1">Recent Activity</h3>
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No recent transactions</div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {history.slice(0, 5).map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-full mr-3 ${item.type === 'received' || item.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {item.type === 'received' ? <ArrowDownIcon /> : item.type === 'sent' ? <ArrowUpIcon /> : <HistoryIcon />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200 uppercase tracking-tighter">{item.type}</p>
                      <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.txHash.slice(0, 10)}...</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${item.type === 'received' || item.type === 'deposit' ? 'text-emerald-400' : 'text-white'}`}>
                      {item.type === 'received' || item.type === 'deposit' ? '+' : '-'}{item.amount.toFormatted(true)}
                    </p>
                    {item.timestamp && (
                       <p className="text-[10px] text-zinc-500 mt-0.5">
                         {new Date(item.timestamp * 1000).toLocaleDateString()}
                       </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Wallet Status */}
      <footer className="mt-auto py-8">
        {!wallet ? (
          <button 
            className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm shadow-xl shadow-white/10 active:scale-98 transition-all hover:bg-zinc-200 disabled:opacity-50"
            disabled={!ready || isConnecting}
            onClick={handleConnect}
          >
            {isConnecting ? 'Setting up wallet...' : 'Connect with Social Login'}
          </button>
        ) : (
          <div className="flex items-center justify-center space-x-2 text-zinc-500 text-xs font-mono">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
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

function RefreshIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
