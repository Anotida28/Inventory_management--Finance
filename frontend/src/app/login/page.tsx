"use client";

import AuthShell from "@/components/auth/AuthShell";
import { clearAuthSession, setAuthSession } from "@/lib/authSession";
import { setCredentials } from "@/services/authSlice";
import {
  useGetAuthBootstrapStatusQuery,
  useLoginMutation,
} from "@/services/api";
import { useAppDispatch } from "@/services/store";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

const resolveNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/")) {
    return "/dashboard";
  }

  return value;
};

const getMutationErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return "Unable to sign in right now.";
};

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [login, { isLoading }] = useLoginMutation();
  const { data: bootstrapStatus } = useGetAuthBootstrapStatusQuery();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);

  const nextPath = useMemo(
    () => resolveNextPath(searchParams.get("next")),
    [searchParams]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError(null);
    setHelperMessage(null);

    try {
      const auth = await login({
        username: identifier,
        password,
      }).unwrap();

      dispatch(setCredentials(auth));
      setAuthSession(rememberMe);
      router.replace(nextPath);
    } catch (error) {
      clearAuthSession();
      setSubmitError(getMutationErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with the same bearer-token flow used by the Inventory API. Your session will unlock the full receiving and stock workspace."
      footerNote={<span>Privacy policy available on request.</span>}
      helper={
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Password resets and account lifecycle management are controlled by your
          inventory administrator.
        </div>
      }
    >
      {bootstrapStatus?.requiresSetup ? (
        <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No administrator account exists yet.{" "}
          <Link className="font-semibold underline" href="/register">
            Create the first account
          </Link>{" "}
          before attempting to sign in.
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Username or email
          </label>
          <div className="relative">
            <UserCircle2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClassName} pl-11`}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="om526127 or name@company.com"
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${inputClassName} pl-11 pr-12`}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Keep me signed in on this device
          </label>
          <button
            type="button"
            className="font-medium text-indigo-600 transition hover:text-indigo-700"
            onClick={() =>
              setHelperMessage(
                "Password resets are handled by your administrator until a dedicated recovery flow is added."
              )
            }
          >
            Forgot your password?
          </button>
        </div>

        {submitError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        {helperMessage ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            {helperMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#3730a3,_#4f46e5)] px-4 py-3.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-indigo-500/25 disabled:translate-y-0 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Log in
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.22em] text-slate-300">
        <span className="h-px flex-1 bg-slate-200" />
        <span>Alternative sign-in</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {["Google SSO", "Apple SSO"].map((label) => (
          <button
            key={label}
            type="button"
            disabled
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-400"
          >
            {label} coming soon
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        {bootstrapStatus?.requiresSetup ? (
          <>
            Need to initialize the system?{" "}
            <Link href="/register" className="font-semibold text-indigo-600">
              Create the first administrator
            </Link>
          </>
        ) : (
          <>
            Need an account?{" "}
            <span className="font-semibold text-slate-700">
              Ask your administrator to create one from the Users page.
            </span>
          </>
        )}
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <AlertCircle className="h-4 w-4 shrink-0 text-indigo-500" />
        API auth endpoint: <code className="font-mono text-slate-700">POST /api/auth/login</code>
      </div>
    </AuthShell>
  );
}
