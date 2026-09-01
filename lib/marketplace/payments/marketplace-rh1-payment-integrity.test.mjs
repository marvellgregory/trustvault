import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(
        new URL(
          `../../../${specifier.slice(2)}.ts`,
          import.meta.url,
        ).href,
        context,
      );
    }

    if (
      specifier.startsWith("./") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.includes("/lib/")
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});

const reviewContract = await import(
  "./marketplace-payment-review.ts"
);
const assets = await import(
  "../../arc/arc-testnet-assets.ts"
);

const payer =
  "0x1111111111111111111111111111111111111111";
const otherPayer =
  "0x2222222222222222222222222222222222222222";
const recipient =
  "0x3333333333333333333333333333333333333333";
const otherRecipient =
  "0x4444444444444444444444444444444444444444";

function order(overrides = {}) {
  const base = {
    id: "order-rh1",
    orderNumber: "TV-RH1",
    buyer: { walletAddress: payer },
    payment: {
      payerWallet: payer,
      recipientWallet: recipient,
      chainId: assets.ARC_TESTNET_CHAIN_ID,
      asset: "USDC",
      amount: {
        amount: "12.345678",
        currency: "USDC",
      },
    },
  };

  return {
    ...base,
    ...overrides,
    buyer: {
      ...base.buyer,
      ...overrides.buyer,
    },
    payment: {
      ...base.payment,
      ...overrides.payment,
      amount: {
        ...base.payment.amount,
        ...overrides.payment?.amount,
      },
    },
  };
}

function readiness(overrides = {}) {
  return {
    status: "TRANSACTION_READY",
    account: payer,
    chainId: assets.ARC_TESTNET_CHAIN_ID,
    providerIdentityKey: "provider:selected",
    qualificationGeneration: "generation:1",
    evaluatedAt: "2026-09-01T00:00:00.000Z",
    reasons: [],
    ...overrides,
  };
}

function currentInput(review, overrides = {}) {
  const activeOrder =
    overrides.order ?? order();

  return {
    review,
    order: activeOrder,
    readiness:
      overrides.readiness ?? readiness(),
    connectedAddress:
      overrides.connectedAddress ?? payer,
    chainId:
      overrides.chainId ??
      assets.ARC_TESTNET_CHAIN_ID,
    recipientWallet:
      overrides.recipientWallet ??
      activeOrder.payment.recipientWallet,
    asset:
      overrides.asset ??
      activeOrder.payment.asset,
    tokenAddress:
      overrides.tokenAddress ??
      assets.ARC_TESTNET_USDC_ADDRESS,
    amount:
      overrides.amount ??
      activeOrder.payment.amount.amount,
  };
}

test("review snapshot binds the selected payer to the order buyer", () => {
  const review =
    reviewContract.createMarketplacePaymentReviewSnapshot(
      order(),
      readiness(),
    );

  assert.equal(review.payerWallet.toLowerCase(), payer);
  assert.equal(review.amountBaseUnits, "12345678");
  assert.equal(
    review.tokenAddress.toLowerCase(),
    assets.ARC_TESTNET_USDC_ADDRESS.toLowerCase(),
  );
  assert.ok(Object.isFrozen(review));

  assert.throws(() =>
    reviewContract.createMarketplacePaymentReviewSnapshot(
      order({
        buyer: { walletAddress: otherPayer },
      }),
      readiness(),
    ),
  );
});

test("unchanged reviewed payment passes the pre-submission contract", () => {
  const review =
    reviewContract.createMarketplacePaymentReviewSnapshot(
      order(),
      readiness(),
    );

  assert.doesNotThrow(() =>
    reviewContract.assertMarketplacePaymentReviewCurrent(
      currentInput(review),
    ),
  );
});

test("wallet and provider changes after review fail closed", () => {
  const review =
    reviewContract.createMarketplacePaymentReviewSnapshot(
      order(),
      readiness(),
    );

  const cases = [
    { connectedAddress: otherPayer },
    {
      readiness: readiness({ account: otherPayer }),
    },
    {
      readiness: readiness({
        providerIdentityKey: "provider:other",
      }),
    },
    {
      readiness: readiness({
        qualificationGeneration: "generation:2",
      }),
    },
    {
      readiness: readiness({
        status: "INVALIDATED",
      }),
    },
  ];

  for (const changes of cases) {
    assert.throws(() =>
      reviewContract.assertMarketplacePaymentReviewCurrent(
        currentInput(review, changes),
      ),
    );
  }
});

test("chain, recipient, amount, asset and token mutations fail closed", () => {
  const review =
    reviewContract.createMarketplacePaymentReviewSnapshot(
      order(),
      readiness(),
    );

  const cases = [
    { chainId: 1 },
    {
      order: order({
        payment: {
          recipientWallet: otherRecipient,
        },
      }),
    },
    { recipientWallet: otherRecipient },
    {
      order: order({
        payment: {
          amount: { amount: "12.345679" },
        },
      }),
    },
    { amount: "12.345679" },
    { asset: "ETH" },
    { tokenAddress: otherRecipient },
    {
      review: {
        ...review,
        tokenAddress: otherRecipient,
      },
    },
  ];

  for (const changes of cases) {
    assert.throws(() =>
      reviewContract.assertMarketplacePaymentReviewCurrent({
        ...currentInput(review, changes),
        ...(changes.review
          ? { review: changes.review }
          : {}),
      }),
    );
  }
});

test("checkout uses selected transaction-ready identity without ambient provider access", async () => {
  const checkout = await readFile(
    new URL(
      "../../../components/marketplace/checkout/ProtectedCheckoutPage.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    checkout,
    /transactionReadiness\.authority\.assertCurrent\(\)/,
  );
  assert.match(checkout, /walletAddress:\s*wallet\.account/);
  assert.doesNotMatch(checkout, /window\.ethereum/);
  assert.doesNotMatch(checkout, /eth_accounts/);
  assert.doesNotMatch(checkout, /readWalletContext/);
});

test("submission preflight runs before the existing wallet send path", async () => {
  const source = await readFile(
    new URL(
      "../../../lib/app-kit/send-marketplace-payment.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.ok(
    source.indexOf("assertMarketplacePaymentReviewCurrent") <
      source.indexOf("sendGiftVault({"),
  );
  assert.match(
    source,
    /readinessAuthority\.assertCurrent\(\)/,
  );
  assert.match(
    source,
    /reviewedPayment\.amountBaseUnits/,
  );
});

test("confirmation uses the saved reviewed transfer evidence", async () => {
  const source = await readFile(
    new URL(
      "./complete-marketplace-payment.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    source,
    /expectedSender: reviewedPayment\.payerWallet/,
  );
  assert.match(
    source,
    /expectedRecipient: reviewedPayment\.recipientWallet/,
  );
  assert.match(
    source,
    /BigInt\(reviewedPayment\.amountBaseUnits\)/,
  );
  assert.doesNotMatch(
    source,
    /expectedSender: order\.buyer/,
  );
});

test("RH.1 production paths add no autonomous signing authority", async () => {
  const sources = await Promise.all([
    "../../../components/marketplace/checkout/ProtectedCheckoutPage.tsx",
    "../../../components/marketplace/payment-review/MarketplacePaymentApprovalCard.tsx",
    "../../../lib/app-kit/send-marketplace-payment.ts",
    "./marketplace-payment-review.ts",
    "./complete-marketplace-payment.ts",
  ].map((path) =>
    readFile(new URL(path, import.meta.url), "utf8"),
  ));

  const production = sources.join("\n");

  for (const forbidden of [
    "personal_sign",
    "eth_signTypedData",
    "eth_sendTransaction",
    "privateKey",
    "seedPhrase",
  ]) {
    assert.doesNotMatch(production, new RegExp(forbidden, "i"));
  }
});
