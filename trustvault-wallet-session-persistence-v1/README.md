# TrustVault Wallet Session Persistence V1

Fixes repeated manual wallet reconnection across navigation, refreshes, and tab reopen.

Uses Wagmi's SSR persistence pattern:
- cookie-backed Wagmi storage;
- cookieToInitialState in the Next.js root layout;
- initialState passed into WagmiProvider;
- reconnectOnMount enabled;
- existing Arc Testnet and injected connector preserved.

Files:
- lib/web3/config.ts
- app/providers.tsx
- app/layout.tsx

Run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-wallet-session-persistence-v1\apply.ps1
```

Then:

```powershell
npm.cmd start
```

Do not commit until the persistence test passes.
