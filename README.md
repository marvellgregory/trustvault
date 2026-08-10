# TrustVault

## Programmable USDC for Everyday Money Moments on Arc

TrustVault is a programmable payments and commerce application built on **Arc Testnet**.

Instead of treating USDC as only a wallet-to-wallet transfer, TrustVault explores how programmable digital dollars can support everyday financial interactions: shopping, instant gifting, time-locked gifting, shared expenses, transaction review, onchain verification, and digital receipts.

> **Hackathon build:** TrustVault currently operates on Arc Testnet using test USDC. Testnet assets have no real-world value.

---

## Live Demo

**Application:** https://trustvault-finance.vercel.app

**Network:** Arc Testnet  
**Settlement asset:** USDC

---

## The Problem

Sending digital dollars is straightforward.

Real money interactions are often more expressive:

- Send USDC to someone now.
- Gift USDC but make it claimable at a specific future date and time.
- Split a shared expense between several people.
- Purchase something while reviewing exactly what the wallet is being asked to approve.
- Track payment progress after a transaction is submitted.
- Give users a verifiable record of what happened.

TrustVault turns these situations into consumer-friendly programmable USDC workflows.

---

# Core Experiences

## 1. Gift Vault — Send Now

TrustVault supports direct USDC gifting on Arc Testnet.

### Flow

```text
Recipient
   ↓
Amount
   ↓
Optional message
   ↓
Transaction review
   ↓
Wallet verification
   ↓
Arc Testnet verification
   ↓
Explicit user approval
   ↓
USDC transfer
   ↓
Arc confirmation
   ↓
Transaction proof
```

The transfer only occurs after the connected wallet presents the transaction for user approval.

---

## 2. Timed Gift Vault

Timed Gift Vault demonstrates programmable money beyond a standard transfer.

A sender chooses:

- recipient
- USDC amount
- exact unlock date
- exact unlock time
- timezone
- optional message

TrustVault converts the selected schedule into a canonical unlock timestamp and presents the transaction for review.

### Transaction Flow

```text
Recipient
   ↓
Amount
   ↓
Unlock date + time + timezone
   ↓
Canonical unlock timestamp
   ↓
Transaction review
   ↓
Wallet + Arc verification
   ↓
USDC allowance check
   ↓
USDC approval when required
   ↓
Gift Vault contract transaction
   ↓
Gift ID derived from onchain event
   ↓
Gift locked
   ↓
Recipient claims at/after unlock
   ↓
Receipt + ArcScan verification
```

### Deployed Gift Vault Contract

```text
0x98a85fc032A985E3A267573Cce57378C464fFB86
```

### Arc Testnet USDC

```text
0x3600000000000000000000000000000000000000
```

The application distinguishes between transaction submission and confirmed onchain state and avoids creating replacement gifts while an existing transaction is awaiting confirmation.

---

## 3. Bill Split

TrustVault supports shared-expense settlement using Arc Testnet USDC.

A bill organizer can create an expense, define participants, and distribute individual payment responsibilities.

### Flow

```text
Create bill
   ↓
Enter total
   ↓
Add participants
   ↓
Equal or custom allocation
   ↓
Review
   ↓
Create participant payment links
   ↓
Participant opens payment request
   ↓
Wallet + Arc verification
   ↓
Explicit participant approval
   ↓
USDC settlement
   ↓
Payment status update
   ↓
Receipt
```

Each participant remains responsible for approving their own wallet transaction.

TrustVault tracks the state of the bill and its individual participant payments rather than treating the entire bill as one opaque transaction.

---

## 4. Marketplace

TrustVault also demonstrates a commerce experience around Arc Testnet USDC.

### Marketplace Flow

```text
Marketplace
   ↓
Product
   ↓
Cart
   ↓
Checkout
   ↓
Delivery information
   ↓
Order created
   ↓
Payment Review
   ↓
Wallet verification
   ↓
Arc Testnet verification
   ↓
Settlement details
   ↓
Explicit wallet approval
   ↓
USDC transaction
   ↓
Order / transaction state
   ↓
Receipt
```

The Marketplace includes product browsing, product details, cart management, checkout, saved orders, payment review, transaction state, and receipt infrastructure.

The current hackathon build demonstrates **testnet settlement**.

Any Marketplace escrow presentation should be interpreted as eligibility or future product direction unless backed by a verified deployed escrow transaction flow.

---

# Transaction Review

A major TrustVault design principle is:

> **Review first. Sign second.**

Before supported money-moving actions, TrustVault presents transaction information such as:

- connected wallet
- network
- recipient or settlement destination
- USDC amount
- transaction type
- unlock schedule where applicable
- estimated or relevant transaction information
- approval requirements

The wallet remains the final approval boundary.

---

# Transaction Activity

TrustVault includes a unified activity experience for supported Marketplace, Gift Vault, and Bill Split activity.

Instead of leaving users with only a wallet popup, TrustVault maintains application-level transaction states that can represent stages such as:

```text
Prepared
→ Awaiting approval
→ Submitted
→ Pending confirmation
→ Confirmed
→ Receipt available
```

Where transaction hashes are available, users can move from TrustVault to the corresponding public ArcScan record.

---

# Receipts and Verification

Supported confirmed transactions can generate TrustVault receipts containing information such as:

- transaction type
- amount
- network
- transaction status
- transaction hash or transaction proof
- ArcScan access
- QR verification where available
- timestamp
- testnet disclosure

For timed gifts, the receipt can also identify the onchain Gift ID and unlock schedule.

This creates a bridge between a consumer-friendly application experience and publicly verifiable blockchain activity.

---

# Why Arc?

TrustVault is designed around programmable USDC experiences.

Arc Testnet provides the environment in which the current hackathon implementation demonstrates:

