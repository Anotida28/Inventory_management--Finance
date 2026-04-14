"use client";

import Header from "@/components/Header";
import {
  ReceivingReceipt,
  useAddReceivingReceiptAttachmentsMutation,
  useGetReceivingReceiptsQuery,
  useVerifyReceivingReceiptMutation,
} from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { FileCheck2, Paperclip, Search, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import numeral from "numeral";
import { useEffect, useMemo, useRef, useState } from "react";
import BatchReceiptPanel from "./BatchReceiptPanel";
import ManualReceiptPanel from "./ManualReceiptPanel";

const documentStatusClasses: Record<ReceivingReceipt["documentStatus"], string> = {
  Complete: "bg-green-100 text-green-700",
  "Pending Review": "bg-yellow-100 text-yellow-700",
  Missing: "bg-red-100 text-red-700",
};

const receiptStatusClasses: Record<ReceivingReceipt["status"], string> = {
  Verified: "bg-green-100 text-green-700",
  "Pending Review": "bg-yellow-100 text-yellow-700",
  Logged: "bg-blue-100 text-blue-700",
};

const getMutationErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "object" &&
    error.data !== null &&
    "message" in error.data &&
    typeof error.data.message === "string"
  ) {
    return error.data.message;
  }

  return fallbackMessage;
};

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
  {
    field: "documentStatus",
    headerName: "Documents",
    width: 160,
    renderCell: ({ row }) => (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          documentStatusClasses[row.documentStatus]
        }`}
      >
        {row.documentStatus}
      </span>
    ),
  },
  {
    field: "status",
    headerName: "Workflow",
    width: 150,
    renderCell: ({ row }) => (
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          receiptStatusClasses[row.status]
        }`}
      >
        {row.status}
      </span>
    ),
  },
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
  const searchParams = useSearchParams();
  const { data: receipts, isLoading, isError } = useGetReceivingReceiptsQuery();
  const [addReceivingReceiptAttachments, { isLoading: isUploadingDocuments }] =
    useAddReceivingReceiptAttachmentsMutation();
  const [verifyReceivingReceipt, { isLoading: isVerifyingReceipt }] =
    useVerifyReceivingReceiptMutation();
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const highlightedReceiptId = searchParams.get("receiptId");

  useEffect(() => {
    setSearchTerm(searchParams.get("search") ?? "");
  }, [searchParams]);

  const filteredReceipts = useMemo(() => {
    if (!receipts) {
      return [];
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return receipts;
    }

    return receipts.filter((receipt) => {
      const searchableValues = [
        receipt.receiptId,
        receipt.receiptType,
        receipt.supplierName,
        receipt.arrivalDate,
        receipt.signedBy,
        receipt.receivedBy,
        receipt.documentStatus,
        receipt.status,
      ];

      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [receipts, searchTerm]);

  useEffect(() => {
    if (filteredReceipts.length === 0) {
      setSelectedReceiptId(null);
      return;
    }

    if (
      highlightedReceiptId &&
      filteredReceipts.some((receipt) => receipt.receiptId === highlightedReceiptId)
    ) {
      if (selectedReceiptId !== highlightedReceiptId) {
        setSelectedReceiptId(highlightedReceiptId);
      }
      return;
    }

    if (
      !selectedReceiptId ||
      !filteredReceipts.some((receipt) => receipt.receiptId === selectedReceiptId)
    ) {
      setSelectedReceiptId(filteredReceipts[0].receiptId);
    }
  }, [filteredReceipts, highlightedReceiptId, selectedReceiptId]);

  const selectedReceipt = useMemo(
    () =>
      filteredReceipts.find((receipt) => receipt.receiptId === selectedReceiptId) ??
      null,
    [filteredReceipts, selectedReceiptId]
  );

  const batchCount =
    filteredReceipts.filter((receipt) => receipt.receiptType === "Batch").length ?? 0;
  const singleItemCount = filteredReceipts.length - batchCount;
  const pendingDocuments = filteredReceipts.filter(
    (receipt) => receipt.documentStatus !== "Complete"
  ).length;
  const totalValue = filteredReceipts.reduce(
    (sum, receipt) => sum + receipt.totalAmount,
    0
  );

  const handleUploadDocuments = async () => {
    if (!selectedReceipt || attachmentFiles.length === 0) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    try {
      const payload = new FormData();
      attachmentFiles.forEach((file) => payload.append("attachments", file));

      const wasVerified = selectedReceipt.documentStatus === "Complete";
      const updatedReceipt = await addReceivingReceiptAttachments({
        receiptId: selectedReceipt.receiptId,
        payload,
      }).unwrap();

      setSelectedReceiptId(updatedReceipt.receiptId);
      setAttachmentFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setActionSuccess(
        wasVerified
          ? `Documents updated for ${updatedReceipt.receiptId}. The receipt has been moved back to pending review.`
          : `Documents uploaded for ${updatedReceipt.receiptId}. The receipt is ready for verification after review.`
      );
    } catch (error) {
      setActionError(
        getMutationErrorMessage(error, "Unable to upload receipt documents.")
      );
    }
  };

  const handleVerifyDocuments = async () => {
    if (!selectedReceipt) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    try {
      const updatedReceipt = await verifyReceivingReceipt(
        selectedReceipt.receiptId
      ).unwrap();

      setSelectedReceiptId(updatedReceipt.receiptId);
      setActionSuccess(`Receipt ${updatedReceipt.receiptId} has been verified.`);
    } catch (error) {
      setActionError(
        getMutationErrorMessage(error, "Unable to verify receipt documents.")
      );
    }
  };

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

      <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm text-gray-500">Selected Receipt</p>
            <h2 className="text-xl font-semibold text-gray-800 mt-1">
              {selectedReceipt?.receiptId ?? "Choose a receipt from the register"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Add documents after logging the receipt, then verify them here.
            </p>
          </div>

          {selectedReceipt && (
            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  documentStatusClasses[selectedReceipt.documentStatus]
                }`}
              >
                Documents: {selectedReceipt.documentStatus}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  receiptStatusClasses[selectedReceipt.status]
                }`}
              >
                Workflow: {selectedReceipt.status}
              </span>
            </div>
          )}
        </div>

        {selectedReceipt ? (
          <>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="mt-2 font-semibold text-gray-800">
                  {selectedReceipt.supplierName}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Arrival Date</p>
                <p className="mt-2 font-semibold text-gray-800">
                  {selectedReceipt.arrivalDate}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Documents on File</p>
                <p className="mt-2 font-semibold text-gray-800">
                  {selectedReceipt.documentCount}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Receipt Value</p>
                <p className="mt-2 font-semibold text-gray-800">
                  {numeral(selectedReceipt.totalAmount).format("$0,0.00")}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-4">
              <div className="rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">
                      Add Supporting Documents
                    </p>
                    <p className="text-sm text-gray-500">
                      Upload paperwork for the selected receipt. Any new upload
                      sends the receipt back into pending review.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    className="block w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500"
                    onChange={(event) =>
                      setAttachmentFiles(Array.from(event.target.files ?? []))
                    }
                  />
                  {attachmentFiles.length > 0 && (
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
                      <p>{attachmentFiles.length} attachment(s) selected</p>
                      {attachmentFiles.map((file) => (
                        <p key={`${file.name}-${file.size}`} className="truncate">
                          {file.name}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleUploadDocuments}
                    disabled={isUploadingDocuments || attachmentFiles.length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isUploadingDocuments ? "Uploading..." : "Upload Documents"}
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyDocuments}
                    disabled={
                      isVerifyingReceipt ||
                      selectedReceipt.attachments.length === 0 ||
                      selectedReceipt.documentStatus === "Complete"
                    }
                    className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isVerifyingReceipt ? "Verifying..." : "Verify Documents"}
                  </button>
                </div>

                {(actionError || actionSuccess) && (
                  <div className="mt-4">
                    {actionError && (
                      <p className="text-sm text-red-500">{actionError}</p>
                    )}
                    {actionSuccess && (
                      <p className="text-sm text-emerald-600">{actionSuccess}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
                    <Paperclip className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Current Documents</p>
                    <p className="text-sm text-gray-500">
                      Files already attached to this receipt.
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedReceipt.attachments.length > 0 ? (
                    selectedReceipt.attachments.map((attachment) => (
                      <a
                        key={attachment.attachmentId}
                        href={attachment.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl border border-gray-100 px-4 py-3 hover:border-blue-200 hover:bg-blue-50/40"
                      >
                        <p className="text-sm font-medium text-gray-700">
                          {attachment.originalName}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Uploaded {new Date(attachment.uploadedAt).toLocaleString()}
                        </p>
                      </a>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500">
                      No documents are attached yet. Upload the receipt pack here
                      when paperwork becomes available.
                    </div>
                  )}

                  <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <FileCheck2 className="w-4 h-4 text-amber-600 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        Verification is a separate step. A receipt only becomes
                        complete after its uploaded documents have been reviewed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            Select a receipt row below to manage its documents.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter by receipt, supplier, staff, or status"
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-700 outline-none transition focus:border-blue-500"
            />
          </div>
          <p className="text-sm text-gray-500">
            {filteredReceipts.length} matching receipt
            {filteredReceipts.length === 1 ? "" : "s"}
          </p>
        </div>

        <DataGrid
          rows={filteredReceipts}
          columns={columns}
          getRowId={(row) => row.receiptId}
          onRowClick={(params) => setSelectedReceiptId(String(params.row.receiptId))}
          disableRowSelectionOnClick
          initialState={{
            pagination: {
              paginationModel: {
                page: 0,
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[10, 25, 50]}
          className="!text-gray-700"
        />
      </div>
    </div>
  );
};

export default Receiving;
