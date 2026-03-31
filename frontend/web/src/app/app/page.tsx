"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useStarkZap } from "@/providers/StarkZapProvider";
import { useOtterpayNetwork } from "@/providers/OtterpayNetworkProvider";
import { useDashboard } from "@/hooks/useDashboard";
import { useAutoYield } from "@/hooks/useAutoYield";
import { useTokens } from "@/hooks/useTokens";
import { useLending } from "@/hooks/useLending";
import { fromAddress } from "starkzap";
import {
    generateConfidentialPrivateKey,
    getConfidentialTokenConfig,
    isValidConfidentialPrivateKey,
    parseConfidentialRecipientInput,
    useConfidential,
} from "@/hooks/useConfidential";
import {
    getOtterpayNetworkConfig,
    OTTERPAY_NETWORK_ORDER,
} from "@/lib/otterpayNetworks";

export default function Dashboard() {
    const {
        network,
        setNetwork,
        networkConfig: activeNetworkConfig,
    } = useOtterpayNetwork();
    const {
        wallet,
        connectWithCartridge,
        isLoading: isConnecting,
    } = useStarkZap();
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
    const { send, loading: isSending } = useTokens();
    const {
        supply,
        withdraw,
        withdrawMax,
        loading: isLendingAction,
    } = useLending();
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
    const suppliedAssets = assets.filter(
        (asset) => !asset.lendingBalance.isZero(),
    );
    const liquidAssets = assets.filter(
        (asset) => !asset.walletBalance.isZero(),
    );
    const confidentialChainLiteral = wallet?.getChainId().toLiteral() ?? null;
    const confidentialTokens = useMemo(
        () =>
            supportedTokens.filter((token) =>
                getConfidentialTokenConfig(
                    confidentialChainLiteral || "",
                    token,
                ),
            ),
        [supportedTokens, confidentialChainLiteral],
    );
    const autoYieldStorageKey = useMemo(() => {
        if (!wallet) return null;
        return `starkpay:auto-yield:${wallet.address.toLowerCase()}`;
    }, [wallet]);
    const confidentialHasPending =
        !!confidentialPendingBalance && !confidentialPendingBalance.isZero();
    const confidentialHistoryPreview = confidentialActivity.slice(0, 4);

    // Modal State
    const [showSendModal, setShowSendModal] = useState(false);
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [showSupplyModal, setShowSupplyModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showNetworkModal, setShowNetworkModal] = useState(false);
    const [showConfidentialSetupModal, setShowConfidentialSetupModal] =
        useState(false);
    const [showConfidentialFundModal, setShowConfidentialFundModal] =
        useState(false);
    const [showConfidentialSendModal, setShowConfidentialSendModal] =
        useState(false);
    const [showConfidentialWithdrawModal, setShowConfidentialWithdrawModal] =
        useState(false);

    // Transaction State
    const [selectedAssetAddress, setSelectedAssetAddress] = useState<
        string | null
    >(null);
    const [selectedSupplyAssetAddress, setSelectedSupplyAssetAddress] =
        useState<string | null>(null);
    const [selectedYieldAssetAddress, setSelectedYieldAssetAddress] = useState<
        string | null
    >(null);
    const [
        selectedConfidentialAssetAddress,
        setSelectedConfidentialAssetAddress,
    ] = useState<string | null>(null);
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState<{
        type: "idle" | "loading" | "success" | "error";
        message?: string;
    }>({ type: "idle" });
    const [supplyAmount, setSupplyAmount] = useState("");
    const [supplyStatus, setSupplyStatus] = useState<{
        type: "idle" | "loading" | "success" | "error";
        message?: string;
    }>({ type: "idle" });
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawStatus, setWithdrawStatus] = useState<{
        type: "idle" | "loading" | "success" | "error";
        message?: string;
    }>({ type: "idle" });
    const [autoYieldOverrides, setAutoYieldOverrides] = useState<
        Record<string, boolean>
    >({});
    const [confidentialSetupMode, setConfidentialSetupMode] = useState<
        "create" | "import"
    >("create");
    const [confidentialPrivateKeyInput, setConfidentialPrivateKeyInput] =
        useState("");
    const [confidentialFundAmount, setConfidentialFundAmount] = useState("");
    const [confidentialSendAmount, setConfidentialSendAmount] = useState("");
    const [confidentialSendRecipient, setConfidentialSendRecipient] =
        useState("");
    const [confidentialWithdrawAmount, setConfidentialWithdrawAmount] =
        useState("");
    const [confidentialWithdrawRecipient, setConfidentialWithdrawRecipient] =
        useState("");
    const [confidentialStatus, setConfidentialStatus] = useState<{
        type: "idle" | "loading" | "success" | "error";
        message?: string;
    }>({ type: "idle" });
    const [areBalancesVisible, setAreBalancesVisible] = useState(true);
    const [activeTab, setActiveTab] = useState<
        "home" | "yield" | "private" | "activity"
    >("home");
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const confidentialToken = useMemo(
        () =>
            confidentialTokens.find(
                (token) => token.address === selectedConfidentialAssetAddress,
            ) ??
            confidentialTokens[0] ??
            null,
        [confidentialTokens, selectedConfidentialAssetAddress],
    );
    const confidentialConfig = useMemo(
        () =>
            confidentialToken && confidentialChainLiteral
                ? getConfidentialTokenConfig(
                      confidentialChainLiteral,
                      confidentialToken,
                  )
                : null,
        [confidentialChainLiteral, confidentialToken],
    );
    const confidentialStorageKey = useMemo(() => {
        if (!wallet || !confidentialConfig) return null;
        return `starkpay:confidential:${wallet.address.toLowerCase()}:${confidentialConfig.contractAddress.toLowerCase()}`;
    }, [wallet, confidentialConfig]);
    const selectedAsset =
        assets.find((asset) => asset.token.address === selectedAssetAddress) ??
        assets[0] ??
        null;
    const selectedSupplyAsset =
        liquidAssets.find(
            (asset) => asset.token.address === selectedSupplyAssetAddress,
        ) ??
        liquidAssets[0] ??
        null;
    const selectedYieldAsset =
        suppliedAssets.find(
            (asset) => asset.token.address === selectedYieldAssetAddress,
        ) ??
        suppliedAssets[0] ??
        null;
    const storedConfidentialKey =
        confidentialStorageKey && typeof window !== "undefined"
            ? window.localStorage.getItem(confidentialStorageKey)
            : null;
    const autoYieldEnabled =
        autoYieldStorageKey != null
            ? (autoYieldOverrides[autoYieldStorageKey] ??
              readStoredAutoYieldPreference(autoYieldStorageKey))
            : false;

    const {
        isDepositing: isAutoYielding,
        lastSubmittedDeposit,
        lastConfirmedDeposit,
        lastDepositError,
    } = useAutoYield({
        wallet,
        supportedTokens,
        enabled: autoYieldEnabled,
        autoSweepIdleBalances: autoYieldEnabled,
        onDepositSuccess: (token, amount) => {
            console.log(
                `Successfully auto-deposited ${amount.toFormatted()} ${token.symbol}`,
            );
            refresh();
        },
    });

    const yieldStatusLabel = isAutoYielding
        ? "Supplying to Vesu"
        : autoYieldEnabled
          ? "Watching incoming funds"
          : totalSuppliedUsd > 0
            ? "Yield active in Vesu"
            : "Auto-yield is off";

    const yieldStatusDetail = lastDepositError
        ? `Last auto-supply failed: ${lastDepositError}`
        : lastConfirmedDeposit
          ? `Confirmed: ${lastConfirmedDeposit.amountLabel} ${lastConfirmedDeposit.tokenSymbol} at ${new Date(lastConfirmedDeposit.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : lastSubmittedDeposit
            ? `Pending confirmation: ${lastSubmittedDeposit.amountLabel} ${lastSubmittedDeposit.tokenSymbol}`
            : autoYieldEnabled
              ? "New incoming funds and eligible idle balances sweep into Vesu automatically while keeping a small fee reserve in the wallet."
              : "Keep this off for manual supply, or turn it on to sweep incoming funds into Vesu automatically.";

    const autoYieldModeLabel = autoYieldEnabled ? "ON" : "OFF";

    useEffect(() => {
        if (!wallet) {
            clearConfidential();
        }
    }, [wallet, clearConfidential]);

    useEffect(() => {
        if (
            !wallet ||
            !confidentialConfig ||
            !confidentialStorageKey ||
            isConfidentialInitialized
        ) {
            return;
        }

        const storedKey = window.localStorage.getItem(confidentialStorageKey);
        if (!storedKey) {
            return;
        }

        try {
            initConfidential(storedKey, confidentialConfig.contractAddress);
        } catch (err) {
            console.error("Failed to restore confidential vault:", err);
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
            console.error("Failed to refresh confidential vault:", err);
        });
    }, [isConfidentialInitialized, confidentialToken, refreshConfidential]);

    useEffect(() => {
        if (!isConfidentialInitialized || !confidentialToken) return;

        const interval = window.setInterval(() => {
            refreshConfidential(confidentialToken).catch((err) => {
                console.error("Failed to refresh confidential vault:", err);
            });
        }, 15000);

        return () => window.clearInterval(interval);
    }, [isConfidentialInitialized, confidentialToken, refreshConfidential]);

    const handleCartridgeConnect = async () => {
        try {
            await connectWithCartridge();
        } catch (err) {
            console.error("Cartridge connection failed:", err);
        }
    };

    const handleRefreshAll = async () => {
        await refresh();

        if (isConfidentialInitialized && confidentialToken) {
            await refreshConfidential(confidentialToken).catch((err) => {
                console.error("Failed to refresh confidential vault:", err);
            });
        }
    };

    const handleNetworkSwitch = (nextNetwork: typeof network) => {
        setShowNetworkModal(false);
        if (nextNetwork === network) return;

        clearConfidential();
        setShowSendModal(false);
        setShowReceiveModal(false);
        setShowSupplyModal(false);
        setShowWithdrawModal(false);
        setShowConfidentialSetupModal(false);
        setShowConfidentialFundModal(false);
        setShowConfidentialSendModal(false);
        setShowConfidentialWithdrawModal(false);
        setStatus({ type: "idle" });
        setSupplyStatus({ type: "idle" });
        setWithdrawStatus({ type: "idle" });
        setConfidentialStatus({ type: "idle" });
        setAmount("");
        setRecipient("");
        setSupplyAmount("");
        setWithdrawAmount("");
        setConfidentialFundAmount("");
        setConfidentialSendAmount("");
        setConfidentialSendRecipient("");
        setConfidentialWithdrawAmount("");
        setConfidentialWithdrawRecipient("");
        setSelectedConfidentialAssetAddress(null);
        setNetwork(nextNetwork);
    };

    useEffect(() => {
        if (!showNetworkModal) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setShowNetworkModal(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showNetworkModal]);

    const handleSelectConfidentialToken = (tokenAddress: string) => {
        if (tokenAddress === selectedConfidentialAssetAddress) return;

        clearConfidential();
        setConfidentialStatus({ type: "idle" });
        setSelectedConfidentialAssetAddress(tokenAddress);
    };

    const openConfidentialSetup = (mode: "create" | "import") => {
        setConfidentialSetupMode(mode);
        setConfidentialPrivateKeyInput(
            mode === "create" ? generateConfidentialPrivateKey() : "",
        );
        setConfidentialStatus({ type: "idle" });
        setShowConfidentialSetupModal(true);
    };

    const handleSend = async () => {
        if (!selectedAsset || !recipient || !amount) return;
        setStatus({ type: "loading", message: "Initiating transfer..." });
        try {
            const tx = await send(
                selectedAsset.token,
                fromAddress(recipient),
                amount,
            );
            setStatus({
                type: "success",
                message: `Transfer broadcasted: ${tx.hash.slice(0, 10)}...`,
            });
            setTimeout(() => {
                setShowSendModal(false);
                setStatus({ type: "idle" });
                setAmount("");
                setRecipient("");
                refresh();
            }, 3000);
        } catch (err: unknown) {
            setStatus({
                type: "error",
                message: err instanceof Error ? err.message : "Transfer failed",
            });
        }
    };

    const handleWithdraw = async () => {
        if (!selectedYieldAsset) return;
        setWithdrawStatus({
            type: "loading",
            message: "Withdrawing from Vesu...",
        });
        try {
            const tx = withdrawAmount.trim()
                ? await withdraw(selectedYieldAsset.token, withdrawAmount)
                : await withdrawMax(selectedYieldAsset.token);

            setWithdrawStatus({
                type: "success",
                message: `Withdrawal broadcasted: ${tx.hash.slice(0, 10)}...`,
            });
            setTimeout(() => {
                setShowWithdrawModal(false);
                setWithdrawStatus({ type: "idle" });
                setWithdrawAmount("");
                refresh();
            }, 3000);
        } catch (err: unknown) {
            setWithdrawStatus({
                type: "error",
                message: err instanceof Error ? err.message : "Withdraw failed",
            });
        }
    };

    const handleConfidentialSetup = async () => {
        if (!confidentialConfig) return;

        const nextPrivateKey = confidentialPrivateKeyInput.trim();
        if (!isValidConfidentialPrivateKey(nextPrivateKey)) {
            setConfidentialStatus({
                type: "error",
                message: "Enter a valid Tongo private key before continuing.",
            });
            return;
        }

        setConfidentialStatus({
            type: "loading",
            message: "Setting up your private vault...",
        });
        try {
            initConfidential(
                nextPrivateKey,
                confidentialConfig.contractAddress,
            );
            if (confidentialStorageKey) {
                window.localStorage.setItem(
                    confidentialStorageKey,
                    nextPrivateKey,
                );
            }
            setConfidentialStatus({
                type: "success",
                message:
                    confidentialSetupMode === "create"
                        ? "Private vault created. Back up this Tongo key safely."
                        : "Private vault restored on this device.",
            });
            setTimeout(() => {
                setShowConfidentialSetupModal(false);
                setConfidentialStatus({ type: "idle" });
            }, 1200);
        } catch (err: unknown) {
            setConfidentialStatus({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to initialize private vault",
            });
        }
    };

    const handleConfidentialFund = async () => {
        if (!confidentialToken || !confidentialFundAmount) return;

        setConfidentialStatus({
            type: "loading",
            message: "Funding your private vault...",
        });
        try {
            const tx = await fundConfidential(
                confidentialToken,
                confidentialFundAmount,
            );
            await tx.wait();
            await refreshConfidential(confidentialToken);
            setConfidentialStatus({
                type: "success",
                message: `Private vault funded: ${tx.hash.slice(0, 10)}...`,
            });
            setTimeout(() => {
                setShowConfidentialFundModal(false);
                setConfidentialFundAmount("");
                setConfidentialStatus({ type: "idle" });
            }, 1200);
        } catch (err: unknown) {
            setConfidentialStatus({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Confidential funding failed",
            });
        }
    };

    const handleConfidentialTransfer = async () => {
        if (
            !confidentialToken ||
            !confidentialSendAmount ||
            !confidentialSendRecipient
        )
            return;

        setConfidentialStatus({
            type: "loading",
            message: "Sending privately...",
        });
        try {
            const recipientId = parseConfidentialRecipientInput(
                confidentialSendRecipient,
            );
            const tx = await transferConfidential(
                confidentialToken,
                confidentialSendAmount,
                recipientId,
            );
            await tx.wait();
            await refreshConfidential(confidentialToken);
            setConfidentialStatus({
                type: "success",
                message: `Private transfer confirmed: ${tx.hash.slice(0, 10)}...`,
            });
            setTimeout(() => {
                setShowConfidentialSendModal(false);
                setConfidentialSendAmount("");
                setConfidentialSendRecipient("");
                setConfidentialStatus({ type: "idle" });
            }, 1200);
        } catch (err: unknown) {
            setConfidentialStatus({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Confidential transfer failed",
            });
        }
    };

    const handleConfidentialWithdraw = async () => {
        if (!confidentialToken || !confidentialWithdrawAmount) return;

        setConfidentialStatus({
            type: "loading",
            message: "Withdrawing from private vault...",
        });
        try {
            const tx = await withdrawConfidential(
                confidentialToken,
                confidentialWithdrawAmount,
                confidentialWithdrawRecipient
                    ? fromAddress(confidentialWithdrawRecipient)
                    : wallet?.address,
            );
            await tx.wait();
            await refreshConfidential(confidentialToken);
            setConfidentialStatus({
                type: "success",
                message: `Private withdrawal confirmed: ${tx.hash.slice(0, 10)}...`,
            });
            setTimeout(() => {
                setShowConfidentialWithdrawModal(false);
                setConfidentialWithdrawAmount("");
                setConfidentialStatus({ type: "idle" });
            }, 1200);
        } catch (err: unknown) {
            setConfidentialStatus({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Confidential withdraw failed",
            });
        }
    };

    const handleConfidentialRollover = async () => {
        if (!confidentialToken) return;

        setConfidentialStatus({
            type: "loading",
            message: "Activating pending private balance...",
        });
        try {
            const tx = await rolloverConfidential();
            await tx.wait();
            await refreshConfidential(confidentialToken);
            setConfidentialStatus({
                type: "success",
                message: `Pending balance activated: ${tx.hash.slice(0, 10)}...`,
            });
        } catch (err: unknown) {
            setConfidentialStatus({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to rollover pending balance",
            });
        }
    };

    const handleConfidentialExit = async () => {
        if (!wallet || !confidentialToken) return;

        const confirmed = window.confirm(
            "Exit all active private balance back to your public wallet? Pending balance will still require rollover first.",
        );
        if (!confirmed) return;

        setConfidentialStatus({
            type: "loading",
            message: "Exiting private vault...",
        });
        try {
            const tx = await exitConfidential(wallet.address);
            await tx.wait();
            await refreshConfidential(confidentialToken);
            setConfidentialStatus({
                type: "success",
                message: `Private vault exited: ${tx.hash.slice(0, 10)}...`,
            });
        } catch (err: unknown) {
            setConfidentialStatus({
                type: "error",
                message:
                    err instanceof Error
                        ? err.message
                        : "Failed to exit private vault",
            });
        }
    };

    const handleForgetConfidentialVault = () => {
        if (!confidentialStorageKey) return;

        const confirmed = window.confirm(
            "Forget the private vault key on this device? You will need the backed-up Tongo key to restore access later.",
        );
        if (!confirmed) return;

        window.localStorage.removeItem(confidentialStorageKey);
        clearConfidential();
        setConfidentialStatus({ type: "idle" });
    };

    const handleSupply = async () => {
        if (!selectedSupplyAsset || !supplyAmount) return;
        setSupplyStatus({ type: "loading", message: "Supplying to Vesu..." });
        try {
            const tx = await supply(selectedSupplyAsset.token, supplyAmount);
            setSupplyStatus({
                type: "success",
                message: `Supply broadcasted: ${tx.hash.slice(0, 10)}...`,
            });
            setTimeout(() => {
                setShowSupplyModal(false);
                setSupplyStatus({ type: "idle" });
                setSupplyAmount("");
                refresh();
            }, 3000);
        } catch (err: unknown) {
            setSupplyStatus({
                type: "error",
                message: err instanceof Error ? err.message : "Supply failed",
            });
        }
    };

    const copyToClipboard = (text: string, key?: string) => {
        navigator.clipboard.writeText(text);
        const feedbackKey = key ?? text;
        setCopiedKey(feedbackKey);
        setTimeout(() => setCopiedKey(null), 1500);
    };

    return (
        <div className="dashboard-page min-h-screen flex" style={{ backgroundColor: "#F5EFE4" }}>

            {/* ── Desktop Sidebar ── */}
            <aside
                className="hidden md:flex flex-col w-60 min-h-screen p-6 gap-6 sticky top-0 h-screen overflow-y-auto shrink-0"
                style={{
                    backgroundColor: "#0D1B4B",
                    borderRight: "4px solid rgba(13,27,75,0.15)",
                }}
            >
                {/* Logo */}
                <div className="pb-4" style={{ borderBottom: "2px solid rgba(74,158,181,0.15)" }}>
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <h1
                            className="text-3xl font-black tracking-tight"
                            style={{ color: "#C8960A", fontFamily: "'Fredoka', sans-serif" }}
                        >
                            OtterPay
                        </h1>
                    </Link>
                    <p className="text-sm font-bold mt-0.5" style={{ color: "#FDFAF4" }}>
                        Yield-bearing payments
                    </p>
                </div>

                {/* Vertical Nav */}
                <nav className="flex flex-col gap-1 flex-1">
                    {(
                        [
                            { id: "home", label: "Home" },
                            { id: "yield", label: "Yield" },
                            { id: "private", label: "Private" },
                            { id: "activity", label: "Activity" },
                        ] as const
                    ).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="w-full text-left px-4 py-3.5 text-base font-black uppercase tracking-wider transition-all"
                            style={{
                                backgroundColor:
                                    activeTab === tab.id ? "#C8960A" : "transparent",
                                color:
                                    activeTab === tab.id ? "#0D1B4B" : "#FDFAF4",
                                borderTopWidth: "0",
                                borderRightWidth: "0",
                                borderBottomWidth: "0",
                                borderLeftWidth: "4px",
                                borderLeftStyle: "solid",
                                borderLeftColor:
                                    activeTab === tab.id ? "#C8960A" : "transparent",
                                boxShadow:
                                    activeTab === tab.id
                                        ? "4px 4px 0px rgba(13,27,75,0.25)"
                                        : "none",
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* Sidebar Wallet Status */}
                <div
                    className="space-y-3 pt-4"
                    style={{ borderTop: "2px solid rgba(74,158,181,0.15)" }}
                >
                    {isAutoYielding && (
                        <div
                            className="flex items-center space-x-1.5 px-3 py-2"
                            style={{
                                backgroundColor: "#1B7A4E1A",
                                borderColor: "#1B7A4E",
                                borderWidth: "2px",
                            }}
                        >
                            <div
                                className="h-2 w-2 rounded-full animate-pulse"
                                style={{ backgroundColor: "#1B7A4E" }}
                            />
                            <span
                                className="text-[10px] font-black uppercase tracking-tighter"
                                style={{ color: "#1B7A4E" }}
                            >
                                Yielding...
                            </span>
                        </div>
                    )}
                    {!wallet ? (
                        <button
                            className="w-full py-3 font-black text-xs transition-all active:scale-95"
                            style={{
                                backgroundColor: "transparent",
                                color: "#FDFAF4",
                                borderColor: "#4A9EB5",
                                borderWidth: "3px",
                                boxShadow: "4px 4px 0px rgba(13,27,75,0.3)",
                            }}
                            disabled={isConnecting}
                            onClick={handleCartridgeConnect}
                        >
                            {isConnecting ? "Opening..." : "Connect Cartridge"}
                        </button>
                    ) : (
                        <div
                            className="flex items-center space-x-2 text-xs font-black"
                            style={{ color: "#FDFAF4" }}
                        >
                            <div
                                className="h-2 w-2 rounded-full animate-pulse shrink-0"
                                style={{ backgroundColor: "#1B7A4E" }}
                            />
                            <span className="truncate font-mono">
                                {wallet.address.slice(0, 8)}...
                                {wallet.address.slice(-4)}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={handleRefreshAll}
                        disabled={loading}
                        className={`p-2 transition-all font-bold ${loading ? "animate-spin" : ""}`}
                        style={{
                            backgroundColor: "#C8960A",
                            borderColor: "#0D1B4B",
                            borderWidth: "3px",
                            color: "#0D1B4B",
                            boxShadow: "4px 4px 0px rgba(13,27,75,0.3)",
                        }}
                    >
                        <RefreshIcon />
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main
                className="flex-1 flex flex-col p-5 md:p-8 w-full gap-5 max-w-2xl mx-auto"
                style={{ backgroundColor: "#F5EFE4" }}
            >
            <button
                type="button"
                onClick={() => setShowNetworkModal(true)}
                aria-haspopup="dialog"
                aria-expanded={showNetworkModal}
                className="fixed top-4 right-4 md:top-6 md:right-6 z-40 w-[7rem] p-2.5 text-left"
                style={{
                    backgroundColor: showNetworkModal ? "#C8960A" : "#0D1B4B",
                    color: showNetworkModal ? "#0D1B4B" : "#FDFAF4",
                    borderColor: "#C8960A",
                    borderWidth: "4px",
                    boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.28)",
                }}
            >
                <span
                    className="block text-[9px] font-black uppercase tracking-[0.35em]"
                    style={{
                        color: showNetworkModal
                            ? "#0D1B4B"
                            : "#C8960A",
                    }}
                >
                    Network
                </span>
                <span className="mt-1 block text-sm font-black">
                    {activeNetworkConfig.shortLabel}
                </span>
                <span
                    className="mt-1 block text-[10px] font-bold leading-tight"
                    style={{
                        color:
                            showNetworkModal
                                ? "#0D1B4B"
                                : activeNetworkConfig.deprecated
                                  ? "#C8960A"
                                  : "#4A9EB5",
                    }}
                >
                    Tap to switch
                </span>
            </button>

            {/* Header - Mobile Only */}
            <header className="flex md:hidden justify-between items-center pr-36">
                <Link href="/" className="hover:opacity-80 transition-opacity">
                    <h1
                        className="text-4xl font-black tracking-tighter"
                        style={{
                            color: "#0D1B4B",
                            fontFamily: "'Fredoka', sans-serif",
                        }}
                    >
                        OtterPay
                    </h1>
                    <p
                        className="text-sm font-bold"
                        style={{ color: "#0D1B4B" }}
                    >
                        Yield-bearing payments
                    </p>
                </Link>
                <div className="flex items-center space-x-2">
                    {isAutoYielding && (
                        <div
                            className="flex items-center space-x-1.5 px-3 py-2 rounded border-4"
                            style={{
                                backgroundColor: "#4A9EB51A",
                                borderColor: "#1B7A4E",
                            }}
                        >
                            <div
                                className="h-2 w-2 rounded-full animate-pulse"
                                style={{ backgroundColor: "#1B7A4E" }}
                            />
                            <span
                                className="text-[10px] font-black uppercase tracking-tighter"
                                style={{ color: "#0D1B4B" }}
                            >
                                Yielding...
                            </span>
                        </div>
                    )}
                    <button
                        onClick={handleRefreshAll}
                        disabled={loading}
                        className={`p-2 rounded transition-all font-bold ${loading ? "animate-spin" : ""}`}
                        style={{
                            backgroundColor: "#C8960A",
                            borderColor: "#0D1B4B",
                            borderWidth: "4px",
                            color: "#0D1B4B",
                            boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <RefreshIcon />
                    </button>
                </div>
            </header>

            {showNetworkModal && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setShowNetworkModal(false)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Choose network"
                        className="w-full max-w-lg p-6 space-y-5"
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            backgroundColor: "#FDFAF4",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <p
                                    className="text-[10px] font-black uppercase tracking-[0.35em]"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Switch Network
                                </p>
                                <div className="space-y-1">
                                    <h2
                                        className="text-2xl font-black"
                                        style={{ color: "#0D1B4B" }}
                                    >
                                        Choose your environment
                                    </h2>
                                    <p
                                        className="text-sm font-bold leading-snug"
                                        style={{ color: "#0D1B4B" }}
                                    >
                                        Mainnet is for live balances and real
                                        payments. Sepolia stays available for
                                        testing while it lasts.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowNetworkModal(false)}
                                className="p-1 hover:opacity-70 font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div
                            className="overflow-hidden"
                            style={{
                                backgroundColor: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "3px",
                            }}
                        >
                            <div className="network-ticker-track py-2 text-[11px] font-black uppercase tracking-[0.25em] whitespace-nowrap">
                                {[0, 1].map((copyIndex) => (
                                    <React.Fragment key={copyIndex}>
                                        <span
                                            className="px-6"
                                            style={{ color: "#C8960A" }}
                                        >
                                            Sepolia will be deprecated soon.
                                        </span>
                                        <span
                                            className="px-6"
                                            style={{ color: "#FDFAF4" }}
                                        >
                                            Treat Sepolia as testing-only and
                                            switch to Mainnet for the supported
                                            live experience.
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {OTTERPAY_NETWORK_ORDER.map((networkOption) => {
                                const optionConfig =
                                    getOtterpayNetworkConfig(networkOption);
                                const isSelected =
                                    networkOption === network;
                                const optionVaultCount =
                                    optionConfig.tokens.filter(
                                        (token) =>
                                            token.tongoContractAddress != null,
                                    ).length;

                                return (
                                    <button
                                        key={networkOption}
                                        type="button"
                                        onClick={() =>
                                            handleNetworkSwitch(networkOption)
                                        }
                                        className="p-4 text-left transition-all"
                                        style={{
                                            backgroundColor: isSelected
                                                ? "#C8960A"
                                                : "#4A9EB51A",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "4px",
                                            boxShadow: isSelected
                                                ? "8px 8px 0px rgba(13, 27, 75, 0.25)"
                                                : "4px 4px 0px rgba(13, 27, 75, 0.15)",
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                                                    Starknet
                                                </p>
                                                <h3 className="text-xl font-black">
                                                    {optionConfig.shortLabel}
                                                </h3>
                                            </div>
                                            <span
                                                className="px-2 py-1 text-[10px] font-black uppercase tracking-wider"
                                                style={{
                                                    backgroundColor:
                                                        optionConfig.deprecated
                                                            ? "#FDFAF4"
                                                            : "#1B7A4E",
                                                    color: "#0D1B4B",
                                                    borderColor: "#0D1B4B",
                                                    borderWidth: "2px",
                                                }}
                                            >
                                                {isSelected
                                                    ? "Selected"
                                                    : optionConfig.deprecated
                                                      ? "Deprecated Soon"
                                                      : "Recommended"}
                                            </span>
                                        </div>

                                        <p className="mt-3 text-sm font-bold leading-snug">
                                            {optionConfig.tagline}
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span
                                                className="px-2 py-1 text-[10px] font-black uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: "#FDFAF4",
                                                    color: "#0D1B4B",
                                                    borderColor: "#0D1B4B",
                                                    borderWidth: "2px",
                                                }}
                                            >
                                                {optionConfig.tokens.length} presets
                                            </span>
                                            <span
                                                className="px-2 py-1 text-[10px] font-black uppercase tracking-wider"
                                                style={{
                                                    backgroundColor: "#FDFAF4",
                                                    color: "#0D1B4B",
                                                    borderColor: "#0D1B4B",
                                                    borderWidth: "2px",
                                                }}
                                            >
                                                {optionVaultCount} vaults
                                            </span>
                                        </div>

                                        <p className="mt-3 text-[11px] font-bold leading-snug">
                                            {optionConfig.deprecated
                                                ? "Testing only for demos and QA. This network is being phased out soon."
                                                : "Use this for live payments, live balances, and the production yield flow."}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        <p
                            className="text-[11px] font-black uppercase tracking-[0.2em]"
                            style={{ color: "#0D1B4B" }}
                        >
                            Current network: {activeNetworkConfig.label}
                        </p>
                    </div>
                </div>
            )}

            {/* Balance Card */}
            <section
                className="relative overflow-hidden p-6 md:p-7 shadow-xl"
                style={{
                    backgroundColor: "#C8960A",
                    borderColor: "#0D1B4B",
                    borderWidth: "5px",
                    boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                }}
            >
                <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p
                                className="text-sm font-black uppercase tracking-widest"
                                style={{ color: "#0D1B4B" }}
                            >
                                Total Balance
                            </p>
                            <p
                                className="mt-1 text-sm font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                Tap the eye to hide wallet amounts on this
                                screen.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() =>
                                setAreBalancesVisible((current) => !current)
                            }
                            aria-pressed={!areBalancesVisible}
                            aria-label={
                                areBalancesVisible
                                    ? "Hide balances"
                                    : "Show balances"
                            }
                            className="shrink-0 p-2"
                            style={{
                                backgroundColor: "#FDFAF4",
                                color: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "3px",
                                boxShadow:
                                    "4px 4px 0px rgba(13, 27, 75, 0.18)",
                            }}
                        >
                            {areBalancesVisible ? (
                                <EyeOffIcon />
                            ) : (
                                <EyeIcon />
                            )}
                        </button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                        <span
                            className="text-6xl font-black"
                            style={{ color: "#0D1B4B" }}
                        >
                            {formatMaskedUsd(totalBalanceUsd, areBalancesVisible)}
                        </span>
                        <span
                            className="text-lg font-black cursor-default"
                            style={{ color: "#0D1B4B" }}
                        >
                            {formatMaskedUsd(
                                totalSuppliedUsd,
                                areBalancesVisible,
                            )}{" "}
                            in Vesu
                        </span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2.5">
                        {assets.map((asset) => (
                            <div
                                key={asset.token.address}
                                className="px-3 py-1.5 font-black text-xs"
                                style={{
                                    backgroundColor: "#1B7A4E",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "3px",
                                    color: "#FDFAF4",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            >
                                {asset.token.symbol}{" "}
                                {formatMaskedText(
                                    asset.walletBalance
                                        .add(asset.lendingBalance)
                                        .toFormatted(true),
                                    areBalancesVisible,
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Quick Actions — 2-col mobile, 4-col desktop */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                    onClick={() => setShowSendModal(true)}
                    disabled={!wallet}
                    className="flex flex-col items-center justify-center space-y-2 py-5 font-bold transition-transform active:scale-95 disabled:opacity-50"
                    style={{
                        backgroundColor: "#1B7A4E",
                        borderColor: "#0D1B4B",
                        borderWidth: "4px",
                        color: "#FDFAF4",
                        boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.3)",
                    }}
                >
                    <SendIcon />
                    <span className="text-base font-black uppercase tracking-wider">Send</span>
                </button>
                <button
                    onClick={() => setShowReceiveModal(true)}
                    disabled={!wallet}
                    className="flex flex-col items-center justify-center space-y-2 py-5 font-bold transition-transform active:scale-95 disabled:opacity-50"
                    style={{
                        backgroundColor: "#4A9EB5",
                        borderColor: "#0D1B4B",
                        borderWidth: "4px",
                        color: "#0D1B4B",
                        boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.3)",
                    }}
                >
                    <ReceiveIcon />
                    <span className="text-base font-black uppercase tracking-wider">Receive</span>
                </button>
                <button
                    onClick={() => {
                        setSelectedSupplyAssetAddress(
                            liquidAssets[0]?.token.address ?? null,
                        );
                        setSupplyAmount("");
                        setSupplyStatus({ type: "idle" });
                        setShowSupplyModal(true);
                    }}
                    disabled={!wallet || liquidAssets.length === 0}
                    className="flex flex-col items-center justify-center space-y-2 py-5 font-bold transition-transform active:scale-95 disabled:opacity-50"
                    style={{
                        backgroundColor: "#C8960A",
                        borderColor: "#0D1B4B",
                        borderWidth: "4px",
                        color: "#0D1B4B",
                        boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.3)",
                    }}
                >
                    <TrendingUpIcon />
                    <span className="text-base font-black uppercase tracking-wider">
                        {!wallet ? "Supply" : liquidAssets.length === 0 ? "No Funds" : "Supply"}
                    </span>
                </button>
                <button
                    onClick={() => {
                        setSelectedYieldAssetAddress(
                            suppliedAssets[0]?.token.address ?? null,
                        );
                        setWithdrawAmount("");
                        setWithdrawStatus({ type: "idle" });
                        setShowWithdrawModal(true);
                    }}
                    disabled={!wallet || suppliedAssets.length === 0}
                    className="flex flex-col items-center justify-center space-y-2 py-5 font-bold transition-transform active:scale-95 disabled:opacity-50"
                    style={{
                        backgroundColor: "#FDFAF4",
                        borderColor: "#0D1B4B",
                        borderWidth: "4px",
                        color: "#0D1B4B",
                        boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.3)",
                    }}
                >
                    <ArrowDownIcon />
                    <span className="text-base font-black uppercase tracking-wider">
                        {!wallet ? "Withdraw" : suppliedAssets.length === 0 ? "No Yield" : "Withdraw"}
                    </span>
                </button>
            </section>

            {/* Tab Bar - Mobile Only */}
            <div
                className="md:hidden grid grid-cols-4"
                style={{
                    borderColor: "#0D1B4B",
                    borderWidth: "4px",
                    boxShadow: "6px 6px 0px rgba(26,42,108,0.25)",
                }}
            >
                {(
                    [
                        { id: "home", label: "Home" },
                        { id: "yield", label: "Yield" },
                        { id: "private", label: "Private" },
                        { id: "activity", label: "Activity" },
                    ] as const
                ).map((tab, i) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="py-3.5 text-sm font-black uppercase tracking-wider transition-all"
                        style={{
                            backgroundColor:
                                activeTab === tab.id ? "#0D1B4B" : "#FDFAF4",
                            color:
                                activeTab === tab.id ? "#C8960A" : "#0D1B4B",
                            borderLeft:
                                i > 0 ? "3px solid #0D1B4B" : undefined,
                            borderWidth: undefined,
                            boxShadow: "none",
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Yield Section */}
            {activeTab === "yield" && <section className="space-y-4">
                <h3
                    className="text-lg font-black px-1"
                    style={{ color: "#0D1B4B" }}
                >
                    Yield Performance
                </h3>
                <div
                    className="p-3.5 space-y-4 grain-texture"
                    style={{
                        backgroundColor: "#4A9EB5",
                        borderColor: "#0D1B4B",
                        borderWidth: "4px",
                        boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.2)",
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <div
                                className="p-2 mr-3 font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                <TrendingUpIcon />
                            </div>
                            <div>
                                <p
                                    className="text-xs font-bold leading-none"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Net APY
                                </p>
                                <p
                                    className="text-sm font-black mt-1"
                                    style={{ color: "#1B7A4E" }}
                                >
                                    12.4%
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p
                                className="text-xs font-bold mb-1"
                                style={{ color: "#0D1B4B" }}
                            >
                                Supplied in Vesu
                            </p>
                            <p
                                className="text-sm font-black"
                                style={{ color: "#0D1B4B" }}
                            >
                                $ {totalSuppliedUsd.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div
                            className="p-4 font-bold text-black"
                            style={{
                                backgroundColor: "#C8960A",
                                borderColor: "#0D1B4B",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.25)",
                            }}
                        >
                            <p
                                className="text-xs font-black uppercase tracking-wider"
                                style={{ color: "#0D1B4B" }}
                            >
                                Wallet Cash
                            </p>
                            <p
                                className="mt-2 text-base font-black"
                                style={{ color: "#0D1B4B" }}
                            >
                                $ {availableWalletUsd.toFixed(2)}
                            </p>
                            <p
                                className="mt-1 text-xs"
                                style={{ color: "#0D1B4B" }}
                            >
                                Kept liquid for spending
                            </p>
                        </div>
                        <div
                            className="p-4 text-black font-bold"
                            style={{
                                backgroundColor: "#1B7A4E",
                                borderColor: "#0D1B4B",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.25)",
                            }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p
                                        className="text-xs font-black uppercase tracking-wider"
                                        style={{ color: "#FDFAF4" }}
                                    >
                                        Auto-Yield
                                    </p>
                                    <p
                                        className="mt-2 text-base font-black"
                                        style={{ color: "#FDFAF4" }}
                                    >
                                        {yieldStatusLabel}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={autoYieldEnabled}
                                    aria-label={
                                        autoYieldEnabled
                                            ? "Disable auto-yield"
                                            : "Enable auto-yield"
                                    }
                                    onClick={() => {
                                        if (!autoYieldStorageKey) return;

                                        const nextValue = !autoYieldEnabled;
                                        window.localStorage.setItem(
                                            autoYieldStorageKey,
                                            nextValue ? "true" : "false",
                                        );
                                        setAutoYieldOverrides((current) => ({
                                            ...current,
                                            [autoYieldStorageKey]: nextValue,
                                        }));
                                    }}
                                    className={`relative inline-flex h-7 w-12 shrink-0 border-3 transition-all`}
                                    style={{
                                        backgroundColor: autoYieldEnabled
                                            ? "#C8960A"
                                            : "#FDFAF4",
                                        borderColor: "#0D1B4B",
                                    }}
                                >
                                    <span
                                        className={`absolute top-1 h-5 w-5 shadow-lg transition-all ${
                                            autoYieldEnabled
                                                ? "left-6"
                                                : "left-1"
                                        }`}
                                        style={{
                                            backgroundColor: autoYieldEnabled
                                                ? "#0D1B4B"
                                                : "#4A9EB5",
                                        }}
                                    />
                                </button>
                            </div>
                            <div
                                className="mt-3 flex items-center justify-between p-2 border-2"
                                style={{
                                    borderColor: "#0D1B4B",
                                    backgroundColor: "#FDFAF4",
                                }}
                            >
                                <span
                                    className="text-xs font-black uppercase tracking-wider"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Preference
                                </span>
                                <span
                                    className="text-xs font-black uppercase tracking-[0.2em]"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    {autoYieldModeLabel}
                                </span>
                            </div>
                            <p
                                className="mt-3 text-xs font-bold"
                                style={{ color: "#FDFAF4" }}
                            >
                                {yieldStatusDetail}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p
                                className="text-sm font-black uppercase tracking-wider"
                                style={{ color: "#0D1B4B" }}
                            >
                                Yield Positions
                            </p>
                            <p
                                className="text-xs font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                Withdrawable at any time
                            </p>
                        </div>
                        {suppliedAssets.length === 0 ? (
                            <div
                                className="p-3 border-3 text-[11px] font-bold"
                                style={{
                                    borderColor: "#0D1B4B",
                                    backgroundColor: "#C8960A30",
                                    color: "#0D1B4B",
                                }}
                            >
                                No confirmed funds are currently in Vesu.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {suppliedAssets.map((asset) => (
                                    <div
                                        key={asset.token.address}
                                        className="p-4 flex items-center justify-between font-bold"
                                        style={{
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            backgroundColor: "#C8960A",
                                            color: "#0D1B4B",
                                            boxShadow:
                                                "6px 6px 0px rgba(13, 27, 75, 0.2)",
                                        }}
                                    >
                                        <div>
                                            <p className="text-base font-black">
                                                {asset.token.symbol}
                                            </p>
                                            <p className="mt-1 text-xs">
                                                In yield:{" "}
                                                {asset.lendingBalance.toFormatted(
                                                    true,
                                                )}{" "}
                                                {asset.token.symbol}
                                            </p>
                                            <p className="text-xs">
                                                Wallet:{" "}
                                                {asset.walletBalance.toFormatted(
                                                    true,
                                                )}{" "}
                                                {asset.token.symbol}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedYieldAssetAddress(
                                                    asset.token.address,
                                                );
                                                setWithdrawAmount("");
                                                setWithdrawStatus({
                                                    type: "idle",
                                                });
                                                setShowWithdrawModal(true);
                                            }}
                                            className="px-4 py-2.5 text-sm font-black transition-all"
                                            style={{
                                                backgroundColor: "#1B7A4E",
                                                color: "#FDFAF4",
                                                borderColor: "#0D1B4B",
                                                borderWidth: "2px",
                                                boxShadow: "3px 3px 0px rgba(13,27,75,0.25)",
                                            }}
                                        >
                                            Withdraw
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>}

            {/* Confidential Transfers */}
            {activeTab === "private" && wallet && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3
                            className="text-lg font-black uppercase tracking-wider"
                            style={{ color: "#0D1B4B" }}
                        >
                            Private Transfers
                        </h3>
                        <div className="flex items-center gap-2">
                            {isConfidentialInitialized && confidentialToken && (
                                <button
                                    onClick={() => {
                                        refreshConfidential(
                                            confidentialToken,
                                        ).catch((err) => {
                                            console.error(
                                                "Failed to refresh confidential vault:",
                                                err,
                                            );
                                        });
                                    }}
                                    className="p-2 transition-all hover:opacity-70"
                                    style={{
                                        backgroundColor: "#4A9EB5",
                                        color: "#0D1B4B",
                                        borderColor: "#0D1B4B",
                                        borderWidth: "2px",
                                        boxShadow: "2px 2px 0px rgba(26,42,108,0.2)",
                                    }}
                                >
                                    <RefreshIcon />
                                </button>
                            )}
                            <span
                                className="text-[10px] font-black uppercase tracking-wider px-2 py-1"
                                style={{
                                    backgroundColor: "#1B7A4E",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "2px",
                                }}
                            >
                                Tongo
                            </span>
                        </div>
                    </div>

                    <div
                        className="p-3.5 space-y-4 overflow-hidden"
                        style={{
                            backgroundColor: "#0D1B4B",
                            borderColor: "#1B7A4E",
                            borderWidth: "4px",
                            boxShadow: "8px 8px 0px rgba(26,42,108,0.25)",
                        }}
                    >
                        {!confidentialConfig || !confidentialToken ? (
                            <div
                                className="p-4 text-sm font-bold"
                                style={{
                                    backgroundColor: "#4A9EB5",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "3px",
                                }}
                            >
                                Connect a wallet on {activeNetworkConfig.label}{" "}
                                to load the supported Tongo vault tokens for
                                this network.
                            </div>
                        ) : !isConfidentialInitialized ? (
                            <div className="space-y-4">
                                {confidentialTokens.length > 1 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p
                                                className="text-[10px] font-black uppercase tracking-wider"
                                                style={{ color: "#FDFAF4" }}
                                            >
                                                Private Asset
                                            </p>
                                            <p
                                                className="text-[10px] font-black uppercase tracking-wider"
                                                style={{ color: "#FDFAF4" }}
                                            >
                                                {confidentialTokens.length} supported
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {confidentialTokens.map((token) => {
                                                const isSelected =
                                                    confidentialToken.address ===
                                                    token.address;

                                                return (
                                                    <button
                                                        key={token.address}
                                                        type="button"
                                                        onClick={() =>
                                                            handleSelectConfidentialToken(
                                                                token.address,
                                                            )
                                                        }
                                                        className="p-3 text-left transition-all"
                                                        style={{
                                                            backgroundColor:
                                                                isSelected
                                                                    ? "#C8960A"
                                                                    : "#4A9EB5",
                                                            color: "#0D1B4B",
                                                            borderColor: "#0D1B4B",
                                                            borderWidth: "3px",
                                                            boxShadow: isSelected
                                                                ? "4px 4px 0px rgba(13, 27, 75, 0.3)"
                                                                : "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                                        }}
                                                    >
                                                        <p className="text-xs font-black">
                                                            {token.symbol}
                                                        </p>
                                                        <p className="mt-1 text-[10px] font-bold">
                                                            Private vault
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="p-3"
                                            style={{
                                                backgroundColor: "#1B7A4E",
                                                color: "#0D1B4B",
                                                borderColor: "#0D1B4B",
                                                borderWidth: "3px",
                                            }}
                                        >
                                            <VaultIcon />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-base font-black" style={{ color: "#C8960A" }}>
                                                Create your private{" "}
                                                {confidentialToken.symbol} vault
                                            </p>
                                            <p className="text-sm font-bold" style={{ color: "#FDFAF4" }}>
                                                Shield balances with Tongo using
                                                a separate private key from your
                                                Starknet wallet.
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className="shrink-0 px-3 py-1 text-[10px] font-black uppercase tracking-wider"
                                        style={{
                                            backgroundColor: "#C8960A",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "2px",
                                        }}
                                    >
                                        Setup needed
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() =>
                                            openConfidentialSetup("create")
                                        }
                                        className="px-4 py-4 text-left transition-all hover:opacity-80"
                                        style={{
                                            backgroundColor: "#1B7A4E",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "4px 4px 0px rgba(0,255,65,0.3)",
                                        }}
                                    >
                                        <p className="text-sm font-black">
                                            Create Vault
                                        </p>
                                        <p className="mt-1 text-[11px] font-bold">
                                            Generate a new Tongo key and store
                                            it on this device.
                                        </p>
                                    </button>
                                    <button
                                        onClick={() =>
                                            openConfidentialSetup("import")
                                        }
                                        className="px-4 py-4 text-left transition-all hover:opacity-80"
                                        style={{
                                            backgroundColor: "#4A9EB5",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "4px 4px 0px rgba(26,42,108,0.2)",
                                        }}
                                    >
                                        <p className="text-sm font-black">
                                            Import Vault
                                        </p>
                                        <p className="mt-1 text-[11px] font-bold">
                                            Restore an existing Tongo private
                                            key on this device.
                                        </p>
                                    </button>
                                </div>

                                <div
                                    className="p-4 text-[11px] font-bold"
                                    style={{
                                        backgroundColor: "#C8960A",
                                        color: "#0D1B4B",
                                        borderColor: "#0D1B4B",
                                        borderWidth: "3px",
                                    }}
                                >
                                    Your Tongo key is sensitive and separate
                                    from your Starknet wallet. Back it up before
                                    sending funds privately.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {confidentialTokens.length > 1 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p
                                                className="text-[10px] font-black uppercase tracking-wider"
                                                style={{ color: "#FDFAF4" }}
                                            >
                                                Private Asset
                                            </p>
                                            <p
                                                className="text-[10px] font-black uppercase tracking-wider"
                                                style={{ color: "#FDFAF4" }}
                                            >
                                                {confidentialTokens.length} supported
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {confidentialTokens.map((token) => {
                                                const isSelected =
                                                    confidentialToken.address ===
                                                    token.address;

                                                return (
                                                    <button
                                                        key={token.address}
                                                        type="button"
                                                        onClick={() =>
                                                            handleSelectConfidentialToken(
                                                                token.address,
                                                            )
                                                        }
                                                        className="p-3 text-left transition-all"
                                                        style={{
                                                            backgroundColor:
                                                                isSelected
                                                                    ? "#C8960A"
                                                                    : "#4A9EB5",
                                                            color: "#0D1B4B",
                                                            borderColor: "#0D1B4B",
                                                            borderWidth: "3px",
                                                            boxShadow: isSelected
                                                                ? "4px 4px 0px rgba(13, 27, 75, 0.3)"
                                                                : "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                                        }}
                                                    >
                                                        <p className="text-xs font-black">
                                                            {token.symbol}
                                                        </p>
                                                        <p className="mt-1 text-[10px] font-bold">
                                                            Private vault
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className="p-3"
                                            style={{
                                                backgroundColor: "#1B7A4E",
                                                color: "#0D1B4B",
                                                borderColor: "#0D1B4B",
                                                borderWidth: "3px",
                                            }}
                                        >
                                            <VaultIcon />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="text-base font-black" style={{ color: "#C8960A" }}>
                                                    {confidentialConfig.label}
                                                </p>
                                                <span
                                                    className="px-2 py-1 text-[10px] font-black uppercase tracking-wider"
                                                    style={{
                                                        backgroundColor: "#1B7A4E",
                                                        color: "#0D1B4B",
                                                        borderColor: "#0D1B4B",
                                                        borderWidth: "2px",
                                                    }}
                                                >
                                                    Vault ready
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold" style={{ color: "#FDFAF4" }}>
                                                Share your Tongo address for
                                                private incoming transfers. It
                                                is not your Starknet wallet
                                                address.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleForgetConfidentialVault}
                                        className="shrink-0 text-[10px] font-black uppercase tracking-wider hover:opacity-70"
                                        style={{ color: "#C8960A" }}
                                    >
                                        Forget key
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        className="p-4"
                                        style={{
                                            backgroundColor: "#4A9EB5",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "6px 6px 0px rgba(26,42,108,0.25)",
                                        }}
                                    >
                                        <p className="text-xs font-black uppercase tracking-wider">
                                            Active Balance
                                        </p>
                                        <p className="mt-2 text-xl font-black">
                                            {confidentialActiveBalance
                                                ? `${confidentialActiveBalance.toFormatted(true)} ${confidentialToken.symbol}`
                                                : "--"}
                                        </p>
                                        <p className="mt-1 text-xs font-bold">
                                            Spendable private STRK
                                        </p>
                                    </div>
                                    <div
                                        className="p-4"
                                        style={{
                                            backgroundColor: confidentialHasPending ? "#C8960A" : "#4A9EB5",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "6px 6px 0px rgba(26,42,108,0.25)",
                                        }}
                                    >
                                        <p className="text-xs font-black uppercase tracking-wider">
                                            Pending Balance
                                        </p>
                                        <p className="mt-2 text-xl font-black">
                                            {confidentialPendingBalance
                                                ? `${confidentialPendingBalance.toFormatted(true)} ${confidentialToken.symbol}`
                                                : "--"}
                                        </p>
                                        <p className="mt-1 text-xs font-bold">
                                            Needs rollover before it becomes
                                            spendable
                                        </p>
                                    </div>
                                </div>

                                <div
                                    className="p-4 space-y-3"
                                    style={{
                                        backgroundColor: "#FDFAF4",
                                        color: "#0D1B4B",
                                        borderColor: "#0D1B4B",
                                        borderWidth: "3px",
                                        boxShadow: "3px 3px 0px rgba(26,42,108,0.2)",
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider">
                                                Tongo Address
                                            </p>
                                            <p className="mt-2 break-all font-mono text-xs font-bold">
                                                {confidentialAddress}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                copyToClipboard(
                                                    confidentialAddress || "",
                                                    "confidential-address",
                                                )
                                            }
                                            className="shrink-0 px-3 py-2 text-xs font-black transition-all hover:opacity-70"
                                            style={{
                                                backgroundColor: copiedKey === "confidential-address" ? "#C8960A" : "#1B7A4E",
                                                color: "#0D1B4B",
                                                borderColor: "#0D1B4B",
                                                borderWidth: "2px",
                                                boxShadow: "2px 2px 0px rgba(26,42,108,0.2)",
                                            }}
                                        >
                                            {copiedKey === "confidential-address" ? "Copied!" : "Copy"}
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                copyToClipboard(
                                                    confidentialRecipientJson || "",
                                                    "recipient-json",
                                                )
                                            }
                                            className="px-3 py-2 text-xs font-black transition-all hover:opacity-70"
                                            style={{
                                                backgroundColor: copiedKey === "recipient-json" ? "#C8960A" : "#4A9EB5",
                                                color: "#0D1B4B",
                                                borderColor: "#0D1B4B",
                                                borderWidth: "2px",
                                                boxShadow: "2px 2px 0px rgba(26,42,108,0.2)",
                                            }}
                                        >
                                            {copiedKey === "recipient-json" ? "Copied!" : "Copy Recipient JSON"}
                                        </button>
                                        {storedConfidentialKey && (
                                            <button
                                                onClick={() =>
                                                    copyToClipboard(
                                                        storedConfidentialKey,
                                                        "backup-key",
                                                    )
                                                }
                                                className="px-3 py-2 text-xs font-black transition-all hover:opacity-70"
                                                style={{
                                                    backgroundColor: copiedKey === "backup-key" ? "#C8960A" : "#4A9EB5",
                                                    color: "#0D1B4B",
                                                    borderColor: "#0D1B4B",
                                                    borderWidth: "2px",
                                                    boxShadow: "2px 2px 0px rgba(26,42,108,0.2)",
                                                }}
                                            >
                                                {copiedKey === "backup-key" ? "Copied!" : "Copy Backup Key"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {confidentialHasPending && (
                                    <div
                                        className="p-4 text-sm font-bold"
                                        style={{
                                            backgroundColor: "#C8960A",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                        }}
                                    >
                                        You have private incoming funds waiting.
                                        Run rollover to activate the pending
                                        balance before sending or withdrawing
                                        it.
                                    </div>
                                )}

                                {confidentialStatus.type !== "idle" && (
                                    <div
                                        style={{
                                            backgroundColor:
                                                confidentialStatus.type === "error"
                                                    ? "#FF694420"
                                                    : confidentialStatus.type === "success"
                                                      ? "#1B7A4E1A"
                                                      : "#4A9EB51A",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "2px",
                                            padding: "1rem",
                                            fontSize: "0.75rem",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {confidentialStatus.message}
                                    </div>
                                )}

                                {confidentialError &&
                                    confidentialStatus.type === "idle" && (
                                        <div
                                            className="p-4 text-xs font-bold"
                                            style={{
                                                backgroundColor: "#FF694420",
                                                color: "#0D1B4B",
                                                borderColor: "#0D1B4B",
                                                borderWidth: "2px",
                                            }}
                                        >
                                            {confidentialError.message}
                                        </div>
                                    )}

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            setConfidentialFundAmount("");
                                            setConfidentialStatus({
                                                type: "idle",
                                            });
                                            setShowConfidentialFundModal(true);
                                        }}
                                        className="px-4 py-4 text-left transition-all hover:opacity-80"
                                        style={{
                                            backgroundColor: "#1B7A4E",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "4px 4px 0px rgba(0,255,65,0.3)",
                                        }}
                                    >
                                        <p className="text-sm font-black">
                                            Fund Privately
                                        </p>
                                        <p className="mt-1 text-[11px] font-bold">
                                            Approve and move public STRK into
                                            Tongo.
                                        </p>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setConfidentialSendAmount("");
                                            setConfidentialSendRecipient("");
                                            setConfidentialStatus({
                                                type: "idle",
                                            });
                                            setShowConfidentialSendModal(true);
                                        }}
                                        disabled={
                                            !confidentialActiveBalance ||
                                            confidentialActiveBalance.isZero()
                                        }
                                        className="px-4 py-4 text-left transition-all hover:opacity-80 disabled:opacity-50"
                                        style={{
                                            backgroundColor: "#4A9EB5",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "4px 4px 0px rgba(26,42,108,0.2)",
                                        }}
                                    >
                                        <p className="text-sm font-black">
                                            Private Send
                                        </p>
                                        <p className="mt-1 text-[11px] font-bold">
                                            Send using a Tongo recipient, not a
                                            wallet address.
                                        </p>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setConfidentialWithdrawAmount("");
                                            setConfidentialWithdrawRecipient(
                                                wallet.address,
                                            );
                                            setConfidentialStatus({
                                                type: "idle",
                                            });
                                            setShowConfidentialWithdrawModal(
                                                true,
                                            );
                                        }}
                                        disabled={
                                            !confidentialActiveBalance ||
                                            confidentialActiveBalance.isZero()
                                        }
                                        className="px-4 py-4 text-left transition-all hover:opacity-80 disabled:opacity-50"
                                        style={{
                                            backgroundColor: "#4A9EB5",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "4px 4px 0px rgba(26,42,108,0.2)",
                                        }}
                                    >
                                        <p className="text-sm font-black">
                                            Withdraw Publicly
                                        </p>
                                        <p className="mt-1 text-[11px] font-bold">
                                            Move private STRK back to a Starknet
                                            address.
                                        </p>
                                    </button>
                                    <button
                                        onClick={handleConfidentialRollover}
                                        disabled={
                                            isConfidentialLoading ||
                                            !confidentialHasPending
                                        }
                                        className="px-4 py-4 text-left transition-all hover:opacity-80 disabled:opacity-50"
                                        style={{
                                            backgroundColor: "#C8960A",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "4px 4px 0px rgba(26,42,108,0.2)",
                                        }}
                                    >
                                        <p className="text-sm font-black">
                                            Rollover Pending
                                        </p>
                                        <p className="mt-1 text-[11px] font-bold">
                                            Activate received private funds for
                                            spending.
                                        </p>
                                    </button>
                                </div>

                                <div
                                    className="flex items-center justify-between p-3"
                                    style={{
                                        backgroundColor: "#FDFAF4",
                                        color: "#0D1B4B",
                                        borderColor: "#0D1B4B",
                                        borderWidth: "3px",
                                    }}
                                >
                                    <div>
                                        <p className="text-xs font-black">
                                            Emergency exit
                                        </p>
                                        <p className="text-[11px] font-bold">
                                            Withdraw all active private balance
                                            back to your public wallet.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleConfidentialExit}
                                        disabled={
                                            isConfidentialLoading ||
                                            !confidentialActiveBalance ||
                                            confidentialActiveBalance.isZero()
                                        }
                                        className="px-3 py-2 text-xs font-black transition-all hover:opacity-70 disabled:opacity-50"
                                        style={{
                                            backgroundColor: "#FF6944",
                                            color: "#FDFAF4",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow: "3px 3px 0px rgba(26,42,108,0.3)",
                                        }}
                                    >
                                        Exit All
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p
                                            className="text-[10px] font-black uppercase tracking-wider"
                                            style={{ color: "#FDFAF4" }}
                                        >
                                            Private Activity
                                        </p>
                                        <p
                                            className="text-[10px] font-bold"
                                            style={{ color: "#FDFAF4" }}
                                        >
                                            Recent Tongo actions
                                        </p>
                                    </div>
                                    {confidentialHistoryPreview.length === 0 ? (
                                        <div
                                            className="p-4 text-sm font-bold"
                                            style={{
                                                backgroundColor: "#4A9EB5",
                                                color: "#0D1B4B",
                                                borderColor: "#0D1B4B",
                                                borderWidth: "2px",
                                            }}
                                        >
                                            No private activity yet.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {confidentialHistoryPreview.map(
                                                (item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center justify-between p-3"
                                                        style={{
                                                            backgroundColor:
                                                                item.type === "fund" ||
                                                                item.type === "transferIn" ||
                                                                item.type === "rollover"
                                                                    ? "#1B7A4E1A"
                                                                    : "#4A9EB526",
                                                            color: "#4A9EB5",
                                                            borderColor: "#4A9EB5",
                                                            borderWidth: "2px",
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="p-2"
                                                                style={{
                                                                    backgroundColor:
                                                                        item.type === "fund" ||
                                                                        item.type === "transferIn" ||
                                                                        item.type === "rollover"
                                                                            ? "#1B7A4E"
                                                                            : "#4A9EB5",
                                                                    color: "#0D1B4B",
                                                                    borderColor: "#0D1B4B",
                                                                    borderWidth: "2px",
                                                                }}
                                                            >
                                                                {item.type ===
                                                                    "transferOut" ||
                                                                item.type ===
                                                                    "withdraw" ||
                                                                item.type ===
                                                                    "ragequit" ? (
                                                                    <ArrowUpIcon />
                                                                ) : (
                                                                    <ArrowDownIcon />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-black uppercase tracking-wider">
                                                                    {formatConfidentialActivityType(
                                                                        item.type,
                                                                    )}
                                                                </p>
                                                                <p className="text-[10px] font-mono font-bold opacity-70">
                                                                    {item.counterparty
                                                                        ? truncateMiddle(
                                                                              item.counterparty,
                                                                              8,
                                                                              6,
                                                                          )
                                                                        : item.txHash.slice(
                                                                              0,
                                                                              10,
                                                                          )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-black">
                                                                {item.amount.toFormatted(
                                                                    true,
                                                                )}{" "}
                                                                {
                                                                    confidentialToken.symbol
                                                                }
                                                            </p>
                                                            <p className="text-[10px] font-bold opacity-70">
                                                                #
                                                                {
                                                                    item.blockNumber
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Recent Activity */}
            {activeTab === "activity" && <section className="space-y-4">
                <h3
                    className="text-lg font-black px-1"
                    style={{ color: "#0D1B4B" }}
                >
                    Recent Activity
                </h3>
                <div
                    className="overflow-hidden grain-texture"
                    style={{
                        borderColor: "#0D1B4B",
                        borderWidth: "4px",
                        backgroundColor: "#4A9EB5",
                        boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.15)",
                    }}
                >
                    {dashboardError ? (
                        <div
                            className="p-6 text-center text-sm font-bold"
                            style={{ color: "#0D1B4B" }}
                        >
                            {dashboardError.message}
                        </div>
                    ) : history.length === 0 ? (
                        <div
                            className="p-8 text-center text-sm font-bold"
                            style={{ color: "#0D1B4B" }}
                        >
                            No recent transactions
                        </div>
                    ) : (
                        <div
                            className="divide-y"
                            style={{
                                borderColor: "#0D1B4B",
                                borderWidth: "2px",
                            }}
                        >
                            {history.slice(0, 5).map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                                    style={{
                                        backgroundColor:
                                            item.type === "received" ||
                                            item.type === "deposit"
                                                ? "#C8960A"
                                                : "#1B7A4E",
                                    }}
                                >
                                    <div className="flex items-center">
                                        <div
                                            className="p-2 mr-3 font-bold"
                                            style={{ color: "#0D1B4B" }}
                                        >
                                            {item.type === "received" ? (
                                                <ArrowDownIcon />
                                            ) : item.type === "sent" ? (
                                                <ArrowUpIcon />
                                            ) : (
                                                <HistoryIcon />
                                            )}
                                        </div>
                                        <div>
                                            <p
                                                className="text-sm font-black uppercase tracking-tighter"
                                                style={{ color: "#0D1B4B" }}
                                            >
                                                {item.type}
                                            </p>
                                            <p
                                                className="text-xs font-mono mt-0.5"
                                                style={{ color: "#0D1B4B" }}
                                            >
                                                {item.txHash.slice(0, 10)}...
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p
                                            className="text-base font-black"
                                            style={{ color: "#0D1B4B" }}
                                        >
                                            {item.type === "received" ||
                                            item.type === "deposit"
                                                ? "+"
                                                : "-"}
                                            {item.amount.toFormatted(true)}
                                        </p>
                                        {item.timestamp && (
                                            <p
                                                className="text-xs mt-0.5 font-bold"
                                                style={{ color: "#0D1B4B" }}
                                            >
                                                {new Date(
                                                    item.timestamp * 1000,
                                                ).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>}

            {/* Wallet Status - Mobile Only */}
            <footer className="md:hidden mt-auto py-8">
                {!wallet ? (
                    <button
                        className="w-full py-4 font-black text-sm shadow-xl transition-all hover:shadow-2xl active:scale-95"
                        style={{
                            backgroundColor: "#0D1B4B",
                            color: "#FDFAF4",
                            borderColor: "#4A9EB5",
                            borderWidth: "4px",
                            boxShadow: "8px 8px 0px rgba(13, 27, 75, 0.3)",
                        }}
                        disabled={isConnecting}
                        onClick={handleCartridgeConnect}
                    >
                        {isConnecting
                            ? "Opening Controller..."
                            : "Connect with Cartridge"}
                    </button>
                ) : (
                    <div
                        className="flex items-center justify-center space-x-2 text-xs font-black"
                        style={{ color: "#0D1B4B" }}
                    >
                        <div
                            className="h-2 w-2 rounded-full animate-pulse"
                            style={{ backgroundColor: "#1B7A4E" }}
                        />
                        <span>
                            Connected: {wallet.address.slice(0, 6)}...
                            {wallet.address.slice(-4)}
                        </span>
                    </div>
                )}
            </footer>

            {/* Send Modal */}
            {showSendModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm p-6 shadow-2xl space-y-6"
                        style={{
                            backgroundColor: "#C8960A",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <h2
                                className="text-xl font-black"
                                style={{ color: "#0D1B4B" }}
                            >
                                Send Assets
                            </h2>
                            <button
                                onClick={() => {
                                    setShowSendModal(false);
                                    setStatus({ type: "idle" });
                                }}
                                className="p-1 hover:opacity-70 font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        {/* Token Selector */}
                        <div className="space-y-2">
                            <label
                                className="text-[10px] font-black uppercase tracking-wider"
                                style={{ color: "#0D1B4B" }}
                            >
                                Select Token
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {assets.map((asset) => (
                                    <button
                                        key={asset.token.address}
                                        onClick={() =>
                                            setSelectedAssetAddress(
                                                asset.token.address,
                                            )
                                        }
                                        className={`p-3 transition-all text-left font-bold`}
                                        style={{
                                            backgroundColor:
                                                selectedAsset?.token.address ===
                                                asset.token.address
                                                    ? "#1B7A4E"
                                                    : "#4A9EB5",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow:
                                                selectedAsset?.token.address ===
                                                asset.token.address
                                                    ? "4px 4px 0px rgba(13, 27, 75, 0.3)"
                                                    : "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                        }}
                                    >
                                        <p className="text-xs font-black">
                                            {asset.token.symbol}
                                        </p>
                                        <p className="text-[10px]">
                                            {asset.walletBalance
                                                .add(asset.lendingBalance)
                                                .toFormatted(true)}{" "}
                                            available
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recipient */}
                        <div className="space-y-2">
                            <label
                                className="text-[10px] font-black uppercase tracking-wider"
                                style={{ color: "#0D1B4B" }}
                            >
                                Recipient Address
                            </label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                className="w-full p-4 text-sm placeholder:opacity-50 focus:outline-none transition-all font-mono"
                                style={{
                                    backgroundColor: "#4A9EB5",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                        </div>

                        {/* Amount */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <label
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Amount
                                </label>
                                {selectedAsset && (
                                    <button
                                        onClick={() =>
                                            setAmount(
                                                selectedAsset.walletBalance
                                                    .add(
                                                        selectedAsset.lendingBalance,
                                                    )
                                                    .toFormatted(),
                                            )
                                        }
                                        className="text-[10px] font-black hover:opacity-70"
                                        style={{ color: "#0D1B4B" }}
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
                                className="w-full p-4 text-2xl font-black placeholder:opacity-50 focus:outline-none transition-all"
                                style={{
                                    backgroundColor: "#4A9EB5",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                        </div>

                        {/* Status Message */}
                        {status.type !== "idle" && (
                            <div
                                className={`p-4 text-xs font-black`}
                                style={{
                                    backgroundColor:
                                        status.type === "error"
                                            ? "#FF694420"
                                            : status.type === "success"
                                              ? "#1B7A4E1A"
                                              : "#C8960A1A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "2px",
                                }}
                            >
                                {status.message}
                            </div>
                        )}

                        <button
                            onClick={handleSend}
                            disabled={
                                isSending ||
                                !selectedAsset ||
                                !recipient ||
                                !amount
                            }
                            className="w-full py-4 font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                            style={{
                                backgroundColor: "#1B7A4E",
                                color: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.3)",
                            }}
                        >
                            {status.type === "loading"
                                ? "Broadcasting..."
                                : "Confirm Send"}
                        </button>
                    </div>
                </div>
            )}

            {/* Receive Modal */}
            {showReceiveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm p-6 shadow-2xl space-y-8"
                        style={{
                            backgroundColor: "#4A9EB5",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <h2
                                className="text-xl font-black"
                                style={{ color: "#0D1B4B" }}
                            >
                                Receive Assets
                            </h2>
                            <button
                                onClick={() => setShowReceiveModal(false)}
                                className="p-1 hover:opacity-70 font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="flex flex-col items-center space-y-6">
                            {/* QR Placeholder / Visual */}
                            <div
                                className="w-48 h-48 p-4 flex items-center justify-center"
                                style={{
                                    backgroundColor: "#FDFAF4",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                }}
                            >
                                {/* In a real app, generate a QR here */}
                                <div
                                    className="w-full h-full flex items-center justify-center border-4 border-dashed"
                                    style={{
                                        borderColor: "#0D1B4B",
                                        backgroundColor: "#1B7A4E",
                                    }}
                                >
                                    <p
                                        className="text-[10px] font-black uppercase text-center px-4"
                                        style={{ color: "#0D1B4B" }}
                                    >
                                        {activeNetworkConfig.label} QR
                                    </p>
                                </div>
                            </div>

                            <div className="w-full space-y-2">
                                <label
                                    className="text-[10px] font-black uppercase tracking-wider block text-center"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Your Deposit Address
                                </label>
                                <div
                                    onClick={() =>
                                        copyToClipboard(wallet?.address || "", "wallet-address")
                                    }
                                    className="w-full p-4 text-xs font-mono break-all text-center cursor-pointer transition-all active:scale-98 group relative font-black"
                                    style={{
                                        backgroundColor: copiedKey === "wallet-address" ? "#C8960A" : "#1B7A4E",
                                        color: "#0D1B4B",
                                        borderColor: "#0D1B4B",
                                        borderWidth: "4px",
                                        boxShadow:
                                            "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                    }}
                                >
                                    {copiedKey === "wallet-address" ? "Copied!" : wallet?.address}
                                    <div
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: "#0D1B4B" }}
                                    >
                                        <CopyIcon />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            className="p-4 font-black"
                            style={{
                                backgroundColor: "#C8960A",
                                color: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "3px",
                                boxShadow: "4px 4px 0px rgba(13, 27, 75, 0.2)",
                            }}
                        >
                            <p className="text-[10px] text-center leading-relaxed">
                                Funds received at this address stay liquid until
                                you explicitly supply them to Vesu or move them
                                into your private Tongo vault.
                            </p>
                        </div>

                        <button
                            onClick={() => setShowReceiveModal(false)}
                            className="w-full py-4 font-black text-sm transition-all active:scale-95"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#FDFAF4",
                                borderColor: "#4A9EB5",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.3)",
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {showSupplyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm p-6 shadow-2xl space-y-6"
                        style={{
                            backgroundColor: "#1B7A4E",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <h2
                                className="text-xl font-black"
                                style={{ color: "#0D1B4B" }}
                            >
                                Supply To Yield
                            </h2>
                            <button
                                onClick={() => {
                                    setShowSupplyModal(false);
                                    setSupplyStatus({ type: "idle" });
                                }}
                                className="p-1 hover:opacity-70"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label
                                className="text-[10px] font-black uppercase tracking-wider"
                                style={{ color: "#0D1B4B" }}
                            >
                                Wallet Token
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {liquidAssets.map((asset) => (
                                    <button
                                        key={asset.token.address}
                                        onClick={() =>
                                            setSelectedSupplyAssetAddress(
                                                asset.token.address,
                                            )
                                        }
                                        className={`p-3 transition-all text-left`}
                                        style={{
                                            backgroundColor:
                                                selectedSupplyAsset?.token
                                                    .address ===
                                                asset.token.address
                                                    ? "#C8960A"
                                                    : "#4A9EB5",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow:
                                                selectedSupplyAsset?.token
                                                    .address ===
                                                asset.token.address
                                                    ? "4px 4px 0px rgba(13, 27, 75, 0.3)"
                                                    : "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                        }}
                                    >
                                        <p className="text-xs font-black">
                                            {asset.token.symbol}
                                        </p>
                                        <p className="text-[10px]">
                                            {asset.walletBalance.toFormatted(
                                                true,
                                            )}{" "}
                                            in wallet
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedSupplyAsset && (
                            <div
                                style={{
                                    backgroundColor: "#4A9EB5",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    padding: "1rem",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            >
                                <p className="text-[10px] font-black uppercase tracking-wider">
                                    Available To Supply
                                </p>
                                <p className="text-lg font-black mt-2">
                                    {selectedSupplyAsset.walletBalance.toFormatted(
                                        true,
                                    )}{" "}
                                    {selectedSupplyAsset.token.symbol}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <label
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Amount
                                </label>
                                {selectedSupplyAsset && (
                                    <button
                                        onClick={() =>
                                            setSupplyAmount(
                                                selectedSupplyAsset.walletBalance.toFormatted(),
                                            )
                                        }
                                        className="text-[10px] font-black hover:opacity-70"
                                        style={{ color: "#0D1B4B" }}
                                    >
                                        Max
                                    </button>
                                )}
                            </div>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={supplyAmount}
                                onChange={(e) =>
                                    setSupplyAmount(e.target.value)
                                }
                                className="w-full p-4 text-2xl font-black placeholder:opacity-50 focus:outline-none transition-all"
                                style={{
                                    backgroundColor: "#4A9EB5",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                            <p
                                className="text-[11px] font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                You approve and deposit this amount into Vesu
                                explicitly.
                            </p>
                        </div>

                        {supplyStatus.type !== "idle" && (
                            <div
                                style={{
                                    backgroundColor:
                                        supplyStatus.type === "error"
                                            ? "#FF694420"
                                            : supplyStatus.type === "success"
                                              ? "#1B7A4E1A"
                                              : "#C8960A1A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "2px",
                                    padding: "1rem",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                }}
                            >
                                {supplyStatus.message}
                            </div>
                        )}

                        <button
                            onClick={handleSupply}
                            disabled={
                                isLendingAction ||
                                !selectedSupplyAsset ||
                                !supplyAmount
                            }
                            className="w-full py-4 font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#1B7A4E",
                                borderColor: "#1B7A4E",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.3)",
                            }}
                        >
                            {supplyStatus.type === "loading"
                                ? "Submitting Supply..."
                                : "Confirm Supply"}
                        </button>
                    </div>
                </div>
            )}

            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm p-6 shadow-2xl space-y-6"
                        style={{
                            backgroundColor: "#4A9EB5",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <h2
                                className="text-xl font-black"
                                style={{ color: "#0D1B4B" }}
                            >
                                Withdraw From Yield
                            </h2>
                            <button
                                onClick={() => {
                                    setShowWithdrawModal(false);
                                    setWithdrawStatus({ type: "idle" });
                                }}
                                className="p-1 hover:opacity-70"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label
                                className="text-[10px] font-black uppercase tracking-wider"
                                style={{ color: "#0D1B4B" }}
                            >
                                Yield Token
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {suppliedAssets.map((asset) => (
                                    <button
                                        key={asset.token.address}
                                        onClick={() =>
                                            setSelectedYieldAssetAddress(
                                                asset.token.address,
                                            )
                                        }
                                        className={`p-3 transition-all text-left`}
                                        style={{
                                            backgroundColor:
                                                selectedYieldAsset?.token
                                                    .address ===
                                                asset.token.address
                                                    ? "#1B7A4E"
                                                    : "#C8960A",
                                            color: "#0D1B4B",
                                            borderColor: "#0D1B4B",
                                            borderWidth: "3px",
                                            boxShadow:
                                                selectedYieldAsset?.token
                                                    .address ===
                                                asset.token.address
                                                    ? "4px 4px 0px rgba(13, 27, 75, 0.3)"
                                                    : "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                        }}
                                    >
                                        <p className="text-xs font-black">
                                            {asset.token.symbol}
                                        </p>
                                        <p className="text-[10px]">
                                            {asset.lendingBalance.toFormatted(
                                                true,
                                            )}{" "}
                                            in Vesu
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedYieldAsset && (
                            <div
                                style={{
                                    backgroundColor: "#C8960A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    padding: "1rem",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            >
                                <p className="text-[10px] font-black uppercase tracking-wider">
                                    Available To Withdraw
                                </p>
                                <p className="text-lg font-black mt-2">
                                    {selectedYieldAsset.lendingBalance.toFormatted(
                                        true,
                                    )}{" "}
                                    {selectedYieldAsset.token.symbol}
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <label
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Amount
                                </label>
                                {selectedYieldAsset && (
                                    <button
                                        onClick={() =>
                                            setWithdrawAmount(
                                                selectedYieldAsset.lendingBalance.toFormatted(),
                                            )
                                        }
                                        className="text-[10px] font-black hover:opacity-70"
                                        style={{ color: "#0D1B4B" }}
                                    >
                                        Max
                                    </button>
                                )}
                            </div>
                            <input
                                type="number"
                                placeholder="Leave blank to withdraw all"
                                value={withdrawAmount}
                                onChange={(e) =>
                                    setWithdrawAmount(e.target.value)
                                }
                                className="w-full p-4 text-2xl font-black placeholder:opacity-50 focus:outline-none transition-all"
                                style={{
                                    backgroundColor: "#C8960A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                            <p
                                className="text-[11px] font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                Leave the amount empty to withdraw the full Vesu
                                position.
                            </p>
                        </div>

                        {withdrawStatus.type !== "idle" && (
                            <div
                                style={{
                                    backgroundColor:
                                        withdrawStatus.type === "error"
                                            ? "#FF694420"
                                            : withdrawStatus.type === "success"
                                              ? "#1B7A4E1A"
                                              : "#1B7A4E1A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "2px",
                                    padding: "1rem",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                }}
                            >
                                {withdrawStatus.message}
                            </div>
                        )}

                        <button
                            onClick={handleWithdraw}
                            disabled={isLendingAction || !selectedYieldAsset}
                            className="w-full py-4 font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#1B7A4E",
                                borderColor: "#1B7A4E",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.3)",
                            }}
                        >
                            {withdrawStatus.type === "loading"
                                ? "Submitting Withdrawal..."
                                : "Confirm Withdraw"}
                        </button>
                    </div>
                </div>
            )}

            {showConfidentialSetupModal && confidentialConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm p-6 shadow-2xl space-y-6"
                        style={{
                            backgroundColor: "#C8960A",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                        >
                            <div className="flex justify-between items-center">
                            <div>
                                <h2
                                    className="text-xl font-black"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Private {confidentialToken.symbol} Vault
                                </h2>
                                <p
                                    className="text-sm mt-1"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Set up your {activeNetworkConfig.shortLabel}{" "}
                                    Tongo key for {confidentialToken.symbol}.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowConfidentialSetupModal(false);
                                    setConfidentialStatus({ type: "idle" });
                                }}
                                className="p-1 hover:opacity-70"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setConfidentialSetupMode("create");
                                    setConfidentialPrivateKeyInput(
                                        generateConfidentialPrivateKey(),
                                    );
                                    setConfidentialStatus({ type: "idle" });
                                }}
                                className={`px-4 py-3 text-left transition-all font-black text-sm`}
                                style={{
                                    backgroundColor:
                                        confidentialSetupMode === "create"
                                            ? "#1B7A4E"
                                            : "#4A9EB5",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "3px",
                                    boxShadow:
                                        confidentialSetupMode === "create"
                                            ? "4px 4px 0px rgba(13, 27, 75, 0.3)"
                                            : "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            >
                                <p>Create</p>
                                <p className="mt-1 text-[11px]">
                                    Generate a fresh Tongo key.
                                </p>
                            </button>
                            <button
                                onClick={() => {
                                    setConfidentialSetupMode("import");
                                    setConfidentialPrivateKeyInput("");
                                    setConfidentialStatus({ type: "idle" });
                                }}
                                className={`px-4 py-3 text-left transition-all font-black text-sm`}
                                style={{
                                    backgroundColor:
                                        confidentialSetupMode === "import"
                                            ? "#1B7A4E"
                                            : "#4A9EB5",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "3px",
                                    boxShadow:
                                        confidentialSetupMode === "import"
                                            ? "4px 4px 0px rgba(13, 27, 75, 0.3)"
                                            : "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            >
                                <p>Import</p>
                                <p className="mt-1 text-[11px]">
                                    Restore an existing Tongo key.
                                </p>
                            </button>
                        </div>

                        <div
                            style={{
                                borderColor: "#0D1B4B",
                                backgroundColor: "#4A9EB5",
                                borderWidth: "4px",
                                padding: "1rem",
                                boxShadow: "4px 4px 0px rgba(13, 27, 75, 0.2)",
                            }}
                            className="space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <label
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Tongo Private Key
                                </label>
                                {confidentialSetupMode === "create" && (
                                    <button
                                        onClick={() =>
                                            setConfidentialPrivateKeyInput(
                                                generateConfidentialPrivateKey(),
                                            )
                                        }
                                        className="text-[10px] font-black uppercase tracking-wider hover:opacity-70"
                                        style={{ color: "#0D1B4B" }}
                                    >
                                        Regenerate
                                    </button>
                                )}
                            </div>
                            <textarea
                                value={confidentialPrivateKeyInput}
                                onChange={(e) =>
                                    setConfidentialPrivateKeyInput(
                                        e.target.value,
                                    )
                                }
                                rows={4}
                                spellCheck={false}
                                className="w-full p-4 text-xs font-mono placeholder:opacity-50 focus:outline-none resize-none"
                                style={{
                                    backgroundColor: "#FDFAF4",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "3px",
                                    boxShadow:
                                        "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                }}
                                placeholder="0x..."
                            />
                            <div className="flex items-center justify-between gap-3">
                                <p
                                    className="text-[11px] font-bold"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Store this key safely. It is separate from
                                    your wallet and required to restore private
                                    balances.
                                </p>
                                <button
                                    onClick={() =>
                                        copyToClipboard(
                                            confidentialPrivateKeyInput,
                                            "private-key",
                                        )
                                    }
                                    disabled={!confidentialPrivateKeyInput}
                                    className="shrink-0 px-3 py-2 text-xs font-semibold disabled:opacity-50 transition-all active:scale-95"
                                    style={{
                                        backgroundColor: copiedKey === "private-key" ? "#C8960A" : "#0D1B4B",
                                        color: copiedKey === "private-key" ? "#0D1B4B" : "#1B7A4E",
                                        borderColor: "#1B7A4E",
                                        borderWidth: "2px",
                                        boxShadow:
                                            "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                    }}
                                >
                                    {copiedKey === "private-key" ? "Copied!" : "Copy"}
                                </button>
                            </div>
                        </div>

                        {confidentialStatus.type !== "idle" && (
                            <div
                                style={{
                                    backgroundColor:
                                        confidentialStatus.type === "error"
                                            ? "#FF694420"
                                            : confidentialStatus.type ===
                                                "success"
                                              ? "#1B7A4E1A"
                                              : "#C8960A1A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "2px",
                                    padding: "1rem",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                }}
                            >
                                {confidentialStatus.message}
                            </div>
                        )}

                        <button
                            onClick={handleConfidentialSetup}
                            disabled={
                                isConfidentialLoading ||
                                !confidentialPrivateKeyInput
                            }
                            className="w-full py-4 font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#C8960A",
                                borderColor: "#C8960A",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.3)",
                            }}
                        >
                            {confidentialStatus.type === "loading"
                                ? "Preparing Vault..."
                                : confidentialSetupMode === "create"
                                  ? "Create Private Vault"
                                  : "Import Private Vault"}
                        </button>
                    </div>
                </div>
            )}

            {showConfidentialFundModal && confidentialToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm p-6 shadow-2xl space-y-6"
                        style={{
                            backgroundColor: "#4A9EB5",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2
                                    className="text-xl font-black"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Fund Private Vault
                                </h2>
                                <p
                                    className="text-sm mt-1"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Move public STRK into Tongo.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowConfidentialFundModal(false);
                                    setConfidentialStatus({ type: "idle" });
                                }}
                                className="p-1 hover:opacity-70"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div
                            style={{
                                backgroundColor: "#C8960A",
                                color: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "4px",
                                padding: "1rem",
                                boxShadow: "4px 4px 0px rgba(13, 27, 75, 0.2)",
                            }}
                            className="space-y-1"
                        >
                            <p className="text-[10px] font-black uppercase tracking-wider">
                                Available Public Balance
                            </p>
                            <p className="text-lg font-black">
                                {assets
                                    .find(
                                        (asset) =>
                                            asset.token.address ===
                                            confidentialToken.address,
                                    )
                                    ?.walletBalance.toFormatted(true) ??
                                    "--"}{" "}
                                {confidentialToken.symbol}
                            </p>
                            <p className="text-[11px] font-bold">
                                Approve is included automatically in the
                                confidential fund flow.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <label
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Amount
                                </label>
                                <button
                                    onClick={() => {
                                        const asset = assets.find(
                                            (entry) =>
                                                entry.token.address ===
                                                confidentialToken.address,
                                        );
                                        setConfidentialFundAmount(
                                            asset?.walletBalance.toFormatted() ??
                                                "",
                                        );
                                    }}
                                    className="text-[10px] font-black hover:opacity-70"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Max
                                </button>
                            </div>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={confidentialFundAmount}
                                onChange={(e) =>
                                    setConfidentialFundAmount(e.target.value)
                                }
                                className="w-full p-4 text-2xl font-black placeholder:opacity-50 focus:outline-none transition-all"
                                style={{
                                    backgroundColor: "#C8960A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                        </div>

                        {confidentialStatus.type !== "idle" && (
                            <div
                                style={{
                                    backgroundColor:
                                        confidentialStatus.type === "error"
                                            ? "#FF694420"
                                            : confidentialStatus.type ===
                                                "success"
                                              ? "#1B7A4E1A"
                                              : "#4A9EB51A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "2px",
                                    padding: "1rem",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                }}
                            >
                                {confidentialStatus.message}
                            </div>
                        )}

                        <button
                            onClick={handleConfidentialFund}
                            disabled={
                                isConfidentialLoading || !confidentialFundAmount
                            }
                            className="w-full py-4 font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#FDFAF4",
                                borderColor: "#4A9EB5",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.3)",
                            }}
                        >
                            {confidentialStatus.type === "loading"
                                ? "Funding..."
                                : "Confirm Private Funding"}
                        </button>
                    </div>
                </div>
            )}

            {showConfidentialSendModal && confidentialToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm p-6 shadow-2xl space-y-6"
                        style={{
                            backgroundColor: "#1B7A4E",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2
                                    className="text-xl font-black"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Private Send
                                </h2>
                                <p
                                    className="text-sm mt-1"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Send to a Tongo vault, not a wallet address.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowConfidentialSendModal(false);
                                    setConfidentialStatus({ type: "idle" });
                                }}
                                className="p-1 hover:opacity-70"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div
                            style={{
                                backgroundColor: "#C8960A",
                                color: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "4px",
                                padding: "1rem",
                                boxShadow: "4px 4px 0px rgba(13, 27, 75, 0.2)",
                            }}
                            className="space-y-1"
                        >
                            <p className="text-[10px] font-black uppercase tracking-wider">
                                Active Private Balance
                            </p>
                            <p className="text-lg font-black">
                                {confidentialActiveBalance?.toFormatted(true) ??
                                    "--"}{" "}
                                {confidentialToken.symbol}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label
                                className="text-[10px] font-black uppercase tracking-wider"
                                style={{ color: "#0D1B4B" }}
                            >
                                Recipient
                            </label>
                            <textarea
                                value={confidentialSendRecipient}
                                onChange={(e) =>
                                    setConfidentialSendRecipient(e.target.value)
                                }
                                rows={4}
                                spellCheck={false}
                                placeholder="Paste a Tongo address or { x, y } recipient JSON"
                                className="w-full p-4 text-xs font-mono placeholder:opacity-50 focus:outline-none resize-none"
                                style={{
                                    backgroundColor: "#4A9EB5",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                            <p
                                className="text-[11px] font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                The docs require a confidential recipient public
                                key. This form accepts a Tongo address or the
                                raw recipient JSON.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <label
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Amount
                                </label>
                                <button
                                    onClick={() =>
                                        setConfidentialSendAmount(
                                            confidentialActiveBalance?.toFormatted() ??
                                                "",
                                        )
                                    }
                                    className="text-[10px] font-black hover:opacity-70"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Max
                                </button>
                            </div>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={confidentialSendAmount}
                                onChange={(e) =>
                                    setConfidentialSendAmount(e.target.value)
                                }
                                className="w-full p-4 text-2xl font-black placeholder:opacity-50 focus:outline-none transition-all"
                                style={{
                                    backgroundColor: "#C8960A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                        </div>

                        {confidentialStatus.type !== "idle" && (
                            <div
                                style={{
                                    backgroundColor:
                                        confidentialStatus.type === "error"
                                            ? "#FF694420"
                                            : confidentialStatus.type ===
                                                "success"
                                              ? "#1B7A4E1A"
                                              : "#4A9EB51A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "2px",
                                    padding: "1rem",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                }}
                            >
                                {confidentialStatus.message}
                            </div>
                        )}

                        <button
                            onClick={handleConfidentialTransfer}
                            disabled={
                                isConfidentialLoading ||
                                !confidentialSendAmount ||
                                !confidentialSendRecipient
                            }
                            className="w-full py-4 font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#1B7A4E",
                                borderColor: "#1B7A4E",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.3)",
                            }}
                        >
                            {confidentialStatus.type === "loading"
                                ? "Sending Privately..."
                                : "Confirm Private Send"}
                        </button>
                    </div>
                </div>
            )}

            {showConfidentialWithdrawModal && confidentialToken && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-sm p-6 shadow-2xl space-y-6"
                        style={{
                            backgroundColor: "#4A9EB5",
                            borderColor: "#0D1B4B",
                            borderWidth: "5px",
                            boxShadow: "12px 12px 0px rgba(13, 27, 75, 0.3)",
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h2
                                    className="text-xl font-black"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Withdraw Private STRK
                                </h2>
                                <p
                                    className="text-sm mt-1"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Move private STRK back to a public address.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowConfidentialWithdrawModal(false);
                                    setConfidentialStatus({ type: "idle" });
                                }}
                                className="p-1 hover:opacity-70"
                                style={{ color: "#0D1B4B" }}
                            >
                                <CloseIcon />
                            </button>
                        </div>

                        <div
                            style={{
                                backgroundColor: "#C8960A",
                                color: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "4px",
                                padding: "1rem",
                                boxShadow: "4px 4px 0px rgba(13, 27, 75, 0.2)",
                            }}
                            className="space-y-1"
                        >
                            <p className="text-[10px] font-black uppercase tracking-wider">
                                Active Private Balance
                            </p>
                            <p className="text-lg font-black">
                                {confidentialActiveBalance?.toFormatted(true) ??
                                    "--"}{" "}
                                {confidentialToken.symbol}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label
                                className="text-[10px] font-black uppercase tracking-wider"
                                style={{ color: "#0D1B4B" }}
                            >
                                Destination
                            </label>
                            <input
                                type="text"
                                value={confidentialWithdrawRecipient}
                                onChange={(e) =>
                                    setConfidentialWithdrawRecipient(
                                        e.target.value,
                                    )
                                }
                                placeholder="0x..."
                                className="w-full p-4 text-sm font-mono placeholder:opacity-50 focus:outline-none transition-all"
                                style={{
                                    backgroundColor: "#FDFAF4",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "2px 2px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                            <p
                                className="text-[11px] font-bold"
                                style={{ color: "#0D1B4B" }}
                            >
                                Defaults to your connected wallet address.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <label
                                    className="text-[10px] font-black uppercase tracking-wider"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Amount
                                </label>
                                <button
                                    onClick={() =>
                                        setConfidentialWithdrawAmount(
                                            confidentialActiveBalance?.toFormatted() ??
                                                "",
                                        )
                                    }
                                    className="text-[10px] font-black hover:opacity-70"
                                    style={{ color: "#0D1B4B" }}
                                >
                                    Max
                                </button>
                            </div>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={confidentialWithdrawAmount}
                                onChange={(e) =>
                                    setConfidentialWithdrawAmount(
                                        e.target.value,
                                    )
                                }
                                className="w-full p-4 text-2xl font-black placeholder:opacity-50 focus:outline-none transition-all"
                                style={{
                                    backgroundColor: "#C8960A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow:
                                        "4px 4px 0px rgba(13, 27, 75, 0.2)",
                                }}
                            />
                        </div>

                        {confidentialStatus.type !== "idle" && (
                            <div
                                style={{
                                    backgroundColor:
                                        confidentialStatus.type === "error"
                                            ? "#FF694420"
                                            : confidentialStatus.type ===
                                                "success"
                                              ? "#1B7A4E1A"
                                              : "#4A9EB51A",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "2px",
                                    padding: "1rem",
                                    fontSize: "0.75rem",
                                    fontWeight: "bold",
                                }}
                            >
                                {confidentialStatus.message}
                            </div>
                        )}

                        <button
                            onClick={handleConfidentialWithdraw}
                            disabled={
                                isConfidentialLoading ||
                                !confidentialWithdrawAmount
                            }
                            className="w-full py-4 font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#FDFAF4",
                                borderColor: "#4A9EB5",
                                borderWidth: "3px",
                                boxShadow: "6px 6px 0px rgba(13, 27, 75, 0.3)",
                            }}
                        >
                            {confidentialStatus.type === "loading"
                                ? "Withdrawing..."
                                : "Confirm Private Withdraw"}
                        </button>
                    </div>
                </div>
            )}
            </main>
        </div>
    );
}

function formatConfidentialActivityType(type: string): string {
    switch (type) {
        case "fund":
            return "Funded";
        case "withdraw":
            return "Withdrew";
        case "ragequit":
            return "Exited";
        case "rollover":
            return "Rolled Over";
        case "transferIn":
            return "Received";
        case "transferOut":
            return "Sent";
        default:
            return type;
    }
}

function truncateMiddle(value: string, start: number, end: number): string {
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
}

function formatMaskedUsd(value: number, visible: boolean): string {
    if (!visible) return "$••••••";

    return `$ ${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatMaskedText(value: string, visible: boolean): string {
    return visible ? value : "••••";
}

// Simple Icons
function SendIcon() {
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
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    );
}

function ReceiveIcon() {
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
            <polyline points="17 7 7 17 7 7" />
            <polyline points="17 17 7 17 17 7" />
        </svg>
    );
}

function TrendingUpIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    );
}

function RefreshIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M23 4v6h-6" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
    );
}

function ArrowDownIcon() {
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
        </svg>
    );
}

function ArrowUpIcon() {
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
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
        </svg>
    );
}

function HistoryIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function EyeOffIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M17.94 17.94A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a21.66 21.66 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-3.16 4.19" />
            <path d="M14.12 14.12A3 3 0 0 1 9.88 9.88" />
            <path d="M1 1l22 22" />
        </svg>
    );
}

function CloseIcon() {
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
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg
            width="14"
            height="14"
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

function VaultIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="4" y="11" width="16" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            <circle cx="12" cy="15" r="1.5" />
        </svg>
    );
}

function readStoredAutoYieldPreference(storageKey: string): boolean {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "true";
}
