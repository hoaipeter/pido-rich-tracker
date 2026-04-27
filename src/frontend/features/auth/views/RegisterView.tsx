"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Card, CardBody, CardHeader, CardTitle } from "@frontend/components/ui/Card";
import { Spinner } from "@frontend/components/ui/Spinner";
import { authApi } from "@frontend/features/auth/api-client";
import { friendlyErrorMessage } from "@frontend/lib/error-messages";
import { registerSchema } from "@shared/auth/schemas";

const inputClass =
  "w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-brand-900 shadow-sm placeholder:text-brand-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60";

export function RegisterView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        name: flat.name?.[0] ?? "",
        email: flat.email?.[0] ?? "",
        password: flat.password?.[0] ?? "",
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await authApi.register(parsed.data);
      // Auto-login on successful registration so the user lands on / signed in.
      const result = await signIn("credentials", {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error || !result) {
        toast.success("Account created. Please sign in.");
        router.push("/signin" as never);
        return;
      }
      router.push((result.url ?? callbackUrl) as never);
      router.refresh();
    } catch (error) {
      // Friendly catalog handles EMAIL_NOT_ALLOWED, EMAIL_TAKEN,
      // TOO_MANY_REQUESTS, network failures, and the generic fallback.
      toast.error(friendlyErrorMessage(error, "Registration failed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <p className="mt-1 text-sm text-brand-600">
            Your email must be on the allowlist to register.
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-brand-800">Name</span>
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
              />
              {errors.name ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.name}</span>
              ) : null}
            </label>
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
              {errors.email ? (
                <span className="mt-1 block text-xs text-rose-600">{errors.email}</span>
              ) : null}
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-brand-800">Password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-brand-500">
                At least 12 characters with uppercase, lowercase, and a digit.
              </span>
              {errors.password ? (
                <span className="mt-1 block text-xs text-rose-600">
                  {errors.password}
                </span>
              ) : null}
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Spinner /> : null}
              Create account
            </button>
          </form>
          <p className="pt-4 text-center text-sm text-brand-600">
            Already have an account?{" "}
            <Link
              href={{ pathname: "/signin", query: { callbackUrl } }}
              className="font-medium text-brand-700 hover:text-brand-800"
            >
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
