"use client";

import Header from "@/components/Header";
import { useGetSuppliersQuery } from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const columns: GridColDef[] = [
  { field: "name", headerName: "Supplier", width: 220 },
  { field: "categoryFocus", headerName: "Category Focus", width: 210 },
  { field: "contactPerson", headerName: "Contact Person", width: 170 },
  { field: "phone", headerName: "Phone", width: 150 },
  { field: "email", headerName: "Email", width: 220 },
  { field: "lastDeliveryDate", headerName: "Last Delivery", width: 120 },
  { field: "activeContracts", headerName: "Contracts", width: 100 },
];

const Suppliers = () => {
  const { data: suppliers, isLoading, isError } = useGetSuppliersQuery();

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
    <div className="space-y-5">
      <div>
        <Header name="Suppliers" />
        <p className="text-sm text-gray-500 mt-1">
          Vendors supporting OMDS procurement and receiving at HQ.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Active Suppliers</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {suppliers.length}
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Last Delivery Window</p>
          <p className="text-sm text-gray-600 mt-2">
            Most suppliers have delivered within the last 30 days.
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Maintain for Each Supplier</p>
          <p className="text-sm text-gray-600 mt-2">
            Contact, category focus, contract count, and last verified delivery.
          </p>
        </div>
      </div>

      <DataGrid
        rows={suppliers}
        columns={columns}
        getRowId={(row) => row.supplierId}
        checkboxSelection
        className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
      />
    </div>
  );
};

export default Suppliers;
