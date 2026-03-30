'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useStarkZap } from '@/providers/StarkZapProvider';
import { useDashboard } from '@/hooks/useDashboard';
import { usePrivy } from '@privy-io/react-auth';
import { useAutoYield } from '@/hooks/useAutoYield';
import { useTokens } from '@/hooks/useTokens';
import { useLending } from '@/hooks/useLending';
import { fromAddress } from 'starkzap';
import {
  generateConfidentialPrivateKey,
  getConfidentialTokenConfig,
  isValidConfidentialPrivateKey,
  parseConfidentialRecipientInput,
  useConfidential,
} from '@/hooks/useConfidential';

export default function Dashboard() {
  const { wallet, connect, connectWithCartridge, isLoading: isConnecting } = useStarkZap();
  const {
    assets,
    totalBalanceUsd,
    totalSuppliedUsd,
    history,
    loading,
    error: dashboardError,
    refresh,
    supportedTokens,
  } = useDashboard();
  const { login, logout, authenticated, user, getAccessToken, ready } = usePrivy();
  const { send, loading: isSending } = useTokens();
  const { supply, withdraw, withdrawMax, loading: isLendingAction } = useLending();
  const {
    init: initConfidential,
    clear: clearConfidential,
    refresh: refreshConfidential,
    fund: fundConfidential,
    transfer: transferConfidential,
    withdraw: withdrawConfidential,
    rollover: rolloverConfidential,
    exit: exitConfidential,
    address: confidentialAddress,
    recipientJson: confidentialRecipientJson,
    activity: confidentialActivity,
    activeBalance: confidentialActiveBalance,
    pendingBalance: confidentialPendingBalance,
    isInitialized: isConfidentialInitialized,
    loading: isConfidentialLoading,
    error: confidentialError,
  } = useConfidential();
  const availableWalletUsd = Math.max(totalBalanceUsd - totalSuppliedUsd, 0);
  const suppliedAssets = assets.filter((asset) => !asset.lendingBalance.isZero());
  const liquidAssets = assets.filter((asset) => !asset.walletBalance.isZero());
  const confidentialChainLiteral = wallet?.getChainId().toLiteral() ?? null;
  const confidentialToken = useMemo(
    () =>
      supportedTokens.find((token) => getConfidentialTokenConfig(confidentialChainLiteral || '', token)) ?? null,
    [supportedTokens, confidentialChainLiteral]
  );
  const confidentialConfig = useMemo(
    () =>
      confidentialToken && confidentialChainLiteral
        ? getConfidentialTokenConfig(confidentialChainLiteral, confidentialToken)
        : null,
    [confidentialChainLiteral, confidentialToken]
  );
  const confidentialStorageKey = useMemo(() => {
    if (!wallet || !confidentialConfig) return null;
    return `starkpay:confidential:${wallet.address.toLowerCase()}:${confidentialConfig.contractAddress.toLowerCase()}`;
  }, [wallet, confidentialConfig]);
  const confidentialHasPending =
    !!confidentialPendingBalance && !confidentialPendingBalance.isZero();
  const confidentialHistoryPreview = confidentialActivity.slice(0, 4);

  // Modal State
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showConfidentialSetupModal, setShowConfidentialSetupModal] = useState(false);
  const [showConfidentialFundModal, setShowConfidentialFundModal] = useState(false);
  const [showConfidentialSendModal, setShowConfidentialSendModal] = useState(false);
  const [showConfidentialWithdrawModal, setShowConfidentialWithdrawModal] = useState(false);
  
  // Transaction State
  const [selectedAssetAddress, setSelectedAssetAddress] = useState<string | null>(null);
  const [selectedSupplyAssetAddress, setSelectedSupplyAssetAddress] = useState<string | null>(null);
  const [selectedYieldAssetAddress, setSelectedYieldAssetAddress] = useState<string | null>(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' });
  const [supplyAmount, setSupplyAmount] = useState('');
  const [supplyStatus, setSupplyStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawStatus, setWithdrawStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', message?: string }>({ type: 'idle' });
  const [confidentialSetupMode, setConfidentialSetupMode] = useState<'create' | 'import'>('create');
  const [confidentialPrivateKeyInput, setConfidentialPrivateKeyInput] = useState('');
  const [confidentialFundAmount, setConfidentialFundAmount] = useState('');
  const [confidentialSendAmount, setConfidentialSendAmount] = useState('');
  const [confidentialSendRecipient, setConfidentialSendRecipient] = useState('');
  const [confidentialWithdrawAmount, setConfidentialWithdrawAmount] = useState('');
  const [confidentialWithdrawRecipient, setConfidentialWithdrawRecipient] = useState('');
  const [confidentialStatus, setConfidentialStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });
  const selectedAsset =
    assets.find((asset) => asset.token.address === selectedAssetAddress) ??
    assets[0] ??
    null;
  const selectedSupplyAsset =
    liquidAssets.find((asset) => asset.token.address === selectedSupplyAssetAddress) ??
    liquidAssets[0] ??
    null;
  const selectedYieldAsset =
    suppliedAssets.find((asset) => asset.token.address === selectedYieldAssetAddress) ??
    suppliedAssets[0] ??
    null;
  const storedConfidentialKey =
    confidentialStorageKey && typeof window !== 'undefined'
      ? window.localStorage.getItem(confidentialStorageKey)
      : null;

  const {
    isDepositing: isAutoYielding,
    lastSubmittedDeposit,
    lastConfirmedDeposit,
    lastDepositError,
  } = useAutoYield({
    wallet,
    supportedTokens,
    autoSweepIdleBalances: false,
    onDepositSuccess: (token, amount) => {
      console.log(`Successfully auto-deposited ${amount.toFormatted()} ${token.symbol}`);
      refresh();
    }
  });

  const yieldStatusLabel =
    totalSuppliedUsd > 0
      ? 'Yield active in Vesu'
      : isAutoYielding
        ? 'Supplying to Vesu'
        : 'Manual supply only';

  const yieldStatusDetail = lastDepositError
    ? `Last auto-supply failed: ${lastDepositError}`
    : lastConfirmedDeposit
      ? `Confirmed: ${lastConfirmedDeposit.amountLabel} ${lastConfirmedDeposit.tokenSymbol} at ${new Date(lastConfirmedDeposit.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : lastSubmittedDeposit
        ? `Pending confirmation: ${lastSubmittedDeposit.amountLabel} ${lastSubmittedDeposit.tokenSymbol}`
        : 'Funds move into Vesu only after you explicitly supply them';

  useEffect(() => {
    if (!wallet) {
      clearConfidential();
    }
  }, [wallet, clearConfidential]);

  useEffect(() => {
    if (!wallet || !confidentialConfig || !confidentialStorageKey || isConfidentialInitialized) {
      return;
    }

    const storedKey = window.localStorage.getItem(confidentialStorageKey);
    if (!storedKey) {
      return;
    }

    try {
      initConfidential(storedKey, confidentialConfig.contractAddress);
    } catch (err) {
      console.error('Failed to restore confidential vault:', err);
      window.localStorage.removeItem(confidentialStorageKey);
    }
  }, [
    wallet,
    confidentialConfig,
    confidentialStorageKey,
    isConfidentialInitialized,
    initConfidential,
  ]);

  useEffect(() => {
    if (!isConfidentialInitialized || !confidentialToken) return;

    refreshConfidential(confidentialToken).catch((err) => {
      console.error('Failed to refresh confidential vault:', err);
    });
  }, [isConfidentialInitialized, confidentialToken, refreshConfidential]);

  useEffect(() => {
    if (!isConfidentialInitialized || !confidentialToken) return;

    const interval = window.setInterval(() => {
      refreshConfidential(confidentialToken).catch((err) => {
        console.error('Failed to refresh confidential vault:', err);
      });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isConfidentialInitialized, confidentialToken, refreshConfidential]);

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

  const handlePrivyConnect = async () => {
    if (!authenticated) {
      login();
    } else {
      const token = await getAccessToken();
      if (token && user) {
        await connect(token, user.id);
      }
    }
  };

  const handleCartridgeConnect = async () => {
    try {
      await connectWithCartridge();
    } catch (err) {
      console.error('Cartridge connection failed:', err);
    }
  };

  const handleRefreshAll = async () => {
    await refresh();

    if (isConfidentialInitialized && confidentialToken) {
      await refreshConfidential(confidentialToken).catch((err) => {
        console.error('Failed to refresh confidential vault:', err);
      });
    }
  };

  const openConfidentialSetup = (mode: 'create' | 'import') => {
    setConfidentialSetupMode(mode);
    setConfidentialPrivateKeyInput(mode === 'create' ? generateConfidentialPrivateKey() : '');
    setConfidentialStatus({ type: 'idle' });
    setShowConfidentialSetupModal(true);
  };

  const handleSend = async () => {
    if (!selectedAsset || !recipient || !amount) return;
    setStatus({ type: 'loading', message: 'Initiating transfer...' });
    try {
      const tx = await send(selectedAsset.token, fromAddress(recipient), amount);
      setStatus({ type: 'success', message: `Transfer broadcasted: ${tx.hash.slice(0, 10)}...` });
      setTimeout(() => {
        setShowSendModal(false);
        setStatus({ type: 'idle' });
        setAmount('');
        setRecipient('');
        refresh();
      }, 3000);
    } catch (err: unknown) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Transfer failed' });
    }
  };

  const handleWithdraw = async () => {
    if (!selectedYieldAsset) return;
    setWithdrawStatus({ type: 'loading', message: 'Withdrawing from Vesu...' });
    try {
      const tx = withdrawAmount.trim()
        ? await withdraw(selectedYieldAsset.token, withdrawAmount)
        : await withdrawMax(selectedYieldAsset.token);

      setWithdrawStatus({ type: 'success', message: `Withdrawal broadcasted: ${tx.hash.slice(0, 10)}...` });
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawStatus({ type: 'idle' });
        setWithdrawAmount('');
        refresh();
      }, 3000);
    } catch (err: unknown) {
      setWithdrawStatus({ type: 'error', message: err instanceof Error ? err.message : 'Withdraw failed' });
    }
  };

  const handleConfidentialSetup = async () => {
    if (!confidentialConfig) return;

    const nextPrivateKey = confidentialPrivateKeyInput.trim();
    if (!isValidConfidentialPrivateKey(nextPrivateKey)) {
      setConfidentialStatus({
        type: 'error',
        message: 'Enter a valid Tongo private key before continuing.',
      });
      return;
    }

    setConfidentialStatus({ type: 'loading', message: 'Setting up your private vault...' });
    try {
      initConfidential(nextPrivateKey, confidentialConfig.contractAddress);
      if (confidentialStorageKey) {
        window.localStorage.setItem(confidentialStorageKey, nextPrivateKey);
      }
      setConfidentialStatus({
        type: 'success',
        message:
          confidentialSetupMode === 'create'
            ? 'Private vault created. Back up this Tongo key safely.'
            : 'Private vault restored on this device.',
      });
      setTimeout(() => {
        setShowConfidentialSetupModal(false);
        setConfidentialStatus({ type: 'idle' });
      }, 1200);
    } catch (err: unknown) {
      setConfidentialStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to initialize private vault',
      });
    }
  };

  const handleConfidentialFund = async () => {
    if (!confidentialToken || !confidentialFundAmount) return;

    setConfidentialStatus({ type: 'loading', message: 'Funding your private vault...' });
    try {
      const tx = await fundConfidential(confidentialToken, confidentialFundAmount);
      await tx.wait();
      await refreshConfidential(confidentialToken);
      setConfidentialStatus({
        type: 'success',
        message: `Private vault funded: ${tx.hash.slice(0, 10)}...`,
      });
      setTimeout(() => {
        setShowConfidentialFundModal(false);
        setConfidentialFundAmount('');
        setConfidentialStatus({ type: 'idle' });
      }, 1200);
    } catch (err: unknown) {
      setConfidentialStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Confidential funding failed',
      });
    }
  };

  const handleConfidentialTransfer = async () => {
    if (!confidentialToken || !confidentialSendAmount || !confidentialSendRecipient) return;

    setConfidentialStatus({ type: 'loading', message: 'Sending privately...' });
    try {
      const recipientId = parseConfidentialRecipientInput(confidentialSendRecipient);
      const tx = await transferConfidential(
        confidentialToken,
        confidentialSendAmount,
        recipientId
      );
      await tx.wait();
      await refreshConfidential(confidentialToken);
      setConfidentialStatus({
        type: 'success',
        message: `Private transfer confirmed: ${tx.hash.slice(0, 10)}...`,
      });
      setTimeout(() => {
        setShowConfidentialSendModal(false);
        setConfidentialSendAmount('');
        setConfidentialSendRecipient('');
        setConfidentialStatus({ type: 'idle' });
      }, 1200);
    } catch (err: unknown) {
      setConfidentialStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Confidential transfer failed',
      });
    }
  };

  const handleConfidentialWithdraw = async () => {
    if (!confidentialToken || !confidentialWithdrawAmount) return;

    setConfidentialStatus({ type: 'loading', message: 'Withdrawing from private vault...' });
    try {
      const tx = await withdrawConfidential(
        confidentialToken,
        confidentialWithdrawAmount,
        confidentialWithdrawRecipient
          ? fromAddress(confidentialWithdrawRecipient)
          : wallet?.address
      );
      await tx.wait();
      await refreshConfidential(confidentialToken);
      setConfidentialStatus({
        type: 'success',
        message: `Private withdrawal confirmed: ${tx.hash.slice(0, 10)}...`,
      });
      setTimeout(() => {
        setShowConfidentialWithdrawModal(false);
        setConfidentialWithdrawAmount('');
        setConfidentialStatus({ type: 'idle' });
      }, 1200);
    } catch (err: unknown) {
      setConfidentialStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Confidential withdraw failed',
      });
    }
  };

  const handleConfidentialRollover = async () => {
    if (!confidentialToken) return;

    setConfidentialStatus({ type: 'loading', message: 'Activating pending private balance...' });
    try {
      const tx = await rolloverConfidential();
      await tx.wait();
      await refreshConfidential(confidentialToken);
      setConfidentialStatus({
        type: 'success',
        message: `Pending balance activated: ${tx.hash.slice(0, 10)}...`,
      });
    } catch (err: unknown) {
      setConfidentialStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to rollover pending balance',
      });
    }
  };

  const handleConfidentialExit = async () => {
    if (!wallet || !confidentialToken) return;

    const confirmed = window.confirm(
      'Exit all active private balance back to your public wallet? Pending balance will still require rollover first.'
    );
    if (!confirmed) return;

    setConfidentialStatus({ type: 'loading', message: 'Exiting private vault...' });
    try {
      const tx = await exitConfidential(wallet.address);
      await tx.wait();
      await refreshConfidential(confidentialToken);
      setConfidentialStatus({
        type: 'success',
        message: `Private vault exited: ${tx.hash.slice(0, 10)}...`,
      });
    } catch (err: unknown) {
      setConfidentialStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to exit private vault',
      });
    }
  };

  const handleForgetConfidentialVault = () => {
    if (!confidentialStorageKey) return;

    const confirmed = window.confirm(
      'Forget the private vault key on this device? You will need the backed-up Tongo key to restore access later.'
    );
    if (!confirmed) return;

    window.localStorage.removeItem(confidentialStorageKey);
    clearConfidential();
    setConfidentialStatus({ type: 'idle' });
  };

  const handleSupply = async () => {
    if (!selectedSupplyAsset || !supplyAmount) return;
    setSupplyStatus({ type: 'loading', message: 'Supplying to Vesu...' });
    try {
      const tx = await supply(selectedSupplyAsset.token, supplyAmount);
      setSupplyStatus({ type: 'success', message: `Supply broadcasted: ${tx.hash.slice(0, 10)}...` });
      setTimeout(() => {
        setShowSupplyModal(false);
        setSupplyStatus({ type: 'idle' });
        setSupplyAmount('');
        refresh();
      }, 3000);
    } catch (err: unknown) {
      setSupplyStatus({ type: 'error', message: err instanceof Error ? err.message : 'Supply failed' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple visual feedback could go here
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
            onClick={handleRefreshAll}
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
              $ {totalSuppliedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in Vesu
            </span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {assets.map((asset) => (
              <div key={asset.token.address} className="px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-300">
                {asset.token.symbol} {asset.walletBalance.add(asset.lendingBalance).toFormatted(true)}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setShowSendModal(true)}
          disabled={!wallet}
          className="flex flex-col items-center justify-center space-y-2 py-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all active:scale-95 group disabled:opacity-50"
        >
          <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            <SendIcon />
          </div>
          <span className="text-sm font-medium text-zinc-300">Send</span>
        </button>
        <button 
          onClick={() => setShowReceiveModal(true)}
          disabled={!wallet}
          className="flex flex-col items-center justify-center space-y-2 py-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 transition-all active:scale-95 group disabled:opacity-50"
        >
          <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <ReceiveIcon />
          </div>
          <span className="text-sm font-medium text-zinc-300">Receive</span>
        </button>
      </section>

      {wallet && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setSelectedSupplyAssetAddress(liquidAssets[0]?.token.address ?? null);
              setSupplyAmount('');
              setSupplyStatus({ type: 'idle' });
              setShowSupplyModal(true);
            }}
            disabled={liquidAssets.length === 0}
            className="w-full py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-bold text-sm hover:border-indigo-500/40 hover:bg-zinc-900/80 transition-all disabled:opacity-50"
          >
            {liquidAssets.length === 0 ? 'No Liquid Funds To Supply' : 'Supply To Yield'}
          </button>
          <button
            onClick={() => {
              setSelectedYieldAssetAddress(suppliedAssets[0]?.token.address ?? null);
              setWithdrawAmount('');
              setWithdrawStatus({ type: 'idle' });
              setShowWithdrawModal(true);
            }}
            disabled={suppliedAssets.length === 0}
            className="w-full py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-bold text-sm hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-all disabled:opacity-50"
          >
            {suppliedAssets.length === 0 ? 'No Funds In Yield Yet' : 'Withdraw From Yield'}
          </button>
        </div>
      )}

      {/* Yield Section */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 px-1">Yield Performance</h3>
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
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
              <p className="text-sm font-medium text-white">$ {totalSuppliedUsd.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Wallet Cash</p>
              <p className="mt-2 text-sm font-semibold text-white">$ {availableWalletUsd.toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-zinc-500">Kept liquid for spending and fees</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Auto-Supply</p>
              <p className="mt-2 text-sm font-semibold text-emerald-400">
                {yieldStatusLabel}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                {yieldStatusDetail}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Yield Positions</p>
              <p className="text-[10px] text-zinc-500">Withdrawable at any time</p>
            </div>
            {suppliedAssets.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-[11px] text-zinc-500">
                No confirmed funds are currently shown as supplied in Vesu.
              </div>
            ) : (
              <div className="space-y-2">
                {suppliedAssets.map((asset) => (
                  <div key={asset.token.address} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{asset.token.symbol}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        In yield: {asset.lendingBalance.toFormatted(true)} {asset.token.symbol}
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        Wallet: {asset.walletBalance.toFormatted(true)} {asset.token.symbol}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedYieldAssetAddress(asset.token.address);
                        setWithdrawAmount('');
                        setWithdrawStatus({ type: 'idle' });
                        setShowWithdrawModal(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/15 transition-all"
                    >
                      Withdraw
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Confidential Transfers */}
      {wallet && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-zinc-400">Private Transfers</h3>
            <div className="flex items-center gap-2">
              {isConfidentialInitialized && confidentialToken && (
                <button
                  onClick={() => {
                    refreshConfidential(confidentialToken).catch((err) => {
                      console.error('Failed to refresh confidential vault:', err);
                    });
                  }}
                  className="rounded-full border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition-all hover:text-white"
                >
                  <RefreshIcon />
                </button>
              )}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400/80">
                Tongo
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-4 overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_55%)] pointer-events-none" />

            {!confidentialConfig || !confidentialToken ? (
              <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-400">
                Confidential transfers are currently configured for STRK on Starknet Sepolia.
              </div>
            ) : !isConfidentialInitialized ? (
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-cyan-300">
                      <VaultIcon />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white">Create your private STRK vault</p>
                      <p className="text-sm text-zinc-400">
                        Shield balances with Tongo using a separate private key from your Starknet wallet.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Setup needed
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => openConfidentialSetup('create')}
                    className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-4 text-left text-cyan-200 transition-all hover:bg-cyan-500/15"
                  >
                    <p className="text-sm font-semibold">Create Vault</p>
                    <p className="mt-1 text-[11px] text-cyan-200/70">
                      Generate a new Tongo key and store it on this device.
                    </p>
                  </button>
                  <button
                    onClick={() => openConfidentialSetup('import')}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-4 text-left text-zinc-200 transition-all hover:border-zinc-700 hover:bg-zinc-950"
                  >
                    <p className="text-sm font-semibold">Import Vault</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Restore an existing Tongo private key on this device.
                    </p>
                  </button>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-[11px] text-amber-100/80">
                  Your Tongo key is sensitive and separate from your Starknet wallet. Back it up before sending funds privately.
                </div>
              </div>
            ) : (
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-3 text-cyan-300">
                      <VaultIcon />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-white">{confidentialConfig.label}</p>
                        <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                          Vault ready
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Share your Tongo address for private incoming transfers. It is not your Starknet wallet address.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleForgetConfidentialVault}
                    className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
                  >
                    Forget key
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Active Balance</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {confidentialActiveBalance
                        ? `${confidentialActiveBalance.toFormatted(true)} ${confidentialToken.symbol}`
                        : '--'}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">Spendable private STRK</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Pending Balance</p>
                    <p className={`mt-2 text-lg font-semibold ${confidentialHasPending ? 'text-amber-300' : 'text-white'}`}>
                      {confidentialPendingBalance
                        ? `${confidentialPendingBalance.toFormatted(true)} ${confidentialToken.symbol}`
                        : '--'}
                    </p>
                    <p className="mt-1 text-[11px] text-zinc-500">Needs rollover before it becomes spendable</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Tongo Address</p>
                      <p className="mt-2 break-all font-mono text-xs text-zinc-300">{confidentialAddress}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(confidentialAddress || '')}
                      className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-cyan-500/30 hover:text-white"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(confidentialRecipientJson || '')}
                      className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white"
                    >
                      Copy Recipient JSON
                    </button>
                    {storedConfidentialKey && (
                      <button
                        onClick={() => copyToClipboard(storedConfidentialKey)}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white"
                      >
                        Copy Backup Key
                      </button>
                    )}
                  </div>
                </div>

                {confidentialHasPending && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100/80">
                    You have private incoming funds waiting. Run rollover to activate the pending balance before sending or withdrawing it.
                  </div>
                )}

                {confidentialStatus.type !== 'idle' && (
                  <div className={`rounded-2xl border p-4 text-xs font-medium ${
                    confidentialStatus.type === 'error'
                      ? 'border-red-500/20 bg-red-500/10 text-red-300'
                      : confidentialStatus.type === 'success'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                        : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200'
                  }`}>
                    {confidentialStatus.message}
                  </div>
                )}

                {confidentialError && confidentialStatus.type === 'idle' && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-300">
                    {confidentialError.message}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setConfidentialFundAmount('');
                      setConfidentialStatus({ type: 'idle' });
                      setShowConfidentialFundModal(true);
                    }}
                    className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-4 text-left text-cyan-100 transition-all hover:bg-cyan-500/15"
                  >
                    <p className="text-sm font-semibold">Fund Privately</p>
                    <p className="mt-1 text-[11px] text-cyan-100/70">Approve and move public STRK into Tongo.</p>
                  </button>
                  <button
                    onClick={() => {
                      setConfidentialSendAmount('');
                      setConfidentialSendRecipient('');
                      setConfidentialStatus({ type: 'idle' });
                      setShowConfidentialSendModal(true);
                    }}
                    disabled={!confidentialActiveBalance || confidentialActiveBalance.isZero()}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-4 text-left text-zinc-100 transition-all hover:border-zinc-700 hover:bg-zinc-950 disabled:opacity-50"
                  >
                    <p className="text-sm font-semibold">Private Send</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Send using a Tongo recipient, not a wallet address.</p>
                  </button>
                  <button
                    onClick={() => {
                      setConfidentialWithdrawAmount('');
                      setConfidentialWithdrawRecipient(wallet.address);
                      setConfidentialStatus({ type: 'idle' });
                      setShowConfidentialWithdrawModal(true);
                    }}
                    disabled={!confidentialActiveBalance || confidentialActiveBalance.isZero()}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950/80 px-4 py-4 text-left text-zinc-100 transition-all hover:border-zinc-700 hover:bg-zinc-950 disabled:opacity-50"
                  >
                    <p className="text-sm font-semibold">Withdraw Publicly</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Move private STRK back to a Starknet address.</p>
                  </button>
                  <button
                    onClick={handleConfidentialRollover}
                    disabled={isConfidentialLoading || !confidentialHasPending}
                    className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 text-left text-amber-100 transition-all hover:bg-amber-500/15 disabled:opacity-50"
                  >
                    <p className="text-sm font-semibold">Rollover Pending</p>
                    <p className="mt-1 text-[11px] text-amber-100/70">Activate received private funds for spending.</p>
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div>
                    <p className="text-xs font-semibold text-white">Emergency exit</p>
                    <p className="text-[11px] text-zinc-500">Withdraw all active private balance back to your public wallet.</p>
                  </div>
                  <button
                    onClick={handleConfidentialExit}
                    disabled={isConfidentialLoading || !confidentialActiveBalance || confidentialActiveBalance.isZero()}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/15 disabled:opacity-50"
                  >
                    Exit All
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Private Activity</p>
                    <p className="text-[10px] text-zinc-500">Recent Tongo actions</p>
                  </div>
                  {confidentialHistoryPreview.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-500">
                      No private activity yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {confidentialHistoryPreview.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-2 ${
                              item.type === 'fund' || item.type === 'transferIn' || item.type === 'rollover'
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : 'bg-cyan-500/10 text-cyan-300'
                            }`}>
                              {item.type === 'transferOut' || item.type === 'withdraw' || item.type === 'ragequit' ? <ArrowUpIcon /> : <ArrowDownIcon />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-white">
                                {formatConfidentialActivityType(item.type)}
                              </p>
                              <p className="text-[10px] font-mono text-zinc-500">
                                {item.counterparty ? truncateMiddle(item.counterparty, 8, 6) : item.txHash.slice(0, 10)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">
                              {item.amount.toFormatted(true)} {confidentialToken.symbol}
                            </p>
                            <p className="text-[10px] text-zinc-500">#{item.blockNumber}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 px-1">Recent Activity</h3>
        <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden">
          {dashboardError ? (
            <div className="p-6 text-center text-red-400 text-sm">{dashboardError.message}</div>
          ) : history.length === 0 ? (
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
          <div className="space-y-3">
            <button 
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-sm shadow-xl shadow-white/10 active:scale-98 transition-all hover:bg-zinc-200 disabled:opacity-50"
              disabled={!ready || isConnecting}
              onClick={handlePrivyConnect}
            >
              {isConnecting ? 'Setting up wallet...' : 'Social Login (Privy)'}
            </button>
            <button 
              className="w-full py-4 rounded-xl bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/10 active:scale-98 transition-all hover:bg-indigo-400 disabled:opacity-50"
              disabled={isConnecting}
              onClick={handleCartridgeConnect}
            >
              {isConnecting ? 'Opening Controller...' : 'Connect with Cartridge'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2 text-zinc-500 text-xs font-mono">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Connected: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
          </div>
        )}
      </footer>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Send Assets</h2>
              <button 
                onClick={() => { setShowSendModal(false); setStatus({ type: 'idle' }); }}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Token Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Select Token</label>
              <div className="grid grid-cols-2 gap-2">
                {assets.map((asset) => (
                  <button
                    key={asset.token.address}
                    onClick={() => setSelectedAssetAddress(asset.token.address)}
                    className={`p-3 rounded-2xl border transition-all text-left ${selectedAsset?.token.address === asset.token.address ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <p className="text-xs font-bold text-white">{asset.token.symbol}</p>
                    <p className="text-[10px] text-zinc-500">{asset.walletBalance.add(asset.lendingBalance).toFormatted(true)} available</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Recipient Address</label>
              <input 
                type="text" 
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Amount</label>
                {selectedAsset && (
                  <button 
                    onClick={() => setAmount(selectedAsset.walletBalance.add(selectedAsset.lendingBalance).toFormatted())}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    Max
                  </button>
                )}
              </div>
              <input 
                type="number" 
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-bold placeholder:text-zinc-800 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Status Message */}
            {status.type !== 'idle' && (
              <div className={`p-4 rounded-xl text-xs font-medium ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                {status.message}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={isSending || !selectedAsset || !recipient || !amount}
              className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-400 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-indigo-500/20"
            >
              {status.type === 'loading' ? 'Broadcasting...' : 'Confirm Send'}
            </button>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Receive Assets</h2>
              <button 
                onClick={() => setShowReceiveModal(false)}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-6">
              {/* QR Placeholder / Visual */}
              <div className="w-48 h-48 rounded-3xl bg-white p-4 flex items-center justify-center">
                 {/* In a real app, generate a QR here */}
                 <div className="w-full h-full bg-zinc-100 rounded-xl flex items-center justify-center border-2 border-dashed border-zinc-300">
                   <p className="text-[10px] text-zinc-400 font-bold uppercase text-center px-4">Starknet Sepolia QR</p>
                 </div>
              </div>

              <div className="w-full space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block text-center">Your Deposit Address</label>
                <div 
                  onClick={() => copyToClipboard(wallet?.address || '')}
                  className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono break-all text-center cursor-pointer hover:bg-zinc-800 transition-all active:scale-98 group relative"
                >
                  {wallet?.address}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CopyIcon />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-[10px] text-indigo-400 text-center font-medium leading-relaxed">
                Funds received at this address stay liquid until you explicitly supply them to Vesu or move them into your private Tongo vault.
              </p>
            </div>

            <button
                onClick={() => setShowReceiveModal(false)}
                className="w-full py-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white font-bold text-sm hover:bg-zinc-800 transition-all"
              >
                Done
              </button>
          </div>
        </div>
      )}

      {showSupplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Supply To Yield</h2>
              <button
                onClick={() => { setShowSupplyModal(false); setSupplyStatus({ type: 'idle' }); }}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Wallet Token</label>
              <div className="grid grid-cols-2 gap-2">
                {liquidAssets.map((asset) => (
                  <button
                    key={asset.token.address}
                    onClick={() => setSelectedSupplyAssetAddress(asset.token.address)}
                    className={`p-3 rounded-2xl border transition-all text-left ${selectedSupplyAsset?.token.address === asset.token.address ? 'bg-indigo-500/10 border-indigo-500' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <p className="text-xs font-bold text-white">{asset.token.symbol}</p>
                    <p className="text-[10px] text-zinc-500">{asset.walletBalance.toFormatted(true)} in wallet</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedSupplyAsset && (
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Available To Supply</p>
                <p className="text-lg font-semibold text-white">
                  {selectedSupplyAsset.walletBalance.toFormatted(true)} {selectedSupplyAsset.token.symbol}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Amount</label>
                {selectedSupplyAsset && (
                  <button
                    onClick={() => setSupplyAmount(selectedSupplyAsset.walletBalance.toFormatted())}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    Max
                  </button>
                )}
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={supplyAmount}
                onChange={(e) => setSupplyAmount(e.target.value)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-bold placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500 transition-all"
              />
              <p className="text-[11px] text-zinc-500">You approve and deposit this amount into Vesu explicitly.</p>
            </div>

            {supplyStatus.type !== 'idle' && (
              <div className={`p-4 rounded-xl text-xs font-medium ${supplyStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : supplyStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                {supplyStatus.message}
              </div>
            )}

            <button
              onClick={handleSupply}
              disabled={isLendingAction || !selectedSupplyAsset || !supplyAmount}
              className="w-full py-4 rounded-2xl bg-indigo-500 text-white font-bold text-sm hover:bg-indigo-400 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-indigo-500/20"
            >
              {supplyStatus.type === 'loading' ? 'Submitting Supply...' : 'Confirm Supply'}
            </button>
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Withdraw From Yield</h2>
              <button
                onClick={() => { setShowWithdrawModal(false); setWithdrawStatus({ type: 'idle' }); }}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Yield Token</label>
              <div className="grid grid-cols-2 gap-2">
                {suppliedAssets.map((asset) => (
                  <button
                    key={asset.token.address}
                    onClick={() => setSelectedYieldAssetAddress(asset.token.address)}
                    className={`p-3 rounded-2xl border transition-all text-left ${selectedYieldAsset?.token.address === asset.token.address ? 'bg-emerald-500/10 border-emerald-500' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
                  >
                    <p className="text-xs font-bold text-white">{asset.token.symbol}</p>
                    <p className="text-[10px] text-zinc-500">{asset.lendingBalance.toFormatted(true)} in Vesu</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedYieldAsset && (
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Available To Withdraw</p>
                <p className="text-lg font-semibold text-white">
                  {selectedYieldAsset.lendingBalance.toFormatted(true)} {selectedYieldAsset.token.symbol}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Amount</label>
                {selectedYieldAsset && (
                  <button
                    onClick={() => setWithdrawAmount(selectedYieldAsset.lendingBalance.toFormatted())}
                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    Max
                  </button>
                )}
              </div>
              <input
                type="number"
                placeholder="Leave blank to withdraw all"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-bold placeholder:text-zinc-700 focus:outline-none focus:border-emerald-500 transition-all"
              />
              <p className="text-[11px] text-zinc-500">Leave the amount empty to withdraw the full Vesu position.</p>
            </div>

            {withdrawStatus.type !== 'idle' && (
              <div className={`p-4 rounded-xl text-xs font-medium ${withdrawStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : withdrawStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {withdrawStatus.message}
              </div>
            )}

            <button
              onClick={handleWithdraw}
              disabled={isLendingAction || !selectedYieldAsset}
              className="w-full py-4 rounded-2xl bg-emerald-500 text-black font-bold text-sm hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-emerald-500/20"
            >
              {withdrawStatus.type === 'loading' ? 'Submitting Withdrawal...' : 'Confirm Withdraw'}
            </button>
          </div>
        </div>
      )}

      {showConfidentialSetupModal && confidentialConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Private STRK Vault</h2>
                <p className="text-sm text-zinc-500 mt-1">Set up your Sepolia Tongo key.</p>
              </div>
              <button
                onClick={() => {
                  setShowConfidentialSetupModal(false);
                  setConfidentialStatus({ type: 'idle' });
                }}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setConfidentialSetupMode('create');
                  setConfidentialPrivateKeyInput(generateConfidentialPrivateKey());
                  setConfidentialStatus({ type: 'idle' });
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  confidentialSetupMode === 'create'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400'
                }`}
              >
                <p className="text-sm font-semibold">Create</p>
                <p className="mt-1 text-[11px]">Generate a fresh Tongo key.</p>
              </button>
              <button
                onClick={() => {
                  setConfidentialSetupMode('import');
                  setConfidentialPrivateKeyInput('');
                  setConfidentialStatus({ type: 'idle' });
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition-all ${
                  confidentialSetupMode === 'import'
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200'
                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-400'
                }`}
              >
                <p className="text-sm font-semibold">Import</p>
                <p className="mt-1 text-[11px]">Restore an existing Tongo key.</p>
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Tongo Private Key
                </label>
                {confidentialSetupMode === 'create' && (
                  <button
                    onClick={() => setConfidentialPrivateKeyInput(generateConfidentialPrivateKey())}
                    className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:text-cyan-200"
                  >
                    Regenerate
                  </button>
                )}
              </div>
              <textarea
                value={confidentialPrivateKeyInput}
                onChange={(e) => setConfidentialPrivateKeyInput(e.target.value)}
                rows={4}
                spellCheck={false}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 resize-none"
                placeholder="0x..."
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] text-zinc-500">
                  Store this key safely. It is separate from your wallet and required to restore private balances.
                </p>
                <button
                  onClick={() => copyToClipboard(confidentialPrivateKeyInput)}
                  disabled={!confidentialPrivateKeyInput}
                  className="shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
            </div>

            {confidentialStatus.type !== 'idle' && (
              <div className={`p-4 rounded-xl text-xs font-medium ${
                confidentialStatus.type === 'error'
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : confidentialStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/20'
              }`}>
                {confidentialStatus.message}
              </div>
            )}

            <button
              onClick={handleConfidentialSetup}
              disabled={isConfidentialLoading || !confidentialPrivateKeyInput}
              className="w-full py-4 rounded-2xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-cyan-500/20"
            >
              {confidentialStatus.type === 'loading'
                ? 'Preparing Vault...'
                : confidentialSetupMode === 'create'
                  ? 'Create Private Vault'
                  : 'Import Private Vault'}
            </button>
          </div>
        </div>
      )}

      {showConfidentialFundModal && confidentialToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Fund Private Vault</h2>
                <p className="text-sm text-zinc-500 mt-1">Move public STRK into Tongo.</p>
              </div>
              <button
                onClick={() => {
                  setShowConfidentialFundModal(false);
                  setConfidentialStatus({ type: 'idle' });
                }}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Available Public Balance</p>
              <p className="text-lg font-semibold text-white">
                {assets.find((asset) => asset.token.address === confidentialToken.address)?.walletBalance.toFormatted(true) ?? '--'} {confidentialToken.symbol}
              </p>
              <p className="text-[11px] text-zinc-500">Approve is included automatically in the confidential fund flow.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Amount</label>
                <button
                  onClick={() => {
                    const asset = assets.find((entry) => entry.token.address === confidentialToken.address);
                    setConfidentialFundAmount(asset?.walletBalance.toFormatted() ?? '');
                  }}
                  className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200"
                >
                  Max
                </button>
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={confidentialFundAmount}
                onChange={(e) => setConfidentialFundAmount(e.target.value)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-bold placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {confidentialStatus.type !== 'idle' && (
              <div className={`p-4 rounded-xl text-xs font-medium ${
                confidentialStatus.type === 'error'
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : confidentialStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/20'
              }`}>
                {confidentialStatus.message}
              </div>
            )}

            <button
              onClick={handleConfidentialFund}
              disabled={isConfidentialLoading || !confidentialFundAmount}
              className="w-full py-4 rounded-2xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-cyan-500/20"
            >
              {confidentialStatus.type === 'loading' ? 'Funding...' : 'Confirm Private Funding'}
            </button>
          </div>
        </div>
      )}

      {showConfidentialSendModal && confidentialToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Private Send</h2>
                <p className="text-sm text-zinc-500 mt-1">Send to a Tongo vault, not a wallet address.</p>
              </div>
              <button
                onClick={() => {
                  setShowConfidentialSendModal(false);
                  setConfidentialStatus({ type: 'idle' });
                }}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Private Balance</p>
              <p className="text-lg font-semibold text-white">
                {confidentialActiveBalance?.toFormatted(true) ?? '--'} {confidentialToken.symbol}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Recipient</label>
              <textarea
                value={confidentialSendRecipient}
                onChange={(e) => setConfidentialSendRecipient(e.target.value)}
                rows={4}
                spellCheck={false}
                placeholder="Paste a Tongo address or { x, y } recipient JSON"
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 resize-none"
              />
              <p className="text-[11px] text-zinc-500">
                The docs require a confidential recipient public key. This form accepts a Tongo address or the raw recipient JSON.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Amount</label>
                <button
                  onClick={() => setConfidentialSendAmount(confidentialActiveBalance?.toFormatted() ?? '')}
                  className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200"
                >
                  Max
                </button>
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={confidentialSendAmount}
                onChange={(e) => setConfidentialSendAmount(e.target.value)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-bold placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {confidentialStatus.type !== 'idle' && (
              <div className={`p-4 rounded-xl text-xs font-medium ${
                confidentialStatus.type === 'error'
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : confidentialStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/20'
              }`}>
                {confidentialStatus.message}
              </div>
            )}

            <button
              onClick={handleConfidentialTransfer}
              disabled={isConfidentialLoading || !confidentialSendAmount || !confidentialSendRecipient}
              className="w-full py-4 rounded-2xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-cyan-500/20"
            >
              {confidentialStatus.type === 'loading' ? 'Sending Privately...' : 'Confirm Private Send'}
            </button>
          </div>
        </div>
      )}

      {showConfidentialWithdrawModal && confidentialToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Withdraw Private STRK</h2>
                <p className="text-sm text-zinc-500 mt-1">Move private STRK back to a public address.</p>
              </div>
              <button
                onClick={() => {
                  setShowConfidentialWithdrawModal(false);
                  setConfidentialStatus({ type: 'idle' });
                }}
                className="p-1 text-zinc-500 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Active Private Balance</p>
              <p className="text-lg font-semibold text-white">
                {confidentialActiveBalance?.toFormatted(true) ?? '--'} {confidentialToken.symbol}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Destination</label>
              <input
                type="text"
                value={confidentialWithdrawRecipient}
                onChange={(e) => setConfidentialWithdrawRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-sm font-mono placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 transition-all"
              />
              <p className="text-[11px] text-zinc-500">Defaults to your connected wallet address.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Amount</label>
                <button
                  onClick={() => setConfidentialWithdrawAmount(confidentialActiveBalance?.toFormatted() ?? '')}
                  className="text-[10px] font-bold text-cyan-300 hover:text-cyan-200"
                >
                  Max
                </button>
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={confidentialWithdrawAmount}
                onChange={(e) => setConfidentialWithdrawAmount(e.target.value)}
                className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white text-2xl font-bold placeholder:text-zinc-700 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {confidentialStatus.type !== 'idle' && (
              <div className={`p-4 rounded-xl text-xs font-medium ${
                confidentialStatus.type === 'error'
                  ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                  : confidentialStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-cyan-500/10 text-cyan-200 border border-cyan-500/20'
              }`}>
                {confidentialStatus.message}
              </div>
            )}

            <button
              onClick={handleConfidentialWithdraw}
              disabled={isConfidentialLoading || !confidentialWithdrawAmount}
              className="w-full py-4 rounded-2xl bg-cyan-500 text-black font-bold text-sm hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-cyan-500/20"
            >
              {confidentialStatus.type === 'loading' ? 'Withdrawing...' : 'Confirm Private Withdraw'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function formatConfidentialActivityType(type: string): string {
  switch (type) {
    case 'fund':
      return 'Funded';
    case 'withdraw':
      return 'Withdrew';
    case 'ragequit':
      return 'Exited';
    case 'rollover':
      return 'Rolled Over';
    case 'transferIn':
      return 'Received';
    case 'transferOut':
      return 'Sent';
    default:
      return type;
  }
}

function truncateMiddle(value: string, start: number, end: number): string {
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
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

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="15" r="1.5" />
    </svg>
  );
}
