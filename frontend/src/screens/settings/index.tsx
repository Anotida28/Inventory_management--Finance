"use client";

import Header from "@/components/Header";
import { useGetOperationsOverviewQuery } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/services/store";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/services/uiSlice";
import {
  ArrowRight,
  Boxes,
  ClipboardCheck,
  LayoutPanelLeft,
  MoonStar,
  ShieldCheck,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";

const formatDateTime = (value?: string) => {
  if (!value) {
    return "No recorded sign-in yet";
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return value;
  }

  return parsedValue.toLocaleString();
};

const PreferenceToggle = ({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: () => void;
}) => {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-slate-50/70 px-4 py-4">
      <div>
        <p className="font-medium text-gray-800">{label}</p>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <label className="inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={onChange}
        />
        <div className="relative h-6 w-11 rounded-full bg-gray-300 transition peer-focus:ring-4 peer-focus:ring-blue-100 peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-200 after:bg-white after:transition-all after:content-['']" />
      </label>
    </div>
  );
};

const Settings = () => {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const { data: overview } = useGetOperationsOverviewQuery();

  const canManageUsers =
    currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";

  const quickLinks = [
    {
      href: "/dashboard",
      label: "Operations Dashboard",
      description: "Check live audit alerts, activity, and document exceptions.",
    },
    {
      href: "/receiving",
      label: "Receiving Register",
      description: "Capture new receipts and clear pending document work.",
    },
    {
      href: "/inventory",
      label: "HQ Stock",
      description: "Review stock on hand, location balances, and low-stock items.",
    },
    {
      href: canManageUsers ? "/users" : "/suppliers",
      label: canManageUsers ? "User Administration" : "Suppliers",
      description: canManageUsers
        ? "Add teammates and review role coverage."
        : "Review supplier contacts and delivery coverage.",
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div>
        <Header name="Settings" />
        <p className="mt-1 text-sm text-gray-500">
          Review your account context, workspace preferences, and operational
          controls in one place.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-blue-100 bg-blue-50 p-3">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Account Snapshot
              </h2>
              <p className="text-sm text-gray-500">
                Live session details from the authenticated account.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                Full Name
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {currentUser?.name ?? "Unknown user"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                Username
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {currentUser?.username ?? "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                Email
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {currentUser?.email ?? "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                Role
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {currentUser?.role ?? "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                Status
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {currentUser?.status ?? "-"}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-100 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                Last Login
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-800">
                {formatDateTime(currentUser?.lastLogin)}
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-sm text-emerald-800">
            Sessions are server-managed and restored from the backend on app
            load instead of being trusted from browser storage.
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-blue-100 bg-blue-50 p-3">
                <LayoutPanelLeft className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Workspace Preferences
                </h2>
                <p className="text-sm text-gray-500">
                  Local controls stored for your current browser session.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <PreferenceToggle
                checked={isSidebarCollapsed}
                onChange={() =>
                  dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))
                }
                label="Compact Navigation"
                description="Collapse the left navigation to give operational pages more working space."
              />
              <PreferenceToggle
                checked={isDarkMode}
                onChange={() => dispatch(setIsDarkMode(!isDarkMode))}
                label="Dark Mode Preference"
                description="Keep your preferred theme available even after refreshing the browser."
              />
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-amber-100 bg-amber-50 p-3">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Access Guidance
                </h2>
                <p className="text-sm text-gray-500">
                  Role-based expectations for the current account.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl border border-gray-100 bg-slate-50/70 px-4 py-3">
                `SUPER_ADMIN` and `ADMIN` accounts can manage users and oversee
                operational controls.
              </div>
              <div className="rounded-2xl border border-gray-100 bg-slate-50/70 px-4 py-3">
                `USER` accounts can work through receiving, HQ stock, suppliers,
                and issue-out workflows.
              </div>
              <div className="rounded-2xl border border-gray-100 bg-slate-50/70 px-4 py-3">
                `VIEWER` accounts should be limited to observation and audit
                visibility.
              </div>
            </div>
          </div>
        </div>
      </div>

      {overview ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-500">Pending Issues</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-800">
              {overview.pendingIssues}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <TriangleAlert className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-gray-500">Document Exceptions</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-800">
              {overview.documentExceptions}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <Boxes className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-500">HQ Units On Hand</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-800">
              {overview.hqUnitsOnHand}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <MoonStar className="h-5 w-5 text-slate-600" />
              <p className="text-sm text-gray-500">Active Suppliers</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-gray-800">
              {overview.activeSuppliers}
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Quick Actions</h2>
            <p className="text-sm text-gray-500">
              Jump back into the workflows most likely to need attention.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-2xl border border-gray-100 bg-slate-50/70 p-4 transition hover:border-blue-200 hover:bg-blue-50/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-800">{link.label}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    {link.description}
                  </p>
                </div>
                <ArrowRight className="mt-0.5 h-5 w-5 text-gray-400 transition group-hover:text-blue-600" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
