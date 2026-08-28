"use client";

import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { useEffect, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { arcTestnet } from "viem/chains";
import {
  useAccount,
  usePublicClient,
} from "wagmi";

import type { GiftData } from "@/components/gift-vault/types";
import {
  ARC_TESTNET_USDC_ADDRESS,
  TRUSTVAULT_GIFT_VAULT_ADDRESS,
  usdcAbi,
} from "@/lib/gift-vault/contract";

type FundingState = {
  allowance: bigint;
  balance: bigint;
  required: bigint;
};

export function EstimateCard({
  data,
}: {
  data: GiftData;
}) {
  const { address, chainId, isConnected } =
    useAccount();
  const publicClient = usePublicClient();

  const [funding, setFunding] =
    useState<FundingState | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [loading, setLoading] =
    useState(false);

  const isArc = chainId === arcTestnet.id;

  useEffect(() => {
    const resetFunding = window.setTimeout(() => {
      setFunding(null);
      setError(null);
    }, 0);

    return () => {
      window.clearTimeout(resetFunding);
    };
  }, [address, chainId, data.amount]);

  async function handleCheck() {
    if (
      !address ||
      !publicClient ||
      !isConnected ||
      !isArc
    ) {
      setError(
        "Connect your wallet on Arc Testnet before checking vault funding.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const required = parseUnits(
        data.amount.trim(),
        6,
      );

      const [allowance, balance] =
        await Promise.all([
          publicClient.readContract({
            address:
              ARC_TESTNET_USDC_ADDRESS,
            abi: usdcAbi,
            functionName: "allowance",
            args: [
              address,
              TRUSTVAULT_GIFT_VAULT_ADDRESS,
            ],
          }),
          publicClient.readContract({
            address:
              ARC_TESTNET_USDC_ADDRESS,
            abi: usdcAbi,
            functionName: "balanceOf",
            args: [address],
          }),
        ]);

      setFunding({
        allowance,
        balance,
        required,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Vault funding could not be checked.",
      );
    } finally {
      setLoading(false);
    }
  }

  const approvalRequired =
    funding &&
    funding.allowance < funding.required;

  const hasBalance =
    funding &&
    funding.balance >= funding.required;

  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
          <LockKeyhole
            aria-hidden="true"
            className="h-5 w-5"
          />
        </span>

        <div>
          <p className="text-sm font-semibold text-zinc-950">
            Onchain vault funding check
          </p>

          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Check the connected wallet&apos;s USDC
            balance and whether the timed Gift Vault
            contract already has enough allowance.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheck}
        disabled={
          !isConnected ||
          !isArc ||
          loading
        }
        className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <LoaderCircle
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
          />
        ) : (
          <LockKeyhole
            aria-hidden="true"
            className="h-4 w-4"
          />
        )}
        {loading
          ? "Checking…"
          : "Check vault funding"}
      </button>

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <CircleAlert
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-rose-700"
          />
          <p className="text-xs leading-5 text-rose-800">
            {error}
          </p>
        </div>
      )}

      {funding && (
        <div className="mt-5">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2
              aria-hidden="true"
              className="h-4 w-4"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.12em]">
              Funding check complete
            </p>
          </div>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">
                Wallet USDC
              </dt>
              <dd className="mt-2 text-lg font-semibold text-zinc-950">
                {formatUnits(
                  funding.balance,
                  6,
                )}{" "}
                USDC
              </dd>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <dt className="text-xs text-zinc-500">
                Approval
              </dt>
              <dd className="mt-2 text-sm font-semibold text-zinc-950">
                {approvalRequired
                  ? "Wallet approval required"
                  : "Allowance sufficient"}
              </dd>
            </div>
          </dl>

          {!hasBalance && (
            <p className="mt-4 text-xs leading-5 text-rose-700">
              The connected wallet does not have
              enough Arc Testnet USDC for this gift.
            </p>
          )}

          {approvalRequired && hasBalance && (
            <p className="mt-4 text-xs leading-5 text-amber-700">
              Creating this gift will first request
              one USDC approval transaction, followed
              by the Gift Vault contract transaction.
            </p>
          )}

          {!approvalRequired && hasBalance && (
            <p className="mt-4 text-xs leading-5 text-emerald-700">
              The current allowance is sufficient.
              Creating the gift should require only
              the Gift Vault contract transaction.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
