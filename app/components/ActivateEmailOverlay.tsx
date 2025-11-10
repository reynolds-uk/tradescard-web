"use client";

type Props = {
  email: string;
  info?: string;
  onResend?: () => void;
  canResend?: boolean;
  countdown?: number;     // seconds left until next resend
  resending?: boolean;
};

export default function ActivateEmailOverlay({
  email,
  info,
  onResend,
  canResend = false,
  countdown = 0,
  resending = false,
}: Props) {
  const canClick = !!onResend && canResend && !resending;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Activate your account"
    >
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-amber-400/30 bg-neutral-950 p-6 text-neutral-100 shadow-2xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path
              fill="currentColor"
              d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm2 0v.3l7 4.2 7-4.2V7H5zm14 2.7-7 4.2-7-4.2V17h14V9.7z"
            />
          </svg>
        </div>

        <h1 className="text-center text-xl font-semibold">Check your email to activate</h1>

        <p className="mt-2 text-center">
          We’ve sent a secure sign-in link to{" "}
          <span className="font-mono">{email}</span>. Click it to confirm your account — then return
          here to finish setup.
        </p>

        {info ? (
          <p className="mt-2 text-center text-neutral-300 text-sm">{info}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={canClick ? onResend : undefined}
            disabled={!canClick}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/15 disabled:opacity-50"
          >
            {resending
              ? "Sending…"
              : countdown > 0
              ? `Resend link in ${countdown}s`
              : "Resend link"}
          </button>

          <a
            href="/join?mode=join&free=1"
            className="text-sm text-neutral-300 underline underline-offset-4 hover:text-white"
          >
            Use a different email
          </a>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-500">
          Tip: check your spam or promotions folder if it hasn’t arrived within a minute.
        </p>
      </div>
    </div>
  );
}