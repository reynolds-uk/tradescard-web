export default function CheckoutCancel() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Checkout cancelled</h1>
      <p className="mt-2 text-sm text-neutral-400">
        No charge has been made. You can choose a plan again below.
      </p>
      <div className="mt-6">
        <a
          href="/join"
          className="inline-flex items-center rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
        >
          Back to join
        </a>
      </div>
    </div>
  );
}