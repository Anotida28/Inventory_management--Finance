"use client";

import AuthShell from "@/components/auth/AuthShell";
import { setCurrentUser } from "@/services/authSlice";
import { useGetAuthBootstrapStatusQuery, useLoginMutation } from "@/services/api";
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
  const { data: bootstrapStatus } = useGetAuthBootstrapStatusQuery();
  const [login, { isLoading }] = useLoginMutation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const nextPath = useMemo(
    () => resolveNextPath(searchParams.get("next")),
    [searchParams]
  );

  if (bootstrapStatus?.requiresSetup) {
    return (
      <AuthShell
        fitScreen
        title="Create the first administrator"
        subtitle="This workspace is running against a fresh database, so there is no account to sign in with yet."
        footerNote={
          <Link href="/register" className="font-medium text-indigo-600">
            Continue to setup
          </Link>
        }
        helper={
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
            The first registered account becomes <strong>SUPER_ADMIN</strong> and
            can create the rest of the team later from the Users page.
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  Setup required before sign-in
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  The login error is happening because the backend currently has
                  zero users. Create the first administrator account once, then
                  return to normal sign-in.
                </p>
              </div>
            </div>

            <Link
              href="/register"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#3730a3,_#4f46e5)] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20"
            >
              Go to initial setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError(null);

    try {
      const auth = await login({
        username: identifier,
        password,
        rememberMe,
      }).unwrap();

      dispatch(setCurrentUser(auth.user));
      router.replace(nextPath);
    } catch (error) {
      setSubmitError(getMutationErrorMessage(error));
    }
  };

  return (
    <AuthShell
      fitScreen
      title="Welcome back"
      subtitle="Sign in to access receiving, stock, and operations workflows."
      footerNote={<span>Privacy policy available on request.</span>}
    >
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

        {submitError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        <label className="inline-flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Keep me signed in for this browser
        </label>

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
    </AuthShell>
  );
}
