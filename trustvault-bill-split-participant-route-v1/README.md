# Bill Split Participant Route V1

Fixes the Foundation V1 copied payment-link 404.

Adds the real Next.js dynamic route:

`/bill-split/pay/[billId]/[participantId]`

The page:

- loads the saved Bill Split
- resolves the participant
- shows exact USDC obligation
- shows organizer settlement wallet
- verifies the connected wallet against the expected participant wallet
- intentionally does not move funds yet

Important: Bill Split Foundation V1 stores bills in browser localStorage. A
copied link opened on a different browser/device cannot load the bill yet. That
cross-device persistence problem is addressed separately before public sharing.
