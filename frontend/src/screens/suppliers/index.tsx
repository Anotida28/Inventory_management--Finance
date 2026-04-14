"use client";

import Header from "@/components/Header";
import { Supplier, useGetSuppliersQuery } from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Building2, Mail, Phone, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const columns: GridColDef<Supplier>[] = [
  { field: "name", headerName: "Supplier", width: 220 },
  { field: "categoryFocus", headerName: "Category Focus", width: 210 },
  { field: "contactPerson", headerName: "Contact Person", width: 170 },
  { field: "phone", headerName: "Phone", width: 150 },
  { field: "email", headerName: "Email", width: 220 },
  { field: "lastDeliveryDate", headerName: "Last Delivery", width: 120 },
  { field: "activeContracts", headerName: "Contracts", width: 100 },
];

const Suppliers = () => {
  const searchParams = useSearchParams();
  const { data: suppliers, isLoading, isError } = useGetSuppliersQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const highlightedSupplierId = searchParams.get("supplierId");

  useEffect(() => {
    setSearchTerm(searchParams.get("search") ?? "");
  }, [searchParams]);

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return suppliers ?? [];
    }

    return (suppliers ?? []).filter((supplier) => {
      const searchableValues = [
        supplier.supplierId,
        supplier.name,
        supplier.categoryFocus,
        supplier.contactPerson,
        supplier.phone,
        supplier.email,
      ];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [searchTerm, suppliers]);

  useEffect(() => {
    if (!filteredSuppliers.length) {
      setSelectedSupplierId(null);
      return;
    }

    if (
      highlightedSupplierId &&
      filteredSuppliers.some(
        (supplier) => supplier.supplierId === highlightedSupplierId
      )
    ) {
      if (selectedSupplierId !== highlightedSupplierId) {
        setSelectedSupplierId(highlightedSupplierId);
      }
      return;
    }

    if (
      !selectedSupplierId ||
      !filteredSuppliers.some(
        (supplier) => supplier.supplierId === selectedSupplierId
      )
    ) {
      setSelectedSupplierId(filteredSuppliers[0].supplierId);
    }
  }, [filteredSuppliers, highlightedSupplierId, selectedSupplierId]);

  const selectedSupplier = useMemo(
    () =>
      filteredSuppliers.find(
        (supplier) => supplier.supplierId === selectedSupplierId
      ) ?? null,
    [filteredSuppliers, selectedSupplierId]
  );

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !suppliers) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch suppliers
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-5">
      <div>
        <Header name="Suppliers" />
        <p className="mt-1 text-sm text-gray-500">
          Vendors supporting OMDS procurement and receiving at HQ.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Active Suppliers</p>
          <p className="mt-2 text-3xl font-bold text-gray-800">
            {filteredSuppliers.length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Last Delivery Window</p>
          <p className="mt-2 text-sm text-gray-600">
            Most suppliers have delivered within the last 30 days.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Maintain for Each Supplier</p>
          <p className="mt-2 text-sm text-gray-600">
            Contact, category focus, contract count, and last verified delivery.
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Filter by supplier, contact, category, phone, or email"
                className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-blue-500"
              />
            </div>
            <p className="text-sm text-gray-500">
              {filteredSuppliers.length} matching supplier
              {filteredSuppliers.length === 1 ? "" : "s"}
            </p>
          </div>

          <DataGrid
            rows={filteredSuppliers}
            columns={columns}
            getRowId={(row) => row.supplierId}
            onRowClick={(params) => setSelectedSupplierId(params.row.supplierId)}
            checkboxSelection
            className="!text-gray-700"
          />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-blue-100 bg-blue-50 p-3">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Selected Supplier</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-800">
                {selectedSupplier?.name ?? "Choose a supplier from the grid"}
              </h2>
            </div>
          </div>

          {selectedSupplier ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                  Category Focus
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {selectedSupplier.categoryFocus}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                  Contact Person
                </p>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {selectedSupplier.contactPerson}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="h-4 w-4" />
                  <span>Phone</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-800">
                  {selectedSupplier.phone}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <p className="mt-2 break-all text-sm font-semibold text-gray-800">
                  {selectedSupplier.email}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-gray-500">
              Search or select a supplier row to review contact details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Suppliers;
