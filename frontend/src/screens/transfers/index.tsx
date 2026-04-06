"use client";

import Header from "@/components/Header";
import { useGetTransfersQuery } from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";

const columns: GridColDef[] = [
  { field: "transferId", headerName: "Transfer", width: 140 },
  { field: "branchName", headerName: "Branch", width: 170 },
  { field: "dispatchDate", headerName: "Dispatch Date", width: 120 },
  { field: "expectedArrivalDate", headerName: "Expected Arrival", width: 130 },
  { field: "itemCount", headerName: "Item Groups", width: 110 },
  { field: "totalQuantity", headerName: "Quantity", width: 100 },
  { field: "requestedBy", headerName: "Requested By", width: 150 },
  { field: "dispatchedBy", headerName: "Dispatched By", width: 150 },
  { field: "acknowledgedBy", headerName: "Acknowledged By", width: 150 },
  { field: "status", headerName: "Status", width: 180 },
];

const Transfers = () => {
  const { data: transfers, isLoading, isError } = useGetTransfersQuery();

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !transfers) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch transfer records
      </div>
    );
  }

  const pendingCount = transfers.filter(
    (transfer) => transfer.status !== "Received"
  ).length;
  const inTransitCount = transfers.filter(
    (transfer) => transfer.status === "In Transit"
  ).length;

  return (
    <div className="space-y-5">
      <div>
        <Header name="Transfers" />
        <p className="text-sm text-gray-500 mt-1">
          Issue stock from HQ to branches after receiving and verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Open Transfers</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {pendingCount}
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">In Transit</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {inTransitCount}
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Workflow</p>
          <p className="text-sm text-gray-600 mt-2">
            Request, dispatch, acknowledge receipt, then close the transfer.
          </p>
        </div>
      </div>

      <DataGrid
        rows={transfers}
        columns={columns}
        getRowId={(row) => row.transferId}
        checkboxSelection
        className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
      />
    </div>
  );
};

export default Transfers;
