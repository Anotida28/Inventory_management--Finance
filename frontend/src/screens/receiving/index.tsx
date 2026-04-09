"use client";

import Header from "@/components/Header";
import {
  ReceivingReceipt,
  useGetReceivingReceiptsQuery,
} from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import numeral from "numeral";
import BatchReceiptPanel from "./BatchReceiptPanel";
import ManualReceiptPanel from "./ManualReceiptPanel";

const columns: GridColDef<ReceivingReceipt>[] = [
  { field: "receiptId", headerName: "Receipt", width: 140 },
  { field: "receiptType", headerName: "Type", width: 120 },
  { field: "supplierName", headerName: "Supplier", width: 200 },
  { field: "arrivalDate", headerName: "Arrival Date", width: 120 },
  { field: "signedBy", headerName: "Signed By", width: 150 },
  { field: "receivedBy", headerName: "Received By", width: 150 },
  { field: "itemCount", headerName: "Items", width: 90 },
  { field: "totalQuantity", headerName: "Quantity", width: 100 },
  {
    field: "totalAmount",
    headerName: "Amount",
    width: 120,
    valueGetter: (_, row) => numeral(row.totalAmount).format("$0,0.00"),
  },
  { field: "documentCount", headerName: "Docs", width: 90 },
  { field: "documentStatus", headerName: "Documents", width: 150 },
  { field: "status", headerName: "Status", width: 140 },
  {
    field: "attachments",
    headerName: "Attachment Links",
    width: 240,
    sortable: false,
    renderCell: ({ row }) => {
      if (row.attachments.length === 0) {
        return <span className="text-xs text-gray-400">-</span>;
      }

      const firstAttachment = row.attachments[0];

      return (
        <div className="truncate">
          <a
            href={firstAttachment.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            {firstAttachment.originalName}
          </a>
          {row.attachments.length > 1 && (
            <span className="ml-2 text-xs text-gray-400">
              +{row.attachments.length - 1} more
            </span>
          )}
        </div>
      );
    },
  },
];

const Receiving = () => {
  const { data: receipts, isLoading, isError } = useGetReceivingReceiptsQuery();

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !receipts) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch receiving records
      </div>
    );
  }

  const batchCount = receipts.filter(
    (receipt) => receipt.receiptType === "Batch"
  ).length;
  const singleItemCount = receipts.length - batchCount;
  const pendingDocuments = receipts.filter(
    (receipt) => receipt.documentStatus !== "Complete"
  ).length;
  const totalValue = receipts.reduce(
    (sum, receipt) => sum + receipt.totalAmount,
    0
  );

  return (
    <div className="space-y-6 pb-5">
      <div>
        <Header name="Receiving" />
        <p className="text-sm text-gray-500 mt-1">
          Log all OMDS purchases when goods physically arrive at HQ.
        </p>
      </div>

      <ManualReceiptPanel />
      <BatchReceiptPanel />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Batch Receipts</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{batchCount}</p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Single Item Receipts</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {singleItemCount}
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Pending Documents</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {pendingDocuments}
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <p className="text-sm text-gray-500">Captured Value</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">
            {numeral(totalValue).format("$0,0.00")}
          </p>
        </div>
      </div>

      <DataGrid
        rows={receipts}
        columns={columns}
        getRowId={(row) => row.receiptId}
        checkboxSelection
        disableRowSelectionOnClick
        className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
      />
    </div>
  );
};

export default Receiving;
