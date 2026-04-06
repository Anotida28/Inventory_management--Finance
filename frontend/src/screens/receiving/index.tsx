"use client";

import Header from "@/components/Header";
import { useGetReceivingReceiptsQuery } from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { FileUp, PackagePlus, ShieldCheck } from "lucide-react";
import numeral from "numeral";

const columns: GridColDef[] = [
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <PackagePlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Manual Receipt
              </h2>
              <p className="text-sm text-gray-400">
                Best for a single item or a short delivery.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Capture serial number, quantity, amount, supplier, signed by,
            arrival date, and supporting documents.
          </p>
          <button className="mt-5 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">
            New Manual Receipt
          </button>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <FileUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Batch Upload
              </h2>
              <p className="text-sm text-gray-400">
                Use Excel for larger bulk deliveries.
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Prepare columns for item name, serial number, quantity, and
            purchase amount. Supplier and arrival details stay on the receipt.
          </p>
          <button className="mt-5 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">
            Upload Batch Sheet
          </button>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Required on Receipt
              </h2>
              <p className="text-sm text-gray-400">
                Minimum control fields for HQ intake.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>Item name, serial number, quantity, purchase amount</li>
            <li>Supplier, date of arrival, signed by, received by</li>
            <li>Invoice, delivery note, signed receiving documents</li>
          </ul>
        </div>
      </div>

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
        className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
      />
    </div>
  );
};

export default Receiving;
