"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Card, CardBody, CardHeader, CardTitle } from "@frontend/components/ui/Card";
import { Spinner } from "@frontend/components/ui/Spinner";
import { cn } from "@frontend/lib/cn";

interface SignInViewProps {
  googleEnabled: boolean;
}

const inputClass =
  "w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 shadow-sm placeholder:text-brand-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60";

export function SignInView({ googleEnabled }: SignInViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (!result) {
        toast.error("Sign-in failed. Please try again.");
        return;
      }
      if (result.error) {
        toast.error("Invalid email or password.");
        return;
      }
      router.push((result.url ?? callbackUrl) as never);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setOauthLoading(true);
    // signIn redirects on success; on failure it returns and we re-enable.
    await signIn("google", { callbackUrl });
    setOauthLoading(false);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <p className="mt-1 text-sm text-brand-600">
            Sign in to your Pido Rich Tracker.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          {errorParam ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              We couldn&apos;t sign you in. Make sure your email is on the allowlist.
            </div>
          ) : null}

          {googleEnabled ? (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={oauthLoading || submitting}
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-medium text-brand-900 shadow-sm transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {oauthLoading ? <Spinner /> : <GoogleMark />}
                Continue with Google
              </button>
              <div className="relative py-1 text-center text-xs uppercase tracking-wide text-brand-400">
                <span className="bg-white px-2">or</span>
                <div className="absolute left-0 right-0 top-1/2 -z-10 border-t border-brand-100" />
              </div>
            </>
          ) : null}

          <form onSubmit={handleCredentials} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-brand-800">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-brand-800">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner /> : null}
              Sign in
            </button>
          </form>

          <p className="pt-2 text-center text-sm text-brand-600">
            Don&apos;t have an account?{" "}
            <Link
              href={{ pathname: "/register", query: { callbackUrl } }}
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              Create one
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.5 19 12.5 24 12.5c2.9 0 5.5 1.1 7.5 2.9l5.7-5.7C33.6 6.4 29.1 4.5 24 4.5 16.4 4.5 9.8 8.7 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-5c-1.8 1.3-4.1 2-6.9 2-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.7 39.3 16.3 43.5 24 43.5z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.5l6 5c-.4.4 6.6-4.8 6.6-14.5 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
