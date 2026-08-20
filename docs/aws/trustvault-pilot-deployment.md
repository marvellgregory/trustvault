# TrustVaultPilot AWS deployment runbook

This runbook prepares the committed authentication, session, customer identity, and protected profile stack for manual AWS deployment. It does not authorize automatic deployment or Console changes.

## Repository evidence and manual confirmations

The repository contains one CommonJS Lambda handler and no SAM, CloudFormation, CDK, Terraform, Serverless Framework, container, layer, or historical packaging configuration. The committed handler exports `handler` from `handler.cjs`, so the expected AWS handler setting is:

```text
handler.handler
```

The code reads `event.requestContext.http`, `event.rawPath`, and returns the HTTP API `cookies` response property. This is evidence for API Gateway HTTP API payload format v2. Confirm the API type, integration payload version, Lambda runtime, architecture, handler setting, and existing health-route integration in AWS before changing anything. The health endpoint is not represented by this handler and must not be overwritten accidentally.

The root application installs `viem` but does not install `@aws-sdk/client-dynamodb`. The repository therefore cannot prove whether the deployed Lambda currently relies on the runtime SDK, a layer, or a separately built package. The deployment package now explicitly bundles both dependencies, eliminating that runtime assumption. Use a supported Node.js 20.x or newer Lambda runtime; confirm the selected runtime supports the pinned packages before deployment.

## Build the Lambda ZIP

From the repository root on Windows PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\package-trustvault-pilot-lambda.ps1
```

Default artifact:

```text
%TEMP%\trustvault-pilot-lambda-package\trustvault-pilot-api.zip
```

The ZIP root contains:

```text
handler.cjs
auth-challenge.cjs
auth-verify.cjs
customer-identity.cjs
session.cjs
customer-profile.cjs
package.json
package-lock.json
```

`handler.cjs` in the ZIP is the generated CommonJS bundle containing the pinned runtime dependencies. The other five `.cjs` files are included as auditable source inputs; `node_modules` is deliberately removed from the final artifact to avoid a slow, oversized many-file ZIP.

Pinned runtime dependencies:

```text
viem 2.55.10
@aws-sdk/client-dynamodb 3.1114.0
```

Tests, `.env*`, Git data, backups, frontend assets, helper scripts, and `trustvault-*` work folders are excluded. Do not upload the staging directory; upload the generated ZIP.

## Lambda configuration manifest

Confirm or configure manually:

| Setting | Required value |
| --- | --- |
| Handler | `handler.handler` |
| Runtime | Supported Node.js 20.x or newer |
| Table | `TrustVaultPilot` in the Lambda region/account |
| `TRUSTVAULT_AUTH_DOMAIN` | Canonical TrustVault authentication domain; hostname only, no whitespace |
| `TRUSTVAULT_WEB_ORIGIN` | One exact HTTPS frontend origin, including scheme and optional non-default port, with no path |

No secret value belongs in the ZIP. These variables are configuration, not signing credentials. Review existing Lambda variables before publishing so unrelated historical configuration is retained.

## Least-privilege IAM policy

Replace the placeholders with the deployed region and AWS account ID. Do not use `Resource: "*"`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TrustVaultPilotTableAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:TransactWriteItems"
      ],
      "Resource": "arn:aws:dynamodb:<REGION>:<ACCOUNT_ID>:table/TrustVaultPilot"
    }
  ]
}
```

Keep the Lambda execution role's existing CloudWatch Logs permissions. Capture the previous policy document before updating it.

## API Gateway routes

All routes target the Lambda integration:

| Method | Route |
| --- | --- |
| POST | `/account/auth/challenge` |
| POST | `/account/auth/verify` |
| GET | `/account/session` |
| POST | `/account/logout` |
| GET | `/account/profile` |
| PATCH | `/account/profile` |

Confirm the historical health route and integration independently. Do not replace or redirect it merely because it is absent from this source handler.

### Credentialed CORS

Configure API Gateway and the Lambda consistently:

- Allowed origin: exactly the production `TRUSTVAULT_WEB_ORIGIN` value.
- Allow credentials: `true`.
- Allowed methods: `GET, POST, PATCH, OPTIONS`.
- Allowed headers: at minimum `Content-Type`; include `Accept` if the gateway requires an explicit list.
- Never combine credentialed CORS with `Access-Control-Allow-Origin: *`.
- Forward `Origin` and `Cookie` request headers to Lambda.
- Forward the Lambda HTTP API v2 `cookies` response as `Set-Cookie`.
- Do not cache `/account/session`, `/account/profile`, `/account/logout`, or authentication responses across users.
- Ensure preflight `OPTIONS` is handled by API Gateway without stripping the exact-origin credential headers.

If the deployed gateway is REST API rather than HTTP API v2, the Lambda `cookies` response property is not sufficient by itself. Confirm whether REST API multi-value `Set-Cookie` mapping is required before deployment.

## DynamoDB TTL

Enable TTL on the existing table using this exact attribute:

```text
expiresAtEpoch
```

This cleans up expired challenge and session records. Authentication code already checks expiration on every request; TTL deletion is asynchronous and is cleanup only, never the authorization boundary. Enabling TTL does not alter customer profile or wallet association records because they do not carry this expiration attribute.

## Pre-deployment capture

Before modifying AWS, record or download:

1. Current Lambda code ZIP, published version/alias, runtime, architecture, handler, timeout, memory, environment variables, layers, and execution role.
2. Current IAM inline/managed policy documents.
3. API type, stage, payload format, routes, integrations, authorizers, CORS configuration, and custom domain mappings.
4. DynamoDB table ARN, keys, billing mode, encryption, PITR/backups, streams, and TTL state.
5. Current frontend origin and `NEXT_PUBLIC_TRUSTVAULT_API_BASE_URL` deployment value without placing values in this repository.

Publish a new Lambda version after upload and move an alias only after smoke tests. Avoid editing an unversioned production function without a recoverable prior package.

## Deployment verification sequence

Use a non-production wallet on Arc Testnet and a cookie-aware browser or HTTP client. Never paste session cookies, signatures, or private wallet material into logs or tickets.

1. **Lambda load:** invoke a known route and confirm there is no module-load, handler-resolution, missing-dependency, or environment error.
2. **Challenge:** `POST /account/auth/challenge` with the connected wallet, chain `5042002`, and `AUTHENTICATE_ACCOUNT`; expect `201`.
3. **Challenge persistence:** inspect the exact `AUTH_CHALLENGE#<id>/CHALLENGE` item. Confirm `PENDING`, expiry, wallet, and chain; confirm no signature or customer/session authority.
4. **Exact signing:** sign the response's `message` byte-for-byte in the qualified wallet. Do not reconstruct it.
5. **Verification/cookie:** `POST /account/auth/verify`; expect `200`, verified wallet/customer response, and a `Secure; HttpOnly; SameSite=None` `Set-Cookie` header.
6. **Customer identity:** confirm `CUSTOMER#<customerId>/PROFILE`, `WALLET#<address>/ASSOCIATION`, and the customer wallet association exist and agree.
7. **Session storage:** confirm `SESSION#<64-hex-digest>/SESSION` is active and contains customer, wallet, Arc chain, timestamps, and method metadata. Confirm the raw 43-character cookie token and signature are absent.
8. **Session restore:** with the cookie jar, `GET /account/session`; expect the same customer and wallet. Without the cookie, expect `401`.
9. **Profile read:** `GET /account/profile`; expect only safe profile fields and no PK/SK, session identifier, security metadata, challenge, or wallet authority.
10. **Profile update:** `PATCH /account/profile` with one allowed field; expect `200`. Confirm `updatedAt` changes and unrelated DynamoDB attributes remain.
11. **Logout:** `POST /account/logout`; expect `200`, a clearing `Set-Cookie`, and server session status `REVOKED`.
12. **Revocation enforcement:** retry session/profile reads with the revoked cookie; expect `401`.
13. **Origin enforcement:** repeat a credentialed request with a different `Origin`; expect rejection and no wildcard CORS response.
14. **Arc enforcement:** request a challenge with a non-`5042002` chain; expect rejection.
15. **Browser flow:** from the production frontend, authenticate, refresh `/account`, load/update the AWS profile, change/disconnect wallets, and log out. Confirm cookies work without exposing credentials to JavaScript.

## Rollback

1. Point the Lambda alias/integration back to the captured previous published version, or upload the saved prior ZIP with its original handler/runtime configuration.
2. Restore the previous environment-variable set exactly; do not remove unrelated variables.
3. Restore the captured IAM policy document. Do not remove table permissions until traffic is back on code that does not require them.
4. Restore previous API routes, integrations, CORS, and stage deployment/custom-domain mapping.
5. Leave DynamoDB customer, wallet, challenge, and session records intact. New records are backward-compatible single-table items; deleting them is not required for code rollback.
6. If necessary, revoke sessions created during the failed release by conditionally updating only selected `SESSION#.../SESSION` records. Do not scan/delete customer partitions as a rollback mechanism.
7. Re-run the previous health and browser smoke tests.

TTL may remain enabled during rollback because it affects only items containing `expiresAtEpoch`. If disabling it is operationally required, remember that disabling TTL does not immediately restore already deleted items.

## Post-deployment security checklist

- [ ] No `.env`, private key, seed/recovery phrase, or secret entered the ZIP.
- [ ] No signature or challenge message is persisted beyond the designed challenge fields; signatures are never logged.
- [ ] No raw session cookie token is persisted; only its SHA-256 digest is stored.
- [ ] Cookie is `Secure`, `HttpOnly`, host-only, and has the intended `SameSite` policy.
- [ ] CORS origin exactly matches production; credentials are enabled without wildcard origin.
- [ ] `Origin`, `Cookie`, and `Set-Cookie` forwarding work end to end.
- [ ] Session/profile responses are not shared-user cached.
- [ ] Protected authorization derives customer identity only from the server session resolver.
- [ ] Browser `customerId`, wallet, URL, query, and local-storage identity cannot authorize protected data.
- [ ] IAM is restricted to the `TrustVaultPilot` table ARN.
- [ ] CloudWatch logs contain no cookies, signatures, challenge messages, request bodies, or internal DynamoDB items.
- [ ] Wrong-origin, missing-cookie, expired, revoked, mismatched-customer, and mismatched-wallet requests fail closed.
