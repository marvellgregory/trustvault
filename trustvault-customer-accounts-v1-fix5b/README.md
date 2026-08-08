# TrustVault Customer Accounts V1 — Fix 5B

Fix 5 failed because its patcher required an exact multiline whitespace match.

Fix 5B is the same intended UI correction, but uses targeted, whitespace-tolerant edits and limits changes specifically to the `WalletsTab` section.

It removes the stale second-save path:

- `Add wallet` already persists the new wallet immediately.
- `Save wallet list` could persist stale React state over the newly saved profile.
- Fix 5B removes the second wallet save callback and button.
- The remaining action becomes **Add & save wallet**.
- Profile Settings retains its own `Save profile` behavior.

## Apply

Stop `npm run dev` first, then:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\trustvault-customer-accounts-v1-fix5b\apply.ps1
```

Then:

```powershell
npm.cmd run dev
```

Test:

Add wallet -> click only **Add & save wallet** -> refresh -> reconnect same wallet -> Saved wallets.

Do not commit until it survives refresh.
