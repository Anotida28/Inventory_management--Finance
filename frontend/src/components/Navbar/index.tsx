"use client";

import { buildGlobalSearchResults } from "@/lib/navigationSearch";
import { clearCredentials } from "@/services/authSlice";
import {
  useGetHqStockQuery,
  useGetIssueRecordsQuery,
  useGetReceivingReceiptsQuery,
  useGetSuppliersQuery,
  useLogoutMutation,
} from "@/services/api";
import { useAppDispatch, useAppSelector } from "@/services/store";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/services/uiSlice";
import {
  Bell,
  LoaderCircle,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { FormEvent, useDeferredValue, useEffect, useRef, useState } from "react";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [logoutRequest, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [searchText, setSearchText] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const currentUser = useAppSelector((state) => state.auth.user);
  const deferredSearchText = useDeferredValue(searchText);
  const isSearchEnabled = deferredSearchText.trim().length >= 2;

  const { data: receipts, isFetching: isFetchingReceipts } =
    useGetReceivingReceiptsQuery(undefined, {
      skip: !isSearchEnabled,
    });
  const { data: stock, isFetching: isFetchingStock } = useGetHqStockQuery(
    undefined,
    {
      skip: !isSearchEnabled,
    }
  );
  const { data: issues, isFetching: isFetchingIssues } = useGetIssueRecordsQuery(
    undefined,
    {
      skip: !isSearchEnabled,
    }
  );
  const { data: suppliers, isFetching: isFetchingSuppliers } =
    useGetSuppliersQuery(undefined, {
      skip: !isSearchEnabled,
    });

  const searchResults = buildGlobalSearchResults({
    query: deferredSearchText,
    receipts,
    stock,
    issues,
    suppliers,
  });
  const isSearching =
    isSearchEnabled &&
    (isFetchingReceipts ||
      isFetchingStock ||
      isFetchingIssues ||
      isFetchingSuppliers);

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarCollapsed));
  };

  const toggleDarkMode = () => {
    dispatch(setIsDarkMode(!isDarkMode));
  };

  const logout = async () => {
    try {
      await logoutRequest().unwrap();
    } finally {
      dispatch(clearCredentials());
      router.replace("/login");
    }
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const openSearchResult = (href: string) => {
    setIsSearchOpen(false);
    setSearchText("");
    router.push(href);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (searchResults[0]) {
      openSearchResult(searchResults[0].href);
    }
  };

  return (
    <div className="flex justify-between items-center w-full mb-7">
      {/* LEFT SIDE */}
      <div className="flex justify-between items-center gap-5">
        <button
          className="px-3 py-3 bg-gray-100 rounded-full hover:bg-blue-100"
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="relative" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit}>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search receipts, stock, suppliers and issues"
              className="w-64 rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 shadow-sm outline-none transition focus:border-blue-500 md:w-80"
            />

            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="text-gray-400" size={18} />
            </div>
          </form>

          {isSearchOpen ? (
            <div className="absolute left-0 top-[calc(100%+0.75rem)] z-50 w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
              {searchText.trim().length < 2 ? (
                <div className="px-3 py-4 text-sm text-gray-500">
                  Type at least 2 characters to search across receipts, stock,
                  suppliers, and issue records.
                </div>
              ) : isSearching ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-gray-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Searching OMDS workflows...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => openSearchResult(result.href)}
                      className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                            {result.label}
                          </span>
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {result.title}
                          </p>
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {result.description}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {result.matchText}
                      </span>
                    </button>
                  ))}
                  <div className="px-3 pb-2 pt-1 text-xs text-gray-400">
                    Press Enter to open the top result.
                  </div>
                </div>
              ) : (
                <div className="px-3 py-4 text-sm text-gray-500">
                  No matching receipts, stock items, suppliers, or issue records
                  were found.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex justify-between items-center gap-5">
        <div className="hidden md:flex justify-between items-center gap-5">
          <div>
            <button onClick={toggleDarkMode}>
              {isDarkMode ? (
                <Sun className="cursor-pointer text-gray-500" size={24} />
              ) : (
                <Moon className="cursor-pointer text-gray-500" size={24} />
              )}
            </button>
          </div>
          <div className="relative">
            <Bell className="cursor-pointer text-gray-500" size={24} />
            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center px-[0.4rem] py-1 text-xs font-semibold leading-none text-red-100 bg-red-400 rounded-full">
              3
            </span>
          </div>
          <hr className="w-0 h-7 border border-solid border-l border-gray-300 mx-3" />
          <div className="flex items-center gap-3">
            <Image
              src="https://s3-inventorymanagement.s3.amazonaws.com/profile.jpg"
              alt="Profile"
              width={50}
              height={50}
              className="rounded-full h-full object-cover"
            />
            <div>
              <p className="font-semibold text-gray-800">
                {currentUser?.name ?? "Inventory User"}
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                {currentUser?.role ?? "Session"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={logout}
            disabled={isLoggingOut}
            className="md:hidden text-gray-500 transition hover:text-rose-600"
            aria-label="Log out"
          >
            <LogOut size={22} />
          </button>
          <Link href="/settings">
            <Settings className="cursor-pointer text-gray-500" size={24} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