- USDC transfers
- smart-contract-based timed gifts
- wallet-controlled transaction approval
- onchain transaction confirmation
- publicly verifiable transaction records

The application is deliberately explicit that the current deployment is a **testnet prototype**.

---

# Architecture

```text
                         TRUSTVAULT
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
     Marketplace          Gift Vault          Bill Split
          │                   │                   │
          │          ┌────────┴────────┐          │
          │          │                 │          │
          │       Send Now        Timed Gift      │
          │                            │           │
          └──────────────┬─────────────┴───────────┘
                         │
                  Transaction Review
                         │
                  Wallet Verification
                         │
                  Arc Verification
                         │
                  Explicit Approval
                         │
                      Arc Testnet
                         │
                        USDC
                         │
              Transaction / Contract
                         │
                 Confirmation State
                         │
              ┌──────────┴──────────┐
              │                     │
           Activity              Receipt
                                    │
                                 ArcScan
```

---

# Gift Vault Contract Architecture

```text
Sender Wallet
      │
      │ approve USDC
      ▼
Arc Testnet USDC
      │
      │ createGift(...)
      ▼
TrustVault Gift Vault Contract
      │
      ├── recipient
      ├── amount
      ├── unlock timestamp
      ├── claimed state
      └── onchain Gift ID
              │
              │ after unlock
              ▼
        Recipient Claim
              │
              ▼
             USDC
```

---

# Technology

TrustVault currently uses technologies including:

- Next.js
- React
- TypeScript
- viem
- Arc Testnet
- USDC
- wallet-based transaction signing
- Circle-related application infrastructure where implemented
- Vercel

---

# Application Routes

The current application includes:

```text
/
├── account
├── marketplace
│   └── product/[id]
├── cart
├── checkout
├── payment-review
├── orders/[id]
├── gift-vault
│   ├── manage
│   ├── manage/[id]
│   └── claim/[id]
├── bill-split
│   ├── manage/[id]
│   ├── pay/[billId]/[participantId]
│   └── receipt/[id]
├── receipts
├── receipt/[id]
├── dashboard
└── wishlist
```

---

# Transaction Safety Principles

TrustVault's current transaction UX follows several principles.

### Human approval

Money-moving actions require explicit wallet approval.

### Review before execution

Supported transaction details are presented before the user signs.

### Network verification

Transaction flows verify Arc Testnet where applicable.

### Recipient verification

The destination is surfaced before approval.

### Observable transaction state

Submitted, pending, and confirmed states are distinguished where supported.

### Duplicate-transaction protection

Critical flows avoid silently replacing a transaction that has already been broadcast and is still awaiting confirmation.

### Public verification

Supported confirmed transactions expose ArcScan verification.

### Testnet transparency

The interface and receipts identify Arc Testnet activity and disclose that testnet assets have no real-world value.

---

# Best Hackathon Demo Path

The strongest TrustVault demonstration is **Timed Gift Vault** because it shows programmable USDC rather than only a standard transfer.

### Recommended sequence

```text
1. Connect wallet
2. Open Gift Vault
3. Choose Timed Gift
4. Enter recipient
5. Enter USDC amount
6. Choose exact unlock date + time
7. Review transaction
8. Check funding / allowance
9. Approve USDC if required
10. Approve Gift Vault transaction
11. Show pending → confirmed state
12. Show onchain Gift ID
13. Open ArcScan
14. Show TrustVault receipt / QR verification
15. Show recipient claim experience
```

Then demonstrate:

1. **Send Now** — direct Arc Testnet USDC transfer
2. **Bill Split** — multi-participant payment lifecycle
3. **Marketplace** — checkout and transaction review
4. **Activity** — unified transaction history
5. **Receipts** — user-friendly onchain proof

---

# What Is Working Today

The hackathon prototype currently demonstrates:

- Arc Testnet wallet verification
- Arc Testnet network verification
- direct USDC gifting
- deployed onchain timed Gift Vault
- exact unlock scheduling
- USDC allowance checking
- USDC approval flow
- Gift Vault contract creation
- onchain Gift ID handling
- recipient claim experience
- Gift Vault management
- Bill Split creation and participant flows
- Bill Split USDC settlement workflow
- Marketplace catalog and product pages
- cart and checkout
- Marketplace payment review
- Marketplace testnet settlement workflow
- saved orders
- transaction activity
- digital receipts
- transaction hash handling
- ArcScan verification
- QR-based verification where available
- explicit testnet disclosures

---

# Current Scope and Roadmap

TrustVault is a hackathon-stage testnet application, not a production financial service.

Potential future development includes:

- production-network deployment
- verified Marketplace escrow contracts
- seller infrastructure
- expanded persistent customer accounts
- enhanced receipt sharing
- additional commerce workflows
- mobile experiences
- Atlas AI assistance
- human-approved agentic transaction assistance

Any future AI transaction capability is intended to preserve explicit human authorization for money-moving actions.

---

# Local Development

Clone the repository:

```bash
git clone https://github.com/marvellgregory/trustvault.git
cd trustvault
```

Install dependencies:

```bash
npm install
```

Start development:

```bash
npm run dev
```

Create local environment configuration where required.

Example:

```env
NEXT_PUBLIC_MARKETPLACE_SETTLEMENT_WALLET=<Arc-Testnet-wallet-address>
```

Never commit wallet private keys, seed phrases, or other secrets.

---

# Production Build

Run:

```bash
npm run build
```

At the current hackathon checkpoint, the application passes the Next.js production build and TypeScript validation.

---

# Repository

**GitHub:** https://github.com/marvellgregory/trustvault

**Live application:** https://trustvault-finance.vercel.app

---

# TrustVault

### Gift. Shop. Split. Verify.

**Programmable USDC experiences built on Arc Testnet.**