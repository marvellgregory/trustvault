"use client";

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

import {
  fetchTrustVaultAwsHealth,
  type TrustVaultAwsHealth,
} from "@/lib/aws/health";

type HealthState =
  | { status: "loading" }
  | { status: "success"; health: TrustVaultAwsHealth }
  | { status: "failure" };

export default function AwsHealthPage() {
  const [state, setState] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    let active = true;

    fetchTrustVaultAwsHealth()
      .then((health) => {
        if (active) {
          setState({ status: "success", health });
        }
      })
      .catch(() => {
        if (active) {
          setState({ status: "failure" });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <section className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Development only
        </p>
        <h1 className="mt-2 text-3xl font-bold text-zinc-950">
          AWS backend health
        </h1>

        {state.status === "loading" && (
          <p className="mt-8 text-zinc-600" role="status">
            Checking the TrustVault AWS backend…
          </p>
        )}

        {state.status === "failure" && (
          <div
            className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800"
            role="alert"
          >
            <p className="font-semibold">AWS backend health check failed</p>
            <p className="mt-1 text-sm">
              The frontend could not confirm a healthy backend connection.
            </p>
          </div>
        )}

        {state.status === "success" && (
          <div className="mt-8" role="status">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 font-semibold text-emerald-800">
              AWS backend connection healthy
            </p>
            <dl className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200">
              {[
                ["Service", state.health.service],
                ["Environment", state.health.environment],
                ["Database", state.health.database],
                [
                  "Database connected",
                  state.health.databaseConnected ? "Yes" : "No",
                ],
                ["Timestamp", state.health.timestamp ?? "Not provided"],
              ].map(([label, value]) => (
                <div
                  className="grid gap-1 px-5 py-4 sm:grid-cols-2"
                  key={label}
                >
                  <dt className="font-medium text-zinc-600">{label}</dt>
                  <dd className="break-words text-zinc-950">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </section>
    </main>
  );
}
