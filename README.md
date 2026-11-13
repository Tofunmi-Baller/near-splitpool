# 💰 SplitPool — Group Money, Simple Rules

> **NEAR Hackathon 2026 — Track 12: Social Money**

SplitPool is a group finance app where friends, roommates, and small teams create shared wallets with **programmable spending rules**. Think Splitwise meets a mini-DAO — built for normal people, not crypto natives.

## The Problem

Splitting money with groups is painful. Venmo tracks IOUs. Splitwise calculates splits. But neither **enforces rules** — there's no way to say "anyone can spend up to $50, but bigger expenses need group approval." That's what smart contracts enable that existing apps can't.

## How It Works

```
Create Pool → Set Rules → Deposit (any token) → Spend → Vote → Settle
```

1. **Create a pool** — name it, invite members by NEAR account
2. **Set programmable rules** — personal spend limits, vote thresholds, category budgets, lockout
3. **Deposit funds** — via NEAR Intents, any token auto-swaps to USDC
4. **Request spends** — under your limit? Auto-approved. Over? Goes to group vote.
5. **Vote transparently** — see who voted what, in real-time
6. **Settle up** — one-click settlement calculates and executes who owes who

## The Rules Engine (The Differentiator)

Each pool has configurable rules, set by the creator and enforced automatically:

| Rule | What It Does |
|------|-------------|
| **Personal Spend Limit** | Spend up to $X without approval (e.g., $50) |
| **Vote Threshold** | Spends above the limit need N member approvals |
| **Category Budgets** | Caps per category (food, transport, entertainment) |
| **Pool Lockout** | Creator can freeze all spending instantly |

## NEAR Ecosystem Integrations

- **NEAR Intents (1Click)** — deposit in any token, auto-swapped to USDC
- **Sputnik DAO patterns** — governance/voting logic for spend approvals
- **Chain Signatures** — cross-chain deposit support
- **Trezu** — stablecoin settlement routing

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite + React 18 + TypeScript + Tailwind CSS |
| Backend | Express + better-sqlite3 |
| Payments | NEAR Intents (simulation mode for demo) |
| Identity | NEAR wallet connection |

## Quick Start

```bash
# Install dependencies
npm run setup
npm install

# Run both frontend and backend
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Demo Mode

```bash
# Start the server first
npm run dev:server

# In another terminal, run the scripted demo
npm run demo
```

The demo runs the full loop: create pool → add members → deposit funds → request spend (auto-approved) → request spend (needs votes) → vote → approve → settle up.

Or click **"Seed Demo"** in the app header to populate a sample pool with realistic data.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React UI  │────▶│  Express API │────▶│   SQLite    │
│  (Vite)     │◀────│  Port 3001   │◀────│   (local)   │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────▼───────┐
                    │ Rules Engine │
                    │ + NEAR Sim   │
                    └──────────────┘
```

**Rules Engine** evaluates every spend request against the pool's rules:
- Check personal limit → auto-approve or escalate
- Check category budget → reject if over budget
- Determine votes needed → create pending request

**NEAR Simulation** provides realistic transaction behavior:
- Generates base58-style tx hashes
- Simulates token swaps (NEAR→USDC at market-ish rates)
- Adds realistic network delays (800-1500ms)
- All simulated data clearly labeled

## Key Screens

| Screen | Purpose |
|--------|---------|
| **Home** | Your pools at a glance |
| **Pool Dashboard** | Balance, members, transactions, pending votes |
| **Spend Request** | Submit a spend with amount, description, category |
| **Vote** | Approve/reject with real-time vote tally |
| **Rules Editor** | Configure all pool rules in a clean UI |
| **Settle Up** | Calculate and execute who owes who |
| **Ledger** | Full transaction history with filters |

## Simulation Disclosure

This demo uses simulation mode for NEAR blockchain interactions. Simulated operations include:
- Wallet connections (uses testnet account patterns)
- Token deposits and swaps (realistic amounts and fees)
- Transaction hashes (generated, not on-chain)
- Settlement transfers

All simulated data is clearly labeled with a `[simulated]` badge in the UI and API responses.

## Why SplitPool for NEAR

- **Real social problem** — group money management is broken
- **NEAR-native angle** — programmable rules are what smart contracts enable
- **Consumer UX** — feels like Venmo, not a DAO dashboard
- **Intents-powered** — any token deposits via NEAR 1Click
- **Adoption driver** — social use cases bring normal people to NEAR

---

Built for NEAR Hackathon 2026 · Track 12: Social Money
