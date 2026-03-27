# StarkPay: Product Architecture & Build Document
A yield-bearing payment mini-app powered by Starkzap SDK
Version 1.0 • March 2026

---

## 1. Executive Summary
StarkPay is a consumer fintech mini-app modelled on the Opay experience. Users can send and receive tokens via their Privy wallet address, and every idle balance automatically earns yield through Vesu lending — so money is never sitting still.

The product is built entirely on the **Starkzap SDK**, which abstracts all blockchain complexity. Users interact with a familiar web2-style interface (email login, no seed phrases, no gas fees) while the app runs on Starknet L2 under the hood.

### GOAL
Ship a production-grade, yield-bearing payment app in days, not months, using Starkzap's modular money toolkit.

### 1.1 Core Value Propositions
- **Send & receive any supported token** to any Privy wallet address instantly.
- **Idle balances auto-earn yield** via Vesu (Starknet's lending protocol).
- **Zero gas UX**: AVNU paymaster absorbs all transaction fees.
- **Social login** (email, Google, phone) — no wallet extensions, no seed phrases.
- **Fully non-custodial**: Privy manages keys server-side; the user owns their wallet.

### 1.2 Target Users
| User Segment | Description |
| :--- | :--- |
| **Everyday senders** | People who want to send stablecoins to friends or family quickly |
| **Savers** | Users who want idle USDC/STRK to earn passive income without DeFi complexity |
| **Merchants (v2)** | Small businesses accepting stablecoin payments with auto-yield on float |
| **Web3 newcomers** | Anyone migrating from Opay, Kuda, or similar apps who wants crypto benefits without crypto complexity |

---

## 2. Product Overview

### 2.1 Feature List (v1.0)
| Feature | Description | Starkzap Module |
| :--- | :--- | :--- |
| **Onboarding / Auth** | Sign up with email or Google, wallet created automatically | Privy + PrivySigner |
| **Dashboard / Home** | Balance display, current yield rate, recent transactions | Token module |
| **Send tokens** | Enter recipient Privy address + amount, send instantly | Token module (ERC20 transfer) |
| **Receive tokens** | Display own Privy address as QR or copyable string | Privy wallet address |
| **Yield dashboard** | Live APY display, accumulated earnings, Vesu position size | Lending module (Vesu) |
| **Transaction history** | Full on-chain history with status and confirmations | Token module |
| **Gasless transactions** | All txns sponsored — users never touch gas | AVNU Paymaster |

### 2.2 User Flows
#### Send Money Flow
1. User taps 'Send'
2. Enters recipient Privy address (or scans QR)
3. Enters token + amount
4. **SDK**: withdraws required amount from Vesu lending position
5. **SDK**: executes ERC20 transfer to recipient address
6. **AVNU paymaster** covers gas fee — user sees $0 fee
7. Confirmation screen shows transaction hash

#### Receive Money Flow
1. User taps 'Receive'
2. App displays Privy wallet address as QR code + copyable text
3. Sender initiates transfer to that address
4. **Incoming balance** auto-deposited into Vesu lending position
5. User sees updated balance + new yield accrual

#### Yield Flow (background, automatic)
1. User has idle USDC balance in wallet
2. On deposit (or balance increase), **SDK** calls Vesu `supply()`
3. Vesu allocates tokens to lending pool, APY begins accruing
4. On next send, **SDK** calls Vesu `withdraw()` before ERC20 transfer
5. **Net UX**: balance always shows total (principal + yield)

---

## 3. System Architecture

The architecture is composed of five layers: the frontend (React Native / Next.js), the Starkzap SDK integration, Privy auth, Starknet L2, and the external DeFi protocols. Each layer has a clear boundary and responsibility.

### 3.1 Architecture Layers
| Layer | Responsibility |
| :--- | :--- |
| **Frontend** | UI, navigation, state management, user input (React Native / Next.js) |
| **Starkzap SDK** | All blockchain operations: wallets, tokens, yield, gas |
| **Privy** | Authentication, embedded wallet creation, key management |
| **Starknet L2** | Smart contract execution, on-chain settlement, account abstraction |
| **Vesu** | Lending pool: supply, borrow, yield accrual for idle balances |
| **AVNU Paymaster** | Gas fee sponsorship for all user transactions |

### 3.2 Starkzap SDK Module Map
| SDK Module | Usage in StarkPay |
| :--- | :--- |
| **PrivySigner** | Authenticates users and signs all transactions server-side via Privy embedded wallet |
| **Token module (ERC20)** | `send()`, `receive()`, `balanceOf()` for USDC, STRK, and other tokens |
| **Lending module (Vesu)** | `supply()` on deposit, `withdraw()` before each send, read accrued yield |
| **AVNU Paymaster** | Configured at SDK init; all transactions are gasless for end users |
| **WalletInterface** | Unified abstraction; app never calls Starknet directly, always through this |
| **StarkZap core** | Network config (mainnet/testnet), RPC provider, module orchestration |

### 3.3 Data Flow Diagram (Textual)
**FLOW**: User action → React component → Starkzap SDK method → PrivySigner signs → AVNU paymaster wraps → Starknet executes → Vesu/ERC20 state updated → UI reflects new balance

### 3.4 Wallet & Identity Model
Each user gets exactly one Privy embedded wallet on sign-up. This wallet address is their permanent identifier in the system.
- One wallet per user, created on first login.
- Privy stores keys on their secure servers (fully non-custodial).
- No seed phrase shown during onboarding — fully web2-style UX.

---

## 4. Technology Stack

### 4.1 Frontend
| Technology | Purpose |
| :--- | :--- |
| **React Native (Expo)**| Primary mobile app |
| **Next.js (optional)** | Web version of the app |
| **Tailwind CSS** | Styling |
| **Zustand / Redux** | Client-side state |
| **React Query** | Server state, balance polling, yield rate fetching |
| **Expo Router** | Navigation |

### 4.2 Blockchain / SDK
| Technology | Purpose |
| :--- | :--- |
| **starkzap (npm)** | Core SDK: wallets, tokens, lending, gasless transactions |
| **@privy-io/react-auth**| Privy React SDK for social login |
| **starknet.js** | Low-level Starknet RPC calls (used internally by Starkzap) |
| **AVNU Paymaster** | Gas sponsorship service |
| **Vesu** | On-chain lending protocol for yield generation |

### 4.3 Backend (minimal)
The backend handles push notifications, user profile metadata, analytics, and rate limiting.
- **Node.js + Fastify**
- **PostgreSQL** (User profiles)
- **Redis** (Session caching)
- **Firebase / Expo Push**
- **Infura / Alchemy** (Starknet RPC)

### 4.4 Infrastructure
- **Vercel / EAS**: Deployment and CI/CD
- **Railway / Render**: Backend API hosting
- **Sentry**: Error monitoring
- **PostHog**: Product analytics

---

## 5. Data Model

### 5.1 On-chain data (read via Starkzap SDK)
- Wallet balance: `ERC20.balanceOf(userAddress)`
- Vesu position: `supplyBalance(userAddress, poolId)`
- Transaction history: on-chain events filtered by address
- Current APY: read from Vesu pool contract

### 5.2 Off-chain data (PostgreSQL)
| Table | Fields |
| :--- | :--- |
| **users** | `id`, `privy_user_id`, `privy_wallet_address`, `display_name`, `avatar_url`, `created_at` |
| **notification_settings**| `user_id`, `push_token`, `send_alerts`, `receive_alerts`, `yield_alerts` |
| **app_events** | `user_id`, `event_type`, `metadata`, `timestamp` |

---

## 6. Key Implementation Details

### 6.1 SDK Initialisation
```typescript
import { StarkZap, PrivySigner } from 'starkzap';
const signer = new PrivySigner({ privyAppId: PRIVY_APP_ID, user: privyUser });
const zap = new StarkZap({ network: 'mainnet', signer, paymaster: { type: 'avnu', apiKey: AVNU_KEY } });
```

### 6.2 Yield Auto-Deposit on Receive
When a user receives tokens, the app listens for incoming transfer events and calls Vesu `supply()`.
- **Listen**: `zap.token.onTransferReceived(callback)`
- **On trigger**: `zap.lending.supply({ token: 'USDC', amount: incomingAmount })`

### 6.3 Atomic Send with Yield Withdrawal
Starkzap's transaction builder batches the withdrawal and transfer into a single multicall.
- **Step 1**: `zap.lending.withdraw({ token: 'USDC', amount: sendAmount })`
- **Step 2**: `zap.token.transfer({ to: recipientAddress, token: 'USDC', amount: sendAmount })`
- **Batch**: `zap.tx.batch([step1, step2])`

### 6.4 Balance Display
`displayBalance = walletBalance + vesuSupplyBalance + accruedYield`

---

## 7. Build Phases & Milestones
| Phase | Milestone | Duration |
| :--- | :--- | :--- |
| **Phase 0** | Setup: Privy, AVNU, Starkzap | 1 day |
| **Phase 1** | Auth: social login, dashboard skeleton | 2–3 days |
| **Phase 2** | Send + Receive: transfers, QR, history | 3–5 days |
| **Phase 3** | Yield: Vesu supply/withdraw, APY widget | 3–5 days |
| **Phase 4** | Gasless: AVNU live | 1–2 days |
| **Phase 5** | QA: Testnet testing | 3–4 days |
| **Phase 6** | Launch: Production deployment | 2–3 days |

**TOTAL**: 15–23 days

---

## 8. Monetisation Strategy
- **Yield spread**: Show slightly lower APY than Vesu market rate.
- **Premium tier**: High yield share, higher limits, instant transfers.
- **FX / swap fee**: Small spread on token swaps (v2).
- **Float income**: Interest earned on platform float.

---

## 9. Security & Compliance
- Private keys never touch your servers.
- All transactions require biometric or email confirmation.
- AVNU paymaster keys must be stored server-side.
- Rate limit SDK calls to prevent paymaster budget drainage.
- **Compliance**: Review Privy's ToS and local regulations for token transfers.

---

## 10. References & Resources
- [Starkzap overview](https://starkzap.io)
- [Starkzap SDK docs](https://docs.starknet.io/build/starkzap/overview)
- [Starkzap GitHub](https://github.com/keep-starknet-strange/starkzap)
- [Privy docs](https://docs.privy.io)
- [Vesu lending docs](https://vesu.xyz)
- [AVNU paymaster](https://avnu.fi)
- [Starknet developer docs](https://docs.starknet.io)
