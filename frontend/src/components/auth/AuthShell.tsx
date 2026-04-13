import Link from "next/link";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import React from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerNote: React.ReactNode;
  helper?: React.ReactNode;
};

const mockMetrics = [
  { label: "Receipts", value: "1,284", accent: "bg-cyan-400" },
  { label: "Issues", value: "412", accent: "bg-emerald-400" },
  { label: "On Hand", value: "26.4k", accent: "bg-amber-300" },
];

const AuthShell = ({
  title,
  subtitle,
  children,
  footerNote,
  helper,
}: AuthShellProps) => {
  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_28%),linear-gradient(180deg,_#eef2ff_0%,_#f8fafc_48%,_#e2e8f0_100%)]">
      <div className="h-4 w-full bg-slate-800" />
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_40px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="grid min-h-[720px] w-full grid-cols-1 gap-3 rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] lg:grid-cols-[1.06fr_0.94fr] lg:p-5">
            <section className="flex min-h-[640px] flex-col rounded-[1.35rem] bg-white px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
              <div className="flex items-center justify-between">
                <Link
                  href="/login"
                  className="flex items-center gap-3 text-slate-900 transition hover:opacity-80"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,_#312e81,_#4f46e5)] text-white shadow-lg shadow-indigo-300/30">
                    <LockKeyhole className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-lg font-semibold tracking-tight">
                      OMDS Inventory
                    </span>
                    <span className="block text-xs text-slate-500">
                      Secure access and audit workflows
                    </span>
                  </span>
                </Link>
                <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500 sm:block">
                  Zimbabwe HQ Operations
                </div>
              </div>

              <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
                <div className="text-center">
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                    {title}
                  </h1>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {subtitle}
                  </p>
                </div>

                <div className="mt-8">{children}</div>

                {helper ? <div className="mt-6">{helper}</div> : null}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <span>Copyright © 2026 Omari Management Data Services</span>
                <span>{footerNote}</span>
              </div>
            </section>

            <aside className="relative hidden overflow-hidden rounded-[1.35rem] bg-[linear-gradient(160deg,_#312e81_0%,_#4338ca_48%,_#4f46e5_100%)] p-10 text-white lg:flex lg:flex-col">
              <div className="absolute inset-0 opacity-30">
                <div className="absolute -left-16 top-10 h-52 w-52 rounded-full border border-white/20" />
                <div className="absolute right-8 top-0 h-72 w-72 rounded-full border border-white/10" />
                <div className="absolute bottom-8 left-10 h-80 w-80 rounded-[4rem] border border-white/10" />
                <div className="absolute inset-x-10 bottom-12 h-40 rounded-[2rem] border border-dashed border-white/10" />
              </div>

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-white/80">
                  <ShieldCheck className="h-4 w-4" />
                  Inventory Control
                </div>

                <h2 className="mt-10 max-w-md text-5xl font-semibold leading-tight tracking-tight">
                  Keep every receipt, handover, and audit trail accountable.
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-indigo-100/90">
                  Sign in to manage receiving, stock movement, branch issue-outs,
                  and document review from one operational workspace.
                </p>
              </div>

              <div className="relative z-10 mt-12 grid gap-4">
                <div className="grid grid-cols-3 gap-3">
                  {mockMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-3xl border border-white/15 bg-white/12 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.2)] backdrop-blur-md"
                    >
                      <div className={`h-1.5 w-9 rounded-full ${metric.accent}`} />
                      <p className="mt-5 text-2xl font-semibold">{metric.value}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-indigo-100/75">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-[2rem] border border-white/15 bg-white/12 p-5 shadow-[0_30px_100px_rgba(15,23,42,0.24)] backdrop-blur-md">
                  <div className="grid grid-cols-[1.2fr_0.8fr] gap-4">
                    <div className="rounded-[1.5rem] bg-white p-4 text-slate-900">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Recent Activity
                          </p>
                          <p className="mt-1 text-xl font-semibold">
                            Stores Operations
                          </p>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                          Live
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {[
                          ["Receipt Logged", "12 Zebra scanners received", "Pending review"],
                          ["Issue Out", "3 laptops dispatched to Bulawayo", "Acknowledgement pending"],
                          ["Audit Queue", "2 receipts missing documents", "Needs action"],
                        ].map(([label, value, status]) => (
                          <div
                            key={label}
                            className="rounded-2xl border border-slate-100 px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-slate-700">{label}</p>
                              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                                {status}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[1.6rem] border border-white/20 bg-white/14 p-4 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.18em] text-indigo-100/70">
                          Compliance
                        </p>
                        <p className="mt-4 text-4xl font-semibold">94%</p>
                        <p className="mt-2 text-sm text-indigo-100/80">
                          Documentation accuracy across the last 30 days.
                        </p>
                      </div>

                      <div className="rounded-[1.6rem] border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                        <p className="text-xs uppercase tracking-[0.18em] text-indigo-100/70">
                          Queue Health
                        </p>
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {[78, 58, 86].map((height, index) => (
                            <div
                              key={height}
                              className="flex h-28 items-end rounded-2xl bg-white/8 p-2"
                            >
                              <div
                                className={`w-full rounded-xl ${
                                  index === 0
                                    ? "bg-cyan-300"
                                    : index === 1
                                      ? "bg-violet-300"
                                      : "bg-emerald-300"
                                }`}
                                style={{ height: `${height}%` }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
