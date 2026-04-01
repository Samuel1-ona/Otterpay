import Image from "next/image";
import Link from "next/link";
import mascotImg from "./assets/mascot.png";

export default function LandingPage() {
    return (
        <div
            style={{
                fontFamily: '"Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif',
                backgroundColor: "#F5EFE4",
                color: "#0D1B4B",
            }}
        >
            {/* ── NAV ── */}
            <nav
                className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 py-4"
                style={{
                    backgroundColor: "#F5EFE4",
                    borderBottom: "4px solid #0D1B4B",
                    boxShadow: "0 4px 0px rgba(13,27,75,0.08)",
                }}
            >
                <span
                    className="text-2xl font-black tracking-tight"
                    style={{ color: "#0D1B4B" }}
                >
                    Otter<span style={{ color: "#C8960A" }}>Pay</span>
                </span>
                <div className="flex items-center gap-3">
                    <Link
                        href="/app"
                        className="hidden md:inline-block text-sm font-bold px-4 py-2 transition-all hover:opacity-80"
                        style={{ color: "#0D1B4B" }}
                    >
                        Docs
                    </Link>
                    <Link
                        href="/app"
                        className="text-sm font-black px-5 py-2.5 transition-all active:scale-95"
                        style={{
                            backgroundColor: "#0D1B4B",
                            color: "#C8960A",
                            borderColor: "#0D1B4B",
                            borderWidth: "3px",
                            boxShadow: "4px 4px 0px rgba(13,27,75,0.25)",
                        }}
                    >
                        Launch App →
                    </Link>
                </div>
            </nav>

            {/* ── HERO ── */}
            <section
                className="relative overflow-hidden"
                style={{
                    backgroundColor: "#C8960A",
                    borderBottom: "5px solid #0D1B4B",
                }}
            >
                <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10 md:gap-0">
                    {/* Left: text */}
                    <div className="flex-1 space-y-6 z-10">
                        <div
                            className="inline-block px-4 py-1.5 text-xs font-black uppercase tracking-widest"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#C8960A",
                                borderColor: "#0D1B4B",
                                borderWidth: "3px",
                                boxShadow: "3px 3px 0px rgba(13,27,75,0.3)",
                            }}
                        >
                            Built on Starknet · Zero Fees
                        </div>
                        <h1
                            className="text-5xl md:text-7xl font-black leading-none tracking-tight"
                            style={{ color: "#0D1B4B" }}
                        >
                            YOUR MONEY
                            <br />
                            <span
                                style={{
                                    color: "#FDFAF4",
                                    WebkitTextStroke: "2px #0D1B4B",
                                }}
                            >
                                EARNS
                            </span>
                            <br />
                            WHILE IT
                            <br />
                            <span style={{ color: "#1B7A4E" }}>MOVES.</span>
                        </h1>
                        <p
                            className="text-lg md:text-xl font-bold max-w-md leading-snug"
                            style={{ color: "#0D1B4B" }}
                        >
                            Send payments instantly, earn yield on idle
                            balances, and keep transfers private — all
                            gasless on Starknet.
                        </p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <Link
                                href="/app"
                                className="text-base font-black px-8 py-4 transition-all active:scale-95 hover:shadow-2xl"
                                style={{
                                    backgroundColor: "#0D1B4B",
                                    color: "#C8960A",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow: "8px 8px 0px rgba(13,27,75,0.3)",
                                }}
                            >
                                Start Earning →
                            </Link>
                            <Link
                                href="#how"
                                className="text-base font-black px-8 py-4 transition-all active:scale-95"
                                style={{
                                    backgroundColor: "transparent",
                                    color: "#0D1B4B",
                                    borderColor: "#0D1B4B",
                                    borderWidth: "4px",
                                    boxShadow: "8px 8px 0px rgba(13,27,75,0.15)",
                                }}
                            >
                                How it works
                            </Link>
                        </div>
                    </div>

                    {/* Right: mascot */}
                    <div className="relative shrink-0 flex items-center justify-center">
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background:
                                    "radial-gradient(circle, rgba(253,250,244,0.3) 0%, transparent 70%)",
                            }}
                        />
                        <Image
                            src={mascotImg}
                            alt="OtterPay mascot — a lightning-bolt otter making peace signs"
                            width={340}
                            height={420}
                            priority
                            className="relative z-10 drop-shadow-2xl"
                            style={{
                                width: "auto",
                                height: "auto",
                                filter: "drop-shadow(0 8px 24px rgba(13,27,75,0.25))",
                            }}
                        />
                    </div>
                </div>

                {/* Decorative zigzag bottom border */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-3"
                    style={{
                        background:
                            "repeating-linear-gradient(90deg, #0D1B4B 0px, #0D1B4B 12px, transparent 12px, transparent 24px)",
                    }}
                />
            </section>

            {/* ── TICKER STRIP ── */}
            <div
                className="overflow-hidden py-3"
                style={{
                    backgroundColor: "#0D1B4B",
                    borderBottom: "4px solid #0D1B4B",
                }}
            >
                <div className="flex gap-12 animate-marquee whitespace-nowrap text-sm font-black uppercase tracking-widest px-8" style={{ color: "#C8960A" }}>
                    {[
                        "Zero Gas Fees",
                        "Yield on Every Balance",
                        "Private Transfers",
                        "Starknet Native",
                        "Cartridge Wallet",
                        "Auto-Yield",
                        "Confidential Payments",
                        "Zero Gas Fees",
                        "Yield on Every Balance",
                        "Private Transfers",
                        "Starknet Native",
                        "Cartridge Wallet",
                        "Auto-Yield",
                        "Confidential Payments",
                    ].map((item, i) => (
                        <span key={i} className="flex items-center gap-3">
                            <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: "#1B7A4E" }}
                            />
                            {item}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── HOW IT WORKS ── */}
            <section
                id="how"
                className="max-w-6xl mx-auto px-6 md:px-12 py-20 space-y-12"
            >
                <div className="text-center space-y-3">
                    <p
                        className="text-xs font-black uppercase tracking-widest"
                        style={{ color: "#C8960A" }}
                    >
                        Simple as 1-2-3
                    </p>
                    <h2
                        className="text-4xl md:text-5xl font-black"
                        style={{ color: "#0D1B4B" }}
                    >
                        GET PAID.
                        <br className="md:hidden" />
                        {" "}PAY.{" "}
                        <span style={{ color: "#1B7A4E" }}>EARN.</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
                    {[
                        {
                            step: "01",
                            title: "Connect in Seconds",
                            body: "Connect your Cartridge Controller wallet and start using a controller-first Starknet payment flow.",
                            bg: "#0D1B4B",
                            fg: "#FDFAF4",
                            accent: "#C8960A",
                        },
                        {
                            step: "02",
                            title: "Receive & Earn",
                            body: "Incoming funds automatically flow into Vesu yield protocol. Your balance earns APY the moment it lands — no action needed.",
                            bg: "#C8960A",
                            fg: "#0D1B4B",
                            accent: "#0D1B4B",
                        },
                        {
                            step: "03",
                            title: "Send for Free",
                            body: "Every transfer is fully gasless — sponsored by AVNU paymaster. Send to anyone on Starknet without touching ETH for gas.",
                            bg: "#1B7A4E",
                            fg: "#FDFAF4",
                            accent: "#C8960A",
                        },
                    ].map((item, i) => (
                        <div
                            key={i}
                            className="p-8 md:p-10 space-y-4"
                            style={{
                                backgroundColor: item.bg,
                                color: item.fg,
                                border: "4px solid #0D1B4B",
                                marginLeft: i > 0 ? "-4px" : "0",
                            }}
                        >
                            <span
                                className="text-5xl font-black opacity-20 block"
                                style={{ color: item.accent }}
                            >
                                {item.step}
                            </span>
                            <h3
                                className="text-xl font-black"
                                style={{ color: item.accent }}
                            >
                                {item.title}
                            </h3>
                            <p className="text-sm font-bold leading-relaxed opacity-80">
                                {item.body}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FEATURES GRID ── */}
            <section
                className="py-20"
                style={{
                    backgroundColor: "#FDFAF4",
                    borderTop: "4px solid #0D1B4B",
                    borderBottom: "4px solid #0D1B4B",
                }}
            >
                <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-12">
                    <div className="text-center space-y-2">
                        <p
                            className="text-xs font-black uppercase tracking-widest"
                            style={{ color: "#C8960A" }}
                        >
                            Everything you need
                        </p>
                        <h2
                            className="text-4xl md:text-5xl font-black"
                            style={{ color: "#0D1B4B" }}
                        >
                            BUILT DIFFERENT.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        {[
                            {
                                icon: <ZapIcon />,
                                label: "Zero Gas, Every Time",
                                desc: "OtterPay sponsors every transaction via AVNU paymaster. Your users never touch ETH for gas — ever.",
                                bg: "#C8960A",
                                fg: "#0D1B4B",
                            },
                            {
                                icon: <TrendingUpIcon />,
                                label: "Auto-Yield on Idle Funds",
                                desc: "Every balance automatically earns yield through Vesu Finance. Turn on auto-mode and watch your money grow between payments.",
                                bg: "#FDFAF4",
                                fg: "#0D1B4B",
                            },
                            {
                                icon: <LockIcon />,
                                label: "Private Transfers",
                                desc: "Tongo-powered confidential transfers shield your balance from public view. Your business, your privacy.",
                                bg: "#0D1B4B",
                                fg: "#FDFAF4",
                            },
                            {
                                icon: <LayersIcon />,
                                label: "Starknet Native",
                                desc: "Built on Starknet's ZK-rollup for near-instant finality and negligible costs. The infrastructure your payments deserve.",
                                bg: "#4A9EB5",
                                fg: "#0D1B4B",
                            },
                        ].map((feat, i) => (
                            <div
                                key={i}
                                className="p-10 space-y-4"
                                style={{
                                    backgroundColor: feat.bg,
                                    color: feat.fg,
                                    border: "4px solid #0D1B4B",
                                    marginTop: i >= 2 ? "-4px" : "0",
                                    marginLeft: i % 2 === 1 ? "-4px" : "0",
                                }}
                            >
                                <div style={{ color: feat.fg, opacity: 0.9 }}>{feat.icon}</div>
                                <h3 className="text-2xl font-black">
                                    {feat.label}
                                </h3>
                                <p
                                    className="text-sm font-bold leading-relaxed"
                                    style={{ opacity: 0.75 }}
                                >
                                    {feat.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── YIELD SECTION ── */}
            <section
                className="py-20"
                style={{
                    backgroundColor: "#0D1B4B",
                    borderBottom: "5px solid #0D1B4B",
                }}
            >
                <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 space-y-6">
                        <p
                            className="text-xs font-black uppercase tracking-widest"
                            style={{ color: "#4A9EB5" }}
                        >
                            Powered by Vesu Finance
                        </p>
                        <h2
                            className="text-4xl md:text-5xl font-black leading-tight"
                            style={{ color: "#C8960A" }}
                        >
                            YOUR IDLE MONEY
                            <br />
                            <span style={{ color: "#FDFAF4" }}>NEVER SITS</span>
                            <br />
                            STILL.
                        </h2>
                        <p
                            className="text-base font-bold leading-relaxed max-w-md"
                            style={{ color: "#4A9EB5" }}
                        >
                            OtterPay auto-deposits your incoming funds into
                            Vesu&apos;s lending protocol. You earn yield from the
                            moment money arrives — and withdraw instantly
                            when you need to send.
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            {["Auto-deposit", "Manual supply", "Instant withdraw", "Real APY"].map(
                                (tag) => (
                                    <span
                                        key={tag}
                                        className="px-4 py-2 text-xs font-black uppercase tracking-wider"
                                        style={{
                                            backgroundColor: "#1B7A4E",
                                            color: "#FDFAF4",
                                            borderColor: "#4A9EB5",
                                            borderWidth: "2px",
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ),
                            )}
                        </div>
                    </div>

                    {/* Yield card mockup */}
                    <div className="shrink-0 w-full md:w-80 space-y-3">
                        <div
                            className="p-6 space-y-4"
                            style={{
                                backgroundColor: "#FDFAF4",
                                borderColor: "#C8960A",
                                borderWidth: "4px",
                                boxShadow: "10px 10px 0px rgba(200,150,10,0.3)",
                            }}
                        >
                            <p
                                className="text-xs font-black uppercase tracking-widest"
                                style={{ color: "#0D1B4B" }}
                            >
                                Yield Performance
                            </p>
                            {[
                                { symbol: "USDC", apy: "8.2%", color: "#1B7A4E" },
                                { symbol: "STRK", apy: "12.4%", color: "#C8960A" },
                                { symbol: "ETH", apy: "4.9%", color: "#4A9EB5" },
                            ].map((token) => (
                                <div
                                    key={token.symbol}
                                    className="flex items-center justify-between p-3"
                                    style={{
                                        backgroundColor: token.color + "18",
                                        borderColor: token.color,
                                        borderWidth: "2px",
                                        borderLeft: `5px solid ${token.color}`,
                                    }}
                                >
                                    <span
                                        className="text-sm font-black"
                                        style={{ color: "#0D1B4B" }}
                                    >
                                        {token.symbol}
                                    </span>
                                    <span
                                        className="text-sm font-black"
                                        style={{ color: token.color }}
                                    >
                                        {token.apy} APY
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p
                            className="text-[10px] font-bold text-center"
                            style={{ color: "#4A9EB5" }}
                        >
                            * Indicative rates. Subject to Vesu market conditions.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── PRIVACY SECTION ── */}
            <section
                className="py-20"
                style={{
                    backgroundColor: "#1B7A4E",
                    borderBottom: "5px solid #0D1B4B",
                }}
            >
                <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center gap-12">
                    {/* Visual */}
                    <div
                        className="shrink-0 w-full md:w-72 p-8 space-y-3"
                        style={{
                            backgroundColor: "#0D1B4B",
                            borderColor: "#C8960A",
                            borderWidth: "4px",
                            boxShadow: "10px 10px 0px rgba(13,27,75,0.3)",
                        }}
                    >
                        <p
                            className="text-[10px] font-black uppercase tracking-widest"
                            style={{ color: "#4A9EB5" }}
                        >
                            Private Vault
                        </p>
                        <div
                            className="p-4 text-center space-y-2"
                            style={{
                                backgroundColor: "#1B7A4E1A",
                                borderColor: "#1B7A4E",
                                borderWidth: "2px",
                            }}
                        >
                            <div style={{ color: "#C8960A" }}><ShieldIcon /></div>
                            <p
                                className="text-xs font-black"
                                style={{ color: "#FDFAF4" }}
                            >
                                Active Balance
                            </p>
                            <p
                                className="text-2xl font-black"
                                style={{ color: "#C8960A" }}
                            >
                                ██████
                            </p>
                            <p
                                className="text-[10px] font-bold"
                                style={{ color: "#4A9EB5" }}
                            >
                                Shielded by Tongo
                            </p>
                        </div>
                        {["Private Send", "Fund Vault", "Withdraw"].map((a) => (
                            <div
                                key={a}
                                className="p-2 text-xs font-black text-center"
                                style={{
                                    backgroundColor: "#1B7A4E",
                                    color: "#FDFAF4",
                                    borderColor: "#1B7A4E",
                                    borderWidth: "2px",
                                }}
                            >
                                {a}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 space-y-6">
                        <p
                            className="text-xs font-black uppercase tracking-widest"
                            style={{ color: "#C8960A" }}
                        >
                            Powered by Tongo Protocol
                        </p>
                        <h2
                            className="text-4xl md:text-5xl font-black leading-tight"
                            style={{ color: "#FDFAF4" }}
                        >
                            PRIVATE WHEN
                            <br />
                            <span style={{ color: "#C8960A" }}>YOU NEED IT.</span>
                        </h2>
                        <p
                            className="text-base font-bold leading-relaxed max-w-md"
                            style={{ color: "#FDFAF4", opacity: 0.8 }}
                        >
                            OtterPay integrates Tongo&apos;s confidential transfer
                            protocol. Shield your balances behind a private
                            vault, send without revealing amounts, and
                            withdraw back to your public wallet anytime.
                        </p>
                        <ul className="space-y-2">
                            {[
                                "Separate private key from your wallet",
                                "Confidential balances on-chain",
                                "Private send to Tongo addresses",
                                "Emergency exit back to public wallet",
                            ].map((item) => (
                                <li
                                    key={item}
                                    className="flex items-center gap-3 text-sm font-bold"
                                    style={{ color: "#FDFAF4" }}
                                >
                                    <span
                                        className="shrink-0 w-5 h-5 flex items-center justify-center"
                                        style={{
                                            backgroundColor: "#C8960A",
                                            color: "#0D1B4B",
                                        }}
                                    >
                                        <CheckIcon />
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* ── ZERO FEES STATEMENT ── */}
            <section
                className="py-24 text-center"
                style={{
                    backgroundColor: "#4A9EB5",
                    borderBottom: "5px solid #0D1B4B",
                }}
            >
                <div className="max-w-4xl mx-auto px-6 space-y-6">
                    <h2
                        className="text-6xl md:text-8xl font-black leading-none tracking-tight"
                        style={{
                            color: "#0D1B4B",
                            WebkitTextStroke: "1px #0D1B4B",
                        }}
                    >
                        ZERO
                        <br />
                        <span
                            style={{
                                color: "#FDFAF4",
                                WebkitTextStroke: "3px #0D1B4B",
                            }}
                        >
                            GAS
                        </span>
                        <br />
                        FEES.
                    </h2>
                    <p
                        className="text-xl font-bold max-w-xl mx-auto"
                        style={{ color: "#0D1B4B" }}
                    >
                        Every transaction on OtterPay is fully sponsored.
                        No ETH. No STRK for gas. Just pay.
                    </p>
                    <div className="flex justify-center gap-4 flex-wrap pt-4">
                        <div
                            className="px-6 py-4 space-y-1 text-center"
                            style={{
                                backgroundColor: "#FDFAF4",
                                borderColor: "#0D1B4B",
                                borderWidth: "4px",
                                boxShadow: "6px 6px 0px rgba(13,27,75,0.2)",
                            }}
                        >
                            <p
                                className="text-3xl font-black"
                                style={{ color: "#0D1B4B" }}
                            >
                                $0.00
                            </p>
                            <p
                                className="text-xs font-black uppercase tracking-wider"
                                style={{ color: "#4A9EB5" }}
                            >
                                Gas per tx
                            </p>
                        </div>
                        <div
                            className="px-6 py-4 space-y-1 text-center"
                            style={{
                                backgroundColor: "#0D1B4B",
                                borderColor: "#0D1B4B",
                                borderWidth: "4px",
                                boxShadow: "6px 6px 0px rgba(13,27,75,0.2)",
                            }}
                        >
                            <p
                                className="text-3xl font-black"
                                style={{ color: "#C8960A" }}
                            >
                                ~0.5s
                            </p>
                            <p
                                className="text-xs font-black uppercase tracking-wider"
                                style={{ color: "#4A9EB5" }}
                            >
                                Finality
                            </p>
                        </div>
                        <div
                            className="px-6 py-4 space-y-1 text-center"
                            style={{
                                backgroundColor: "#1B7A4E",
                                borderColor: "#0D1B4B",
                                borderWidth: "4px",
                                boxShadow: "6px 6px 0px rgba(13,27,75,0.2)",
                            }}
                        >
                            <p
                                className="text-3xl font-black"
                                style={{ color: "#FDFAF4" }}
                            >
                                8%+
                            </p>
                            <p
                                className="text-xs font-black uppercase tracking-wider"
                                style={{ color: "#C8960A" }}
                            >
                                APY on idle
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section
                className="py-24"
                style={{
                    backgroundColor: "#C8960A",
                    borderBottom: "5px solid #0D1B4B",
                }}
            >
                <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1 space-y-5">
                        <h2
                            className="text-4xl md:text-6xl font-black leading-tight"
                            style={{ color: "#0D1B4B" }}
                        >
                            READY TO LET
                            <br />
                            YOUR MONEY
                            <br />
                            <span style={{ color: "#FDFAF4", WebkitTextStroke: "2px #0D1B4B" }}>
                                WORK?
                            </span>
                        </h2>
                        <p
                            className="text-base font-bold max-w-sm"
                            style={{ color: "#0D1B4B" }}
                        >
                            No seed phrase required. Log in with your social
                            account and start earning in under 60 seconds.
                        </p>
                        <Link
                            href="/app"
                            className="inline-block text-lg font-black px-10 py-5 transition-all active:scale-95 hover:shadow-2xl"
                            style={{
                                backgroundColor: "#0D1B4B",
                                color: "#C8960A",
                                borderColor: "#0D1B4B",
                                borderWidth: "4px",
                                boxShadow: "10px 10px 0px rgba(13,27,75,0.3)",
                            }}
                        >
                            Launch OtterPay →
                        </Link>
                    </div>
                    <div className="shrink-0">
                        <Image
                            src={mascotImg}
                            alt="OtterPay mascot"
                            width={220}
                            height={270}
                            className="drop-shadow-2xl"
                            style={{
                                width: "auto",
                                height: "auto",
                                filter: "drop-shadow(0 8px 20px rgba(13,27,75,0.3))",
                            }}
                        />
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer
                className="py-12 px-6 md:px-12"
                style={{
                    backgroundColor: "#0D1B4B",
                    borderTop: "4px solid #0D1B4B",
                }}
            >
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
                    <div className="space-y-2">
                        <span
                            className="text-2xl font-black"
                            style={{ color: "#C8960A" }}
                        >
                            Otter<span style={{ color: "#FDFAF4" }}>Pay</span>
                        </span>
                        <p
                            className="text-xs font-bold"
                            style={{ color: "#4A9EB5" }}
                        >
                            Yield-bearing payments on Starknet
                        </p>
                    </div>

                    <div className="flex gap-12">
                        <div className="space-y-3">
                            <p
                                className="text-[10px] font-black uppercase tracking-widest"
                                style={{ color: "#4A9EB5" }}
                            >
                                Product
                            </p>
                            {["Launch App", "How it Works", "Yield"].map(
                                (item) => (
                                    <p key={item}>
                                        <Link
                                            href="/app"
                                            className="text-sm font-bold hover:opacity-70 transition-opacity"
                                            style={{ color: "#FDFAF4" }}
                                        >
                                            {item}
                                        </Link>
                                    </p>
                                ),
                            )}
                        </div>
                        <div className="space-y-3">
                            <p
                                className="text-[10px] font-black uppercase tracking-widest"
                                style={{ color: "#4A9EB5" }}
                            >
                                Built With
                            </p>
                            {["Starknet", "Vesu Finance", "Tongo", "AVNU"].map(
                                (item) => (
                                    <p key={item}>
                                        <span
                                            className="text-sm font-bold"
                                            style={{ color: "#FDFAF4", opacity: 0.6 }}
                                        >
                                            {item}
                                        </span>
                                    </p>
                                ),
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="max-w-6xl mx-auto mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3"
                    style={{ borderTop: "2px solid rgba(74,158,181,0.15)" }}
                >
                    <p
                        className="text-xs font-bold"
                        style={{ color: "#4A9EB5", opacity: 0.6 }}
                    >
                        © 2025 OtterPay. Built on Starknet Mainnet + Sepolia.
                    </p>
                    <p
                        className="text-xs font-bold"
                        style={{ color: "#4A9EB5", opacity: 0.6 }}
                    >
                        Mainnet is live. Sepolia is testing-only and slated for deprecation.
                    </p>
                </div>
            </footer>

            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
}

function ZapIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
    );
}

function TrendingUpIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
        </svg>
    );
}

function LockIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

function LayersIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2" />
            <polyline points="2 17 12 22 22 17" />
            <polyline points="2 12 12 17 22 12" />
        </svg>
    );
}

function ShieldIcon() {
    return (
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
