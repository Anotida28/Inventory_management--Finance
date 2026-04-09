"use client";

import Header from "@/components/Header";
import {
  Branch,
  IssueRecord,
  useAcknowledgeIssueRecordMutation,
  useCreateIssueRecordMutation,
  useGetAvailableSerialAssetsQuery,
  useGetBranchesQuery,
  useGetHqStockQuery,
  useGetIssueRecordsQuery,
  useReturnIssueRecordMutation,
} from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Paperclip,
  RotateCcw,
  Store,
  Truck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type IssueFormData = {
  itemName: string;
  serialNumber: string;
  destinationType: "Branch" | "Person";
  branchId: string;
  issuedTo: string;
  issuedBy: string;
  address: string;
  issueDate: string;
  notes: string;
};

type IssueActionFormData = {
  acknowledgedBy: string;
  acknowledgedAt: string;
  acknowledgementNotes: string;
  returnedBy: string;
  returnedAt: string;
  returnNotes: string;
};

const getTodayDate = () => new Date().toISOString().split("T")[0];

const initialFormData: IssueFormData = {
  itemName: "",
  serialNumber: "",
  destinationType: "Branch",
  branchId: "",
  issuedTo: "",
  issuedBy: "",
  address: "",
  issueDate: getTodayDate(),
  notes: "",
};

const createInitialActionState = (): IssueActionFormData => ({
  acknowledgedBy: "",
  acknowledgedAt: getTodayDate(),
  acknowledgementNotes: "",
  returnedBy: "",
  returnedAt: getTodayDate(),
  returnNotes: "",
});

const labelClassName = "block text-sm font-medium text-gray-700 mb-1";
const inputClassName =
  "block w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500";
const acceptedAttachmentTypes =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";

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

