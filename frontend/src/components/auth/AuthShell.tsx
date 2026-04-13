import Link from "next/link";
import Image from "next/image";
import React from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footerNote: React.ReactNode;
  helper?: React.ReactNode;
  fitScreen?: boolean;
};

const AuthShell = ({
  title,
  subtitle,
  children,
  footerNote,
  helper,
  fitScreen = false,
}: AuthShellProps) => {
  const shellHeightClass = fitScreen
    ? "min-h-[calc(100dvh-1rem)] py-4"
    : "min-h-[calc(100vh-1rem)] py-8";

  const panelHeightClass = fitScreen
    ? "min-h-[560px] lg:min-h-[calc(100dvh-6rem)]"
    : "min-h-[720px]";

  const sectionHeightClass = fitScreen
    ? "min-h-[500px] lg:min-h-[calc(100dvh-8.5rem)]"
    : "min-h-[640px]";

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_28%),linear-gradient(180deg,_#eef2ff_0%,_#f8fafc_48%,_#e2e8f0_100%)]">
      <div className="h-4 w-full bg-slate-800" />
      <div className={`mx-auto flex ${shellHeightClass} max-w-7xl items-center px-4 sm:px-6 lg:px-8`}>
        <div className="w-full rounded-[2rem] border border-white/70 bg-white/70 p-3 shadow-[0_40px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className={`grid ${panelHeightClass} w-full grid-cols-1 gap-3 rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] lg:grid-cols-[1.06fr_0.94fr] lg:p-5`}>
            <section className={`flex ${sectionHeightClass} flex-col rounded-[1.35rem] bg-white px-5 py-6 sm:px-8 sm:py-8 lg:px-10`}>
              <div className="flex items-center justify-between">
                <Link
                  href="/login"
                  className="flex items-center gap-3 text-slate-900 transition hover:opacity-80"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-lg shadow-indigo-300/30">
                    <Image
                      src="https://s3-inventorymanagement.s3.amazonaws.com/logo.png"
                      alt="Omari logo"
                      width={30}
                      height={30}
                      className="h-7 w-7 rounded"
                    />
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
                <span>Copyright © 2026 OMDS</span>
                <span>{footerNote}</span>
              </div>
            </section>

            <aside className="relative hidden overflow-hidden rounded-[1.35rem] bg-[#121a55] lg:block">
              <Image
                src="/login-side.png"
                alt="Omari sign in artwork"
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover"
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
