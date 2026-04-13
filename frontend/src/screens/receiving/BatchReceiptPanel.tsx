"use client";

import { getBusinessTodayDate } from "@/utils/date";
import {
  useCreateReceivingReceiptMutation,
  useGetReceivingOptionsQuery,
} from "@/services/api";
import numeral from "numeral";
import { AlertTriangle, Download, FileText, Upload } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import {
  batchReceiptTemplateCsv,
  previewBatchReceiptFile,
} from "./batchImport";

type BatchReceiptFormState = {
  supplierId: string;
  arrivalDate: string;
  signedBy: string;
  receivedBy: string;
};

const acceptedAttachmentTypes =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";
const acceptedBatchFileTypes = ".csv,text/csv";
const labelClassName = "block text-sm font-medium text-gray-700 mb-1";
const inputClassName =
  "block w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500";

const createInitialFormState = (): BatchReceiptFormState => ({
  supplierId: "",
  arrivalDate: getBusinessTodayDate(),
  signedBy: "",
  receivedBy: "",
});

const getMutationErrorMessage = (error: unknown) => {
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

  return "Unable to import batch receipt.";
};

const BatchReceiptPanel = () => {
  const { data: receivingOptions, isLoading, isError } =
    useGetReceivingOptionsQuery();
  const [createReceivingReceipt, { isLoading: isImportingReceipt }] =
    useCreateReceivingReceiptMutation();
  const [formState, setFormState] = useState<BatchReceiptFormState>(
    createInitialFormState
  );
  const [batchFileName, setBatchFileName] = useState<string | null>(null);
  const [batchHeaderIssues, setBatchHeaderIssues] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<
    ReturnType<typeof previewBatchReceiptFile>["rows"]
  >([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const batchFileInputRef = useRef<HTMLInputElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const validRows = useMemo(
    () => previewRows.filter((row) => row.line !== null),
    [previewRows]
  );
  const invalidRows = useMemo(
    () => previewRows.filter((row) => row.issues.length > 0),
    [previewRows]
  );
  const totalImportValue = useMemo(
    () =>
      validRows.reduce(
        (sum, row) => sum + row.quantity * row.unitCost,
        0
      ),
    [validRows]
  );

  const downloadTemplate = () => {
    const csvBlob = new Blob([batchReceiptTemplateCsv], {
      type: "text/csv;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(csvBlob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = "omari-batch-receipt-template.csv";
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const clearPreview = () => {
    setBatchFileName(null);
    setBatchHeaderIssues([]);
    setPreviewRows([]);

    if (batchFileInputRef.current) {
      batchFileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setFormState(createInitialFormState());
    setAttachmentFiles([]);
    setSubmitError(null);
    setSubmitSuccess(null);
    clearPreview();

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleBatchFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    setSubmitError(null);
    setSubmitSuccess(null);

    if (!selectedFile || !receivingOptions) {
      clearPreview();
      return;
    }

    const fileContents = await selectedFile.text();
    const preview = previewBatchReceiptFile(
      selectedFile.name,
      fileContents,
      receivingOptions.knownItems
    );

    setBatchFileName(preview.fileName);
    setBatchHeaderIssues(preview.headerIssues);
    setPreviewRows(preview.rows);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError(null);
    setSubmitSuccess(null);

    if (batchHeaderIssues.length > 0) {
      setSubmitError("Fix the import file header before saving the batch receipt.");
      return;
    }

    if (invalidRows.length > 0) {
      setSubmitError("Fix all invalid batch rows before saving the receipt.");
      return;
    }

    if (validRows.length === 0) {
      setSubmitError("Upload a valid CSV file with at least one receipt line.");
      return;
    }

    try {
      const payload = new FormData();

      payload.append("receiptType", "Batch");
      payload.append("supplierId", formState.supplierId);
      payload.append("arrivalDate", formState.arrivalDate);
      payload.append("signedBy", formState.signedBy);
      payload.append("receivedBy", formState.receivedBy);
      payload.append(
        "lines",
        JSON.stringify(validRows.map((row) => row.line))
      );

      attachmentFiles.forEach((file) => {
        payload.append("attachments", file);
      });

      const createdReceipt = await createReceivingReceipt(payload).unwrap();
      resetForm();
      setSubmitSuccess(
        createdReceipt.documentStatus === "Pending Review"
          ? "Batch receipt imported. Documents are pending review until you verify them."
          : "Batch receipt imported with missing documents. Upload files from the receiving register when they arrive."
      );
    } catch (error) {
      setSubmitError(getMutationErrorMessage(error));
    }
  };

  if (isLoading) {
    return <div className="py-4">Loading batch import options...</div>;
  }

  if (isError || !receivingOptions) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to load batch import options
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <form
        onSubmit={handleSubmit}
        className="xl:col-span-2 bg-white shadow-md rounded-2xl border border-gray-100 p-6"
      >
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Batch Receipt Import
              </h2>
              <p className="text-sm text-gray-400">
                Upload one CSV for a single supplier delivery, preview the lines,
                then post the batch into live HQ stock.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClassName}>Supplier</label>
            <select
              className={inputClassName}
              value={formState.supplierId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  supplierId: event.target.value,
                }))
              }
              required
            >
              <option value="">Select supplier</option>
              {receivingOptions.suppliers.map((supplier) => (
                <option key={supplier.supplierId} value={supplier.supplierId}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>Arrival Date</label>
            <input
              type="date"
              className={inputClassName}
              value={formState.arrivalDate}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  arrivalDate: event.target.value,
                }))
              }
              required
            />
          </div>

          <div>
            <label className={labelClassName}>Signed By</label>
            <input
              list="batch-signed-by-suggestions"
              className={inputClassName}
              value={formState.signedBy}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  signedBy: event.target.value,
                }))
              }
              placeholder="Person signing for delivery"
              required
            />
            <datalist id="batch-signed-by-suggestions">
              {receivingOptions.signedBySuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={labelClassName}>Received By</label>
            <input
              list="batch-received-by-suggestions"
              className={inputClassName}
              value={formState.receivedBy}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  receivedBy: event.target.value,
                }))
              }
              placeholder="Stores officer or desk"
              required
            />
            <datalist id="batch-received-by-suggestions">
              {receivingOptions.receivedBySuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <p className="text-sm font-medium text-gray-700">
              Document workflow is automatic
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Batch receipts with attachments start as pending review. Batch
              receipts without attachments are logged as missing documents.
              Final verification happens from the receiving register after the
              paperwork is checked.
            </p>
          </div>

          <div>
            <label className={labelClassName}>Batch CSV</label>
            <input
              ref={batchFileInputRef}
              type="file"
              accept={acceptedBatchFileTypes}
              className={inputClassName}
              onChange={handleBatchFileSelection}
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              Expected columns: `itemName`, `category`, `quantity`, `unitCost`,
              `storageLocation`, `isSerialized`, `serialNumbers`
            </p>
            <p className="mt-1 text-xs text-gray-500">
              The same item can appear on multiple rows when one delivery is split
              across storage locations or cost lines.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClassName}>Attachments</label>
          <input
            ref={attachmentInputRef}
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

        {batchHeaderIssues.length > 0 && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Import file needs attention
            </p>
            <ul className="mt-2 space-y-1 text-sm text-red-600">
              {batchHeaderIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {previewRows.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-700">
                  Batch Preview
                </h3>
                <p className="text-sm text-gray-500">
                  {batchFileName} | {previewRows.length} row(s) parsed
                </p>
              </div>
              <span className="text-xs text-gray-400">
                Final save still runs live HQ validation for existing serials and
                stock rules.
              </span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-2xl">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Row</th>
                    <th className="px-4 py-3 font-medium">Item</th>
                    <th className="px-4 py-3 font-medium">Qty</th>
                    <th className="px-4 py-3 font-medium">Unit Cost</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Serials</th>
                    <th className="px-4 py-3 font-medium">Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={row.rowNumber} className="border-t align-top">
                      <td className="px-4 py-3 text-gray-600">{row.rowNumber}</td>
                      <td className="px-4 py-3 text-gray-700">
                        <p className="font-medium">{row.itemName || "-"}</p>
                        <p className="text-xs text-gray-400 mt-1">{row.category}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.quantity}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {numeral(row.unitCost).format("$0,0.00")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.storageLocation || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.isSerialized
                          ? `${row.serialNumbers.length} serial(s)`
                          : "Bulk"}
                      </td>
                      <td className="px-4 py-3">
                        {row.issues.length > 0 ? (
                          <div className="space-y-1">
                            {row.issues.map((issue) => (
                              <p
                                key={`${row.rowNumber}-${issue}`}
                                className="text-xs text-red-600"
                              >
                                {issue}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          {submitSuccess && (
            <p className="text-sm text-green-600">{submitSuccess}</p>
          )}
          <button
            type="submit"
            disabled={
              isImportingReceipt ||
              previewRows.length === 0 ||
              batchHeaderIssues.length > 0 ||
              invalidRows.length > 0
            }
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {isImportingReceipt ? "Importing..." : "Import Batch Receipt"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            onClick={resetForm}
          >
            Reset
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Valid Rows</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {validRows.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Rows With Issues</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {invalidRows.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Import Value</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {numeral(totalImportValue).format("$0,0.00")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-700">Batch CSV Rules</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>One file equals one supplier delivery into HQ.</li>
            <li>Each item can only appear once in the file.</li>
            <li>Use `|` between serial numbers for serialized rows.</li>
            <li>Blank category and location fields auto-fill for known items.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BatchReceiptPanel;
