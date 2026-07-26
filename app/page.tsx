export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full max-w-5xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-10 lg:p-16">
        <div className="max-w-3xl space-y-6">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500">
            Built on Arc Network
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
            TrustVault
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-600 sm:text-xl">
            Secure AI Commerce Platform
          </p>
          <p className="max-w-2xl text-base leading-7 text-zinc-600">
            Application scaffold successfully initialized.
          </p>
        </div>
      </section>
    </main>
  );
}
