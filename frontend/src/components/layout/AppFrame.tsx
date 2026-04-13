"use client";

import { clearAuthSession, hasAuthSession } from "@/lib/authSession";
import { clearCredentials } from "@/services/authSlice";
import { useAppDispatch, useAppSelector } from "@/services/store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import DashboardShell from "./DashboardShell";

const isPublicRoute = (pathname: string) =>
  pathname === "/login" || pathname === "/register";

const AppFrame = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const publicRoute = useMemo(() => isPublicRoute(pathname), [pathname]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    if (!hasAuthSession()) {
      clearAuthSession();
      dispatch(clearCredentials());
    }
  }, [accessToken, dispatch]);

  useEffect(() => {
    if (publicRoute || accessToken) {
      return;
    }

    const nextPath =
      pathname && pathname !== "/dashboard" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${nextPath}`);
  }, [accessToken, pathname, publicRoute, router]);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
          Restoring your session...
        </div>
      </div>
    );
  }

  return <DashboardShell>{children}</DashboardShell>;
};

export default AppFrame;
