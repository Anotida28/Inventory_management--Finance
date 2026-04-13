"use client";

import { getBusinessTodayDate } from "@/utils/date";
import {
  NewReceivingReceiptLine,
  ReceivingKnownItem,
  useCreateReceivingReceiptMutation,
  useGetReceivingOptionsQuery,
} from "@/services/api";
import {
  ClipboardList,
  FileText,
  PackagePlus,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";

type ReceiptLineForm = {
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  storageLocation: string;
  isSerialized: boolean;
  serialNumbersText: string;
};

type ReceiptFormState = {
  receiptType: "Batch" | "Single Item";
  supplierId: string;
  arrivalDate: string;
  signedBy: string;
  receivedBy: string;
  documentStatus: "Complete" | "Pending Review" | "Missing";
  lines: ReceiptLineForm[];
};

const acceptedAttachmentTypes =
  ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx";
const labelClassName = "block text-sm font-medium text-gray-700 mb-1";
const inputClassName =
  "block w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500";

const createInitialLine = (): ReceiptLineForm => ({
  itemName: "",
  category: "",
  quantity: 1,
  unitCost: 0,
  storageLocation: "",
  isSerialized: false,
  serialNumbersText: "",
});

const createInitialFormState = (): ReceiptFormState => ({
  receiptType: "Single Item",
  supplierId: "",
  arrivalDate: getBusinessTodayDate(),
  signedBy: "",
  receivedBy: "",
  documentStatus: "Pending Review",
  lines: [createInitialLine()],
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

  return "Unable to save receiving receipt.";
};

const parseSerialNumbersText = (value: string) =>
  value
    .split(/[\n,]+/)
    .map((serialNumber) => serialNumber.trim())
    .filter(Boolean);

const buildLinePayload = (line: ReceiptLineForm): NewReceivingReceiptLine => ({
  itemName: line.itemName.trim(),
  category: line.category.trim(),
  quantity: Number(line.quantity),
  unitCost: Number(line.unitCost),
  storageLocation: line.storageLocation.trim(),
  isSerialized: line.isSerialized,
  serialNumbers: line.isSerialized
    ? parseSerialNumbersText(line.serialNumbersText)
    : [],
});

const ManualReceiptPanel = () => {
  const { data: receivingOptions, isLoading, isError } =
    useGetReceivingOptionsQuery();
  const [createReceivingReceipt, { isLoading: isSavingReceipt }] =
    useCreateReceivingReceiptMutation();
  const [formState, setFormState] = useState<ReceiptFormState>(
    createInitialFormState
  );
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const knownItemsByName = useMemo(
    () =>
      new Map(
        (receivingOptions?.knownItems ?? []).map((item) => [item.itemName, item])
      ),
    [receivingOptions?.knownItems]
  );

  const totalReceiptAmount = useMemo(
    () =>
      formState.lines.reduce(
        (sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0),
        0
      ),
    [formState.lines]
  );

  const handleLineChange = <K extends keyof ReceiptLineForm>(
    index: number,
    key: K,
    value: ReceiptLineForm[K]
  ) => {
    setFormState((current) => {
      const nextLines = [...current.lines];
      const nextLine = { ...nextLines[index], [key]: value };

      if (key === "itemName") {
        const knownItem = knownItemsByName.get(String(value).trim());

        if (knownItem) {
          nextLine.category = knownItem.category;
          nextLine.storageLocation = knownItem.defaultStorageLocation;
          nextLine.isSerialized = knownItem.isSerialized;
        }
      }

      if (key === "isSerialized" && value === false) {
        nextLine.serialNumbersText = "";
      }

      nextLines[index] = nextLine;
      return { ...current, lines: nextLines };
    });
  };

  const addLine = () => {
    setFormState((current) => ({
      ...current,
      receiptType: "Batch",
      lines: [...current.lines, createInitialLine()],
    }));
  };

  const removeLine = (index: number) => {
    setFormState((current) => {
      const nextLines = current.lines.filter((_, lineIndex) => lineIndex !== index);

      return {
        ...current,
        receiptType: nextLines.length <= 1 ? "Single Item" : current.receiptType,
        lines: nextLines.length > 0 ? nextLines : [createInitialLine()],
      };
    });
  };

  const resetForm = () => {
    setFormState(createInitialFormState());
    setAttachmentFiles([]);
    setSubmitError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const payload = new FormData();

      payload.append("receiptType", formState.receiptType);
      payload.append("supplierId", formState.supplierId);
      payload.append("arrivalDate", formState.arrivalDate);
      payload.append("signedBy", formState.signedBy);
      payload.append("receivedBy", formState.receivedBy);
      payload.append("documentStatus", formState.documentStatus);
      payload.append(
        "lines",
        JSON.stringify(formState.lines.map((line) => buildLinePayload(line)))
      );

      attachmentFiles.forEach((file) => {
        payload.append("attachments", file);
      });

      await createReceivingReceipt(payload).unwrap();
      resetForm();
      setSubmitSuccess("Receipt saved and HQ stock updated.");
    } catch (error) {
      setSubmitError(getMutationErrorMessage(error));
    }
  };

  if (isLoading) {
    return <div className="py-4">Loading receiving form...</div>;
  }

  if (isError || !receivingOptions) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to load receiving form options
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <form
        onSubmit={handleSubmit}
        className="xl:col-span-2 bg-white shadow-md rounded-2xl border border-gray-100 p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
            <PackagePlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-700">
              New Manual Receipt
            </h2>
            <p className="text-sm text-gray-400">
              Capture goods when they physically arrive at HQ.
            </p>
          </div>
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
            <label className={labelClassName}>Receipt Type</label>
            <select
              className={inputClassName}
              value={formState.receiptType}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  receiptType: event.target.value as "Batch" | "Single Item",
                  lines:
                    event.target.value === "Single Item"
                      ? [current.lines[0]]
                      : current.lines,
                }))
              }
            >
              <option value="Single Item">Single Item</option>
              <option value="Batch">Batch</option>
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
            <label className={labelClassName}>Document Status</label>
            <select
              className={inputClassName}
              value={formState.documentStatus}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  documentStatus: event.target.value as
                    | "Complete"
                    | "Pending Review"
                    | "Missing",
                }))
              }
            >
              <option value="Pending Review">Pending Review</option>
              <option value="Complete">Complete</option>
              <option value="Missing">Missing</option>
            </select>
          </div>

          <div>
            <label className={labelClassName}>Signed By</label>
            <input
              list="signed-by-suggestions"
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
            <datalist id="signed-by-suggestions">
              {receivingOptions.signedBySuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={labelClassName}>Received By</label>
            <input
              list="received-by-suggestions"
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
            <datalist id="received-by-suggestions">
              {receivingOptions.receivedBySuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-700">
                Receipt Lines
              </h3>
              <p className="text-sm text-gray-500">
                Use one line per item group received into HQ stock.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              onClick={addLine}
            >
              <PlusCircle className="w-4 h-4" />
              Add Line
            </button>
          </div>

          <datalist id="known-receiving-items">
            {receivingOptions.knownItems.map((item: ReceivingKnownItem) => (
              <option key={item.itemName} value={item.itemName} />
            ))}
          </datalist>

          <div className="space-y-4">
            {formState.lines.map((line, index) => {
              const knownItem = knownItemsByName.get(line.itemName.trim());
              const parsedSerialCount = parseSerialNumbersText(
                line.serialNumbersText
              ).length;

              return (
                <div
                  key={`receipt-line-${index}`}
                  className="border border-gray-200 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-medium text-gray-700">
                      Line {index + 1}
                    </p>
                    {formState.lines.length > 1 && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-600"
                        onClick={() => removeLine(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>Item Name</label>
                      <input
                        list="known-receiving-items"
                        className={inputClassName}
                        value={line.itemName}
                        onChange={(event) =>
                          handleLineChange(index, "itemName", event.target.value)
                        }
                        placeholder="e.g. Lenovo ThinkPad E14"
                        required
                      />
                      {knownItem && (
                        <p className="mt-2 text-xs text-gray-500">
                          Known item from HQ stock. Defaults have been loaded.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className={labelClassName}>Category</label>
                      <input
                        className={inputClassName}
                        value={line.category}
                        onChange={(event) =>
                          handleLineChange(index, "category", event.target.value)
                        }
                        placeholder="Laptop, Network, Stationery..."
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClassName}>Quantity</label>
                      <input
                        type="number"
                        min={1}
                        className={inputClassName}
                        value={line.quantity}
                        onChange={(event) =>
                          handleLineChange(
                            index,
                            "quantity",
                            Number(event.target.value || 0)
                          )
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClassName}>Unit Cost</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={inputClassName}
                        value={line.unitCost}
                        onChange={(event) =>
                          handleLineChange(
                            index,
                            "unitCost",
                            Number(event.target.value || 0)
                          )
                        }
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClassName}>Storage Location</label>
                      <select
                        className={inputClassName}
                        value={line.storageLocation}
                        onChange={(event) =>
                          handleLineChange(
                            index,
                            "storageLocation",
                            event.target.value
                          )
                        }
                        required
                      >
                        <option value="">Select location</option>
                        {receivingOptions.stockLocations.map((location) => (
                          <option key={location} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <label className="inline-flex items-center gap-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={line.isSerialized}
                          onChange={(event) =>
                            handleLineChange(
                              index,
                              "isSerialized",
                              event.target.checked
                            )
                          }
                        />
                        Track each unit by serial number
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelClassName}>Serial Numbers</label>
                      <textarea
                        className={`${inputClassName} min-h-28`}
                        value={line.serialNumbersText}
                        onChange={(event) =>
                          handleLineChange(
                            index,
                            "serialNumbersText",
                            event.target.value
                          )
                        }
                        disabled={!line.isSerialized}
                        placeholder="One per line or separated by commas"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        {line.isSerialized
                          ? `${parsedSerialCount} serial number(s) entered`
                          : "Enable serial tracking to capture unit serials."}
                      </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-700">
                        Line Summary
                      </p>
                      <p className="mt-3 text-sm text-gray-600">
                        Total: $
                        {(Number(line.quantity || 0) * Number(line.unitCost || 0)).toFixed(
                          2
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        Serialized: {line.isSerialized ? "Yes" : "No"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Suggested supplier: {knownItem?.supplierName ?? "New item"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <label className={labelClassName}>Attachments</label>
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
          <p className="mt-2 text-xs text-gray-500">
            Accepted: PDF, JPG, PNG, Word, and Excel. Up to 5 files, 10 MB
            each.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {submitError && <p className="text-sm text-red-500">{submitError}</p>}
          {submitSuccess && (
            <p className="text-sm text-green-600">{submitSuccess}</p>
          )}
          <button
            type="submit"
            disabled={isSavingReceipt}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 disabled:opacity-60"
          >
            {isSavingReceipt ? "Saving..." : "Save Receipt"}
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
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Receipt Lines</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                {formState.lines.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <PackagePlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Receipt Value</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                ${totalReceiptAmount.toFixed(2)}
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
              <p className="text-sm text-gray-500">Batch Upload</p>
              <p className="text-sm text-gray-600 mt-2">
                Batch receipt import is now available below for supplier
                deliveries with many line items.
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-gray-500">
            Use manual entry for single deliveries or corrections, then switch to
            the batch panel when the receipt has many lines.
          </p>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-medium text-gray-700">
            Required on Receipt
          </p>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>Supplier, arrival date, signed by, and received by</li>
            <li>Item, category, quantity, cost, and storage location</li>
            <li>Serial numbers for serialized items</li>
            <li>Supporting documents where available</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ManualReceiptPanel;
