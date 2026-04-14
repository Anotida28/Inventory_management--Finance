"use client";

import { setCurrentUser } from "@/services/authSlice";
import { useGetCurrentUserQuery } from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/services/store";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import DashboardShell from "./DashboardShell";

const isPublicRoute = (pathname: string) => pathname === "/login";

const AppFrame = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const publicRoute = useMemo(() => isPublicRoute(pathname), [pathname]);
  const { data: authenticatedUser, isLoading, isFetching } = useGetCurrentUserQuery(
    undefined,
    {
      skip: publicRoute,
    }
  );

  useEffect(() => {
    if (!authenticatedUser) {
      return;
    }

    if (
      !currentUser ||
      currentUser.userId !== authenticatedUser.userId ||
      currentUser.updatedAt !== authenticatedUser.updatedAt
    ) {
      dispatch(setCurrentUser(authenticatedUser));
    }
  }, [authenticatedUser, currentUser, dispatch]);

  useEffect(() => {
    if (publicRoute || currentUser || isLoading || isFetching) {
      return;
    }

    const nextPath =
      pathname && pathname !== "/dashboard" ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${nextPath}`);
  }, [currentUser, isFetching, isLoading, pathname, publicRoute, router]);

  if (publicRoute) {
    return <>{children}</>;
  }

  if (!currentUser && (isLoading || isFetching)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
          Restoring your session...
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
};

export default AppFrame;
