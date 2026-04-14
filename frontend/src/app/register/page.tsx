"use client";

import AuthShell from "@/components/auth/AuthShell";
import { setCurrentUser } from "@/services/authSlice";
import {
  useGetAuthBootstrapStatusQuery,
  useRegisterInitialUserMutation,
} from "@/services/api";
import { useAppDispatch } from "@/services/store";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

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

  return "Unable to create the initial account.";
};

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { data: bootstrapStatus, isLoading: isLoadingStatus } =
    useGetAuthBootstrapStatusQuery();
  const [registerInitialUser, { isLoading: isRegistering }] =
    useRegisterInitialUserMutation();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const externalAuthEnabled = bootstrapStatus?.authMode === "external";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError(null);

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    try {
      const auth = await registerInitialUser({
        name,
        username,
        email,
        password,
        rememberMe,
      }).unwrap();

      dispatch(setCurrentUser(auth.user));
      router.replace("/dashboard");
    } catch (error) {
      setSubmitError(getMutationErrorMessage(error));
    }
  };

  if (isLoadingStatus) {
    return (
      <AuthShell
        title="Preparing setup"
        subtitle="Checking whether the Inventory Management System has already been initialized."
        footerNote={<span>Bootstrap status is loading.</span>}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
          Loading bootstrap status...
        </div>
      </AuthShell>
    );
  }

  if (externalAuthEnabled) {
    return (
      <AuthShell
        title="Registration is handled externally"
        subtitle="This workspace uses Active Directory plus the Omari allow list, so new users are provisioned by signing in with approved corporate credentials."
        footerNote={
          <Link href="/login" className="font-medium text-indigo-600">
            Return to login
          </Link>
        }
      >
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                No local password setup is required
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ask IT to confirm the user exists in Active Directory and that
                the username has been added to the Omari allow list. The app
                will create or refresh the local profile automatically on the
                first successful login.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-500">
            <AlertCircle className="h-4 w-4 shrink-0 text-indigo-500" />
            Authentication provider:{" "}
            <strong className="text-slate-800">
              {bootstrapStatus?.providerLabel ?? "Active Directory"}
            </strong>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#3730a3,_#4f46e5)] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20"
          >
            Back to login
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (!bootstrapStatus?.requiresSetup) {
    return (
      <AuthShell
        title="System already initialized"
        subtitle="A first administrator account has already been created for this inventory workspace."
        footerNote={
          <>
            <Link href="/login" className="font-medium text-indigo-600">
              Return to login
            </Link>
          </>
        }
      >
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">
                Setup is complete
              </p>
              <p className="text-sm text-slate-500">
                Sign in with an existing account or ask an administrator to create
                a new user from the Users page.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-xs text-slate-500">
            <AlertCircle className="h-4 w-4 shrink-0 text-indigo-500" />
            The first account automatically becomes <strong className="text-slate-800">SUPER_ADMIN</strong>.
          </div>

          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#3730a3,_#4f46e5)] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/20"
          >
            Back to login
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create the first administrator"
      subtitle="No seeded users are required. This one-time setup creates the initial SUPER_ADMIN account for the application."
      footerNote={
        <>
          <Link href="/login" className="font-medium text-indigo-600">
            Back to login
          </Link>
        </>
      }
      helper={
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
          The first registered account receives full administrator access and can
          create the rest of the team from the Users screen later.
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              className={inputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tariro Moyo"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              className={inputClassName}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="tmoyo"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Work email
            </label>
            <input
              type="email"
              className={inputClassName}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tariro.moyo@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                className={`${inputClassName} pr-12`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
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

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <input
              className={inputClassName}
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-500">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Keep the administrator signed in on this device
        </label>

        {submitError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isRegistering}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#3730a3,_#4f46e5)] px-4 py-3.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:translate-y-[-1px] hover:shadow-xl hover:shadow-indigo-500/25 disabled:translate-y-0 disabled:opacity-60"
        >
          {isRegistering ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating administrator...
            </>
          ) : (
            <>
              Create administrator
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <AlertCircle className="h-4 w-4 shrink-0 text-indigo-500" />
        Bootstrap endpoint:{" "}
        <code className="font-mono text-slate-700">POST /api/auth/register</code>
      </div>
    </AuthShell>
  );
}