const renderStatusBadge = (status: IssueRecord["status"]) => {
  const statusStyles: Record<IssueRecord["status"], string> = {
    Issued: "bg-amber-50 text-amber-700 border-amber-200",
    Acknowledged: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Returned: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
};

const columns: GridColDef<IssueRecord>[] = [
  { field: "issueId", headerName: "Issue Ref", width: 130 },
  { field: "itemName", headerName: "Item", width: 180 },
  { field: "serialNumber", headerName: "Serial No", width: 170 },
  { field: "issuedTo", headerName: "Issued To", width: 170 },
  {
    field: "status",
    headerName: "Status",
    width: 150,
    sortable: false,
    renderCell: ({ row }) => renderStatusBadge(row.status),
  },
  { field: "issueDate", headerName: "Issued On", width: 120 },
  {
    field: "acknowledgedAt",
    headerName: "Acknowledged",
    width: 120,
    valueGetter: (_, row) => row.acknowledgedAt ?? "-",
  },
  {
    field: "returnedAt",
    headerName: "Returned",
    width: 120,
    valueGetter: (_, row) => row.returnedAt ?? "-",
  },
];

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const printIssueSlip = (issue: IssueRecord) => {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");

  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to print the issue slip.");
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(issue.issueId)} Issue Slip</title>
        <style>
          body { font-family: "Segoe UI", sans-serif; margin: 32px; color: #1f2937; }
          h1 { margin-bottom: 8px; }
          .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 16px; margin-top: 16px; }
        </style>
      </head>
      <body>
        <h1>Omari Issue Out Slip</h1>
        <p>Reference: ${escapeHtml(issue.issueId)}</p>
        <div class="card"><strong>Item:</strong> ${escapeHtml(
          issue.itemName
        )}<br /><strong>Serial:</strong> ${escapeHtml(
          issue.serialNumber
        )}<br /><strong>Destination:</strong> ${escapeHtml(
          issue.issuedTo
        )}<br /><strong>Address:</strong> ${escapeHtml(
          issue.address
        )}<br /><strong>Status:</strong> ${escapeHtml(issue.status)}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

const Transfers = () => {
  const {
    data: issueRecords,
    isLoading: isLoadingIssues,
    isError: isIssueError,
  } = useGetIssueRecordsQuery();
  const {
    data: stockItems,
    isLoading: isLoadingStock,
    isError: isStockError,
  } = useGetHqStockQuery();
  const {
    data: serialAssets,
    isLoading: isLoadingSerialAssets,
    isError: isSerialAssetError,
  } = useGetAvailableSerialAssetsQuery();
  const {
    data: branches,
    isLoading: isLoadingBranches,
    isError: isBranchError,
  } = useGetBranchesQuery();
  const [createIssueRecord, { isLoading: isCreatingIssue }] =
    useCreateIssueRecordMutation();
  const [acknowledgeIssueRecord, { isLoading: isAcknowledgingIssue }] =
    useAcknowledgeIssueRecordMutation();
  const [returnIssueRecord, { isLoading: isReturningIssue }] =
    useReturnIssueRecordMutation();
  const [formData, setFormData] = useState<IssueFormData>(initialFormData);
  const [actionFormData, setActionFormData] = useState<IssueActionFormData>(
    createInitialActionState
  );
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeBranches = useMemo(
    () => branches?.filter((branch) => branch.status === "Active") ?? [],
    [branches]
  );
  const selectedBranch = useMemo(
    () =>
      activeBranches.find((branch) => branch.branchId === formData.branchId) ??
      null,
    [activeBranches, formData.branchId]
  );
  const availableSerialCountByItem = useMemo(() => {
    const counts = new Map<string, number>();
    serialAssets?.forEach((asset) => {
      counts.set(asset.itemName, (counts.get(asset.itemName) ?? 0) + 1);
    });
    return counts;
  }, [serialAssets]);
  const issueableStockItems = useMemo(
    () =>
      stockItems?.filter(
        (item) => (availableSerialCountByItem.get(item.itemName) ?? 0) > 0
      ) ?? [],
    [availableSerialCountByItem, stockItems]
  );
  const selectedItemSerialAssets = useMemo(
    () =>
      serialAssets?.filter((asset) => asset.itemName === formData.itemName) ??
      [],
    [formData.itemName, serialAssets]
  );
  const selectedIssue = useMemo(
    () =>
      issueRecords?.find((issue) => issue.issueId === selectedIssueId) ?? null,
    [issueRecords, selectedIssueId]
  );
  const branchIssueCount = useMemo(
    () =>
      issueRecords?.filter((issue) => issue.destinationType === "Branch")
        .length ?? 0,
    [issueRecords]
  );
  const pendingAcknowledgementCount = useMemo(
    () => issueRecords?.filter((issue) => issue.status === "Issued").length ?? 0,
    [issueRecords]
  );
  const returnedIssueCount = useMemo(
    () =>
      issueRecords?.filter((issue) => issue.status === "Returned").length ?? 0,
    [issueRecords]
  );
  const attachmentBackedIssueCount = useMemo(
    () =>
      issueRecords?.filter(
        (issue) =>
          issue.attachments.length > 0 || issue.attachmentNames.length > 0
      ).length ?? 0,
    [issueRecords]
  );

  useEffect(() => {
    if (!issueRecords || issueRecords.length === 0) {
      setSelectedIssueId(null);
      return;
    }

    if (
      !selectedIssueId ||
      !issueRecords.some((issue) => issue.issueId === selectedIssueId)
    ) {
      setSelectedIssueId(issueRecords[0].issueId);
    }
  }, [issueRecords, selectedIssueId]);

  useEffect(() => {
    if (formData.destinationType === "Branch") {
      if (selectedBranch) {
        setFormData((current) => ({
          ...current,
          issuedTo: selectedBranch.name,
          address: selectedBranch.address,
        }));
      }
      return;
    }

    if (formData.branchId) {
      setFormData((current) => ({
        ...current,
        branchId: "",
      }));
    }
  }, [formData.destinationType, formData.branchId, selectedBranch]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setActionSuccess(null);

    try {
      const payload = new FormData();
      payload.append("itemName", formData.itemName);
      payload.append("serialNumber", formData.serialNumber);
      payload.append("destinationType", formData.destinationType);
      payload.append("issuedTo", formData.issuedTo);
      payload.append("issuedBy", formData.issuedBy);
      payload.append("address", formData.address);
      payload.append("issueDate", formData.issueDate);

      if (formData.destinationType === "Branch" && formData.branchId) {
        payload.append("branchId", formData.branchId);
      }

      if (formData.notes.trim()) {
        payload.append("notes", formData.notes.trim());
      }

      attachmentFiles.forEach((file) => payload.append("attachments", file));

      const createdIssue = await createIssueRecord(payload).unwrap();
      setFormData(initialFormData);
      setActionFormData(createInitialActionState());
      setAttachmentFiles([]);
      setSelectedIssueId(createdIssue.issueId);
      setActionSuccess(`Issue record ${createdIssue.issueId} saved.`);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setSubmitError(
        getMutationErrorMessage(error, "Unable to save issue out record.")
      );
    }
  };

  const handleAcknowledgeIssue = async () => {
    if (!selectedIssue) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    try {
      await acknowledgeIssueRecord({
        issueId: selectedIssue.issueId,
        payload: {
          acknowledgedBy: actionFormData.acknowledgedBy,
          acknowledgedAt: actionFormData.acknowledgedAt,
          acknowledgementNotes: actionFormData.acknowledgementNotes.trim(),
        },
      }).unwrap();

      setActionFormData((current) => ({
        ...current,
        acknowledgedBy: "",
        acknowledgementNotes: "",
      }));
      setActionSuccess(`Issue ${selectedIssue.issueId} acknowledged.`);
    } catch (error) {
      setActionError(
        getMutationErrorMessage(error, "Unable to acknowledge issue record.")
      );
    }
  };

  const handleReturnIssue = async () => {
    if (!selectedIssue) {
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    try {
      await returnIssueRecord({
        issueId: selectedIssue.issueId,
        payload: {
          returnedBy: actionFormData.returnedBy,
          returnedAt: actionFormData.returnedAt,
          returnNotes: actionFormData.returnNotes.trim(),
        },
      }).unwrap();

      setActionFormData((current) => ({
        ...current,
        returnedBy: "",
        returnNotes: "",
      }));
      setActionSuccess(`Issue ${selectedIssue.issueId} returned to HQ.`);
    } catch (error) {
      setActionError(
        getMutationErrorMessage(error, "Unable to return issue record.")
      );
    }
  };

  const handlePrintSlip = () => {
    if (!selectedIssue) {
      return;
    }

    try {
      printIssueSlip(selectedIssue);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to print issue slip."
      );
    }
  };

  if (
    isLoadingIssues ||
    isLoadingStock ||
    isLoadingSerialAssets ||
    isLoadingBranches
  ) {
    return <div className="py-4">Loading...</div>;
  }

  if (
    isIssueError ||
    isStockError ||
    isSerialAssetError ||
    isBranchError ||
    !issueRecords ||
    !stockItems ||
    !serialAssets ||
    !branches
  ) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch issue out data
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-5">
      <div>
        <Header name="Issue Out" />
        <p className="text-sm text-gray-500 mt-1">
          Manage dispatch, acknowledgement, return, and printable issue slips in
          one workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-2 bg-white shadow-md rounded-2xl border border-gray-100 p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                New Issue Out Record
              </h2>
              <p className="text-sm text-gray-400">
                Branch issues now pull from branch master data automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>Item</label>
              <select
                className={inputClassName}
                value={formData.itemName}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    itemName: event.target.value,
                    serialNumber: "",
                  }))
                }
                required
              >
                <option value="">Select HQ stock item</option>
                {issueableStockItems.map((item) => (
                  <option key={item.stockId} value={item.itemName}>
                    {item.itemName} (
                    {availableSerialCountByItem.get(item.itemName) ?? 0} serials
                    ready)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName}>Serial No</label>
              <select
                className={inputClassName}
                value={formData.serialNumber}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    serialNumber: event.target.value,
                  }))
                }
                disabled={!formData.itemName}
                required
              >
                <option value="">
                  {formData.itemName
                    ? "Select available serial number"
                    : "Select item first"}
                </option>
                {selectedItemSerialAssets.map((asset) => (
                  <option key={asset.assetId} value={asset.serialNumber}>
                    {asset.serialNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName}>Issue Type</label>
              <select
                className={inputClassName}
                value={formData.destinationType}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    destinationType: event.target.value as "Branch" | "Person",
                    branchId: "",
                    issuedTo: "",
                    address: "",
                  }))
                }
                required
              >
                <option value="Branch">Branch</option>
                <option value="Person">Person</option>
              </select>
            </div>

            {formData.destinationType === "Branch" ? (
              <div>
                <label className={labelClassName}>Destination Branch</label>
                <select
                  className={inputClassName}
                  value={formData.branchId}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      branchId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select branch</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.branchId} value={branch.branchId}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={labelClassName}>Issued To</label>
                <input
                  className={inputClassName}
                  value={formData.issuedTo}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      issuedTo: event.target.value,
                    }))
                  }
                  placeholder="Person name"
                  required
                />
              </div>
            )}

            <div>
              <label className={labelClassName}>Issued By</label>
              <input
                className={inputClassName}
                value={formData.issuedBy}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    issuedBy: event.target.value,
                  }))
                }
                placeholder="Officer issuing the item"
                required
              />
            </div>

            <div>
              <label className={labelClassName}>Issue Date</label>
              <input
                type="date"
                className={inputClassName}
                value={formData.issueDate}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    issueDate: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClassName}>Issued To</label>
              <input
                className={inputClassName}
                value={formData.issuedTo}
                readOnly={formData.destinationType === "Branch"}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    issuedTo: event.target.value,
                  }))
                }
                placeholder={
                  formData.destinationType === "Branch"
                    ? "Selected from branch master"
                    : "Recipient name"
                }
                required
              />
            </div>

            <div>
              <label className={labelClassName}>Address</label>
              <input
                className={inputClassName}
                value={formData.address}
                readOnly={formData.destinationType === "Branch"}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                placeholder={
                  formData.destinationType === "Branch"
                    ? "Auto-filled from branch master"
                    : "Delivery address or office location"
                }
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClassName}>Attachments (Optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedAttachmentTypes}
              className={inputClassName}
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

          <div className="mt-4">
            <label className={labelClassName}>Notes (Optional)</label>
            <textarea
              className={`${inputClassName} min-h-28`}
              value={formData.notes}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Add any issue-out notes here"
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            {submitError && (
              <p className="text-sm text-red-500">{submitError}</p>
            )}
            <button
              type="submit"
              disabled={
                isCreatingIssue ||
                !formData.itemName ||
                !formData.serialNumber ||
                !formData.issuedTo ||
                !formData.issuedBy ||
                !formData.address ||
                (formData.destinationType === "Branch" && !formData.branchId)
              }
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:opacity-60"
            >
              {isCreatingIssue ? "Saving..." : "Save Issue Out"}
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              onClick={() => {
                setFormData(initialFormData);
                setAttachmentFiles([]);
                setSubmitError(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Reset
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <Store className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Branch Issues</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {branchIssueCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-500">Pending Ack</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {pendingAcknowledgementCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-4 h-4 text-slate-700" />
                <div>
                  <p className="text-sm text-gray-500">Returned</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {returnedIssueCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <Paperclip className="w-4 h-4 text-slate-700" />
                <div>
                  <p className="text-sm text-gray-500">With Documents</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {attachmentBackedIssueCount}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Selected Issue Record
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Select a row below to acknowledge, return, or print.
                </p>
              </div>
              {selectedIssue && (
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                >
                  Print Slip
                </button>
              )}
            </div>

            {selectedIssue ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      {selectedIssue.issueId}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {selectedIssue.itemName} | {selectedIssue.serialNumber}
                    </p>
                  </div>
                  {renderStatusBadge(selectedIssue.status)}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Destination</p>
                    <p className="font-medium text-gray-700 mt-1">
                      {selectedIssue.issuedTo}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Issued By</p>
                    <p className="font-medium text-gray-700 mt-1">
                      {selectedIssue.issuedBy}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-100 p-4 bg-slate-50/70">
                  <p className="text-sm font-medium text-gray-700">
                    Issue Timeline
                  </p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <ClipboardCheck className="w-4 h-4 text-blue-600 mt-0.5" />
                      <p className="text-gray-600">
                        Issued on {selectedIssue.issueDate} by{" "}
                        {selectedIssue.issuedBy}
                      </p>
                    </div>
                    {selectedIssue.acknowledgedAt && selectedIssue.acknowledgedBy && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                        <p className="text-gray-600">
                          Acknowledged on {selectedIssue.acknowledgedAt} by{" "}
                          {selectedIssue.acknowledgedBy}
                        </p>
                      </div>
                    )}
                    {selectedIssue.returnedAt && selectedIssue.returnedBy && (
                      <div className="flex items-start gap-3">
                        <RotateCcw className="w-4 h-4 text-slate-700 mt-0.5" />
                        <p className="text-gray-600">
                          Returned on {selectedIssue.returnedAt} by{" "}
                          {selectedIssue.returnedBy}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {(actionError || actionSuccess) && (
                  <div>
                    {actionError && (
                      <p className="text-sm text-red-500">{actionError}</p>
                    )}
                    {actionSuccess && (
                      <p className="text-sm text-emerald-600">{actionSuccess}</p>
                    )}
                  </div>
                )}

                {selectedIssue.status === "Issued" && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-4">
                    <p className="text-sm font-medium text-gray-700">
                      Acknowledge Receipt
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <input
                        className={inputClassName}
                        value={actionFormData.acknowledgedBy}
                        onChange={(event) =>
                          setActionFormData((current) => ({
                            ...current,
                            acknowledgedBy: event.target.value,
                          }))
                        }
                        placeholder="Acknowledged by"
                      />
                      <input
                        type="date"
                        className={inputClassName}
                        value={actionFormData.acknowledgedAt}
                        onChange={(event) =>
                          setActionFormData((current) => ({
                            ...current,
                            acknowledgedAt: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <textarea
                      className={`${inputClassName} min-h-24 mt-3`}
                      value={actionFormData.acknowledgementNotes}
                      onChange={(event) =>
                        setActionFormData((current) => ({
                          ...current,
                          acknowledgementNotes: event.target.value,
                        }))
                      }
                      placeholder="Optional acknowledgement notes"
                    />
                    <button
                      type="button"
                      onClick={handleAcknowledgeIssue}
                      disabled={
                        isAcknowledgingIssue ||
                        !actionFormData.acknowledgedBy.trim()
                      }
                      className="mt-3 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-60"
                    >
                      {isAcknowledgingIssue ? "Saving..." : "Confirm Acknowledgement"}
                    </button>
                  </div>
                )}

                {selectedIssue.status !== "Returned" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-gray-700">
                      Return to HQ
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <input
                        className={inputClassName}
                        value={actionFormData.returnedBy}
                        onChange={(event) =>
                          setActionFormData((current) => ({
                            ...current,
                            returnedBy: event.target.value,
                          }))
                        }
                        placeholder="Returned by"
                      />
                      <input
                        type="date"
                        className={inputClassName}
                        value={actionFormData.returnedAt}
                        onChange={(event) =>
                          setActionFormData((current) => ({
                            ...current,
                            returnedAt: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <textarea
                      className={`${inputClassName} min-h-24 mt-3`}
                      value={actionFormData.returnNotes}
                      onChange={(event) =>
                        setActionFormData((current) => ({
                          ...current,
                          returnNotes: event.target.value,
                        }))
                      }
                      placeholder="Reason or condition on return"
                    />
                    <button
                      type="button"
                      onClick={handleReturnIssue}
                      disabled={
                        isReturningIssue || !actionFormData.returnedBy.trim()
                      }
                      className="mt-3 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isReturningIssue ? "Saving..." : "Process Return"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 text-sm text-gray-500">
                Select an issue record below to review its lifecycle.
              </div>
            )}
          </div>
        </div>
      </div>

      <DataGrid
        rows={issueRecords}
        columns={columns}
        getRowId={(row) => row.issueId}
        onRowClick={(params) => setSelectedIssueId(params.row.issueId)}
        disableRowSelectionOnClick
        pageSizeOptions={[5, 10, 25]}
        initialState={{
          pagination: {
            paginationModel: {
              page: 0,
              pageSize: 10,
            },
          },
        }}
        className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
      />
    </div>
  );
};

export default Transfers;
