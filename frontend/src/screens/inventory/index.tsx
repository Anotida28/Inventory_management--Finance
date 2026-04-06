"use client";

import Header from "@/components/Header";
import { useGetHqStockQuery } from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const columns: GridColDef[] = [
  { field: "itemName", headerName: "Item", width: 220 },
  { field: "category", headerName: "Category", width: 140 },
  { field: "totalQuantity", headerName: "Units On Hand", width: 130 },
  { field: "serializedUnits", headerName: "Serialized", width: 120 },
  { field: "nonSerializedUnits", headerName: "Bulk Units", width: 120 },
  { field: "supplierName", headerName: "Supplier", width: 190 },
  { field: "storageLocation", headerName: "Storage", width: 140 },
  { field: "lastArrivalDate", headerName: "Last Arrival", width: 130 },
  { field: "status", headerName: "Status", width: 150 },
];

const Inventory = () => {
  const { data: stock, isError, isLoading } = useGetHqStockQuery();

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !stock) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch HQ stock
      </div>
    );
  }

  const totalUnits = stock.reduce((sum, item) => sum + item.totalQuantity, 0);
  const serializedUnits = stock.reduce(
    (sum, item) => sum + item.serializedUnits,
    0
  );

  return (
    <div className="space-y-5">
      <div>
        <Header name="HQ Stock" />
        <p className="text-sm text-gray-500 mt-1">
          Stock held at HQ after receiving and before branch issue-out.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Total Units On Hand</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{totalUnits}</p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Serialized Assets</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {serializedUnits}
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Tracked Item Groups</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {stock.length}
          </p>
        </div>
      </div>

      <DataGrid
        rows={stock}
        columns={columns}
        getRowId={(row) => row.stockId}
        checkboxSelection
        className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
      />
    </div>
  );
};

export default Inventory;
