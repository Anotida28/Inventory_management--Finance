"use client";

import Header from "@/components/Header";
import {
  useCreateIssueRecordMutation,
  useGetHqStockQuery,
  useGetIssueRecordsQuery,
} from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ArrowRightLeft, FileText, Paperclip, UserSquare2 } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type IssueFormData = {
  itemName: string;
  serialNumber: string;
  destinationType: "Branch" | "Person";
  issuedTo: string;
  issuedBy: string;
  address: string;
  issueDate: string;
  notes: string;
};

const columns: GridColDef[] = [
  { field: "issueId", headerName: "Issue Ref", width: 130 },
  { field: "itemName", headerName: "Item", width: 190 },
  { field: "serialNumber", headerName: "Serial No", width: 170 },
  { field: "destinationType", headerName: "Type", width: 110 },
  { field: "issuedTo", headerName: "Issued To", width: 170 },
  { field: "issuedBy", headerName: "Issued By", width: 150 },
  { field: "address", headerName: "Address", width: 220 },
  { field: "issueDate", headerName: "Issue Date", width: 120 },
  {
    field: "attachmentNames",
    headerName: "Attachments",
    width: 110,
    valueGetter: (_, row) => row.attachmentNames.length,
  },
  {
    field: "notes",
    headerName: "Notes",
    width: 260,
    valueGetter: (_, row) => row.notes || "-",
  },
];

const initialFormData: IssueFormData = {
  itemName: "",
  serialNumber: "",
  destinationType: "Branch",
  issuedTo: "",
  issuedBy: "",
  address: "",
  issueDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const labelClassName = "block text-sm font-medium text-gray-700 mb-1";
const inputClassName =
  "block w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500";

const Transfers = () => {
  const {
    data: issueRecords,
    isLoading: isLoadingIssues,
    isError: isIssueError,
  } = useGetIssueRecordsQuery();
  const { data: stockItems } = useGetHqStockQuery();
  const [createIssueRecord, { isLoading: isCreatingIssue }] =
    useCreateIssueRecordMutation();
  const [formData, setFormData] = useState<IssueFormData>(initialFormData);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  const branchIssues = useMemo(
    () =>
      issueRecords?.filter((issue) => issue.destinationType === "Branch")
        .length ?? 0,
    [issueRecords]
  );
  const personIssues = useMemo(
    () =>
      issueRecords?.filter((issue) => issue.destinationType === "Person")
        .length ?? 0,
    [issueRecords]
  );
  const attachedIssues = useMemo(
    () =>
      issueRecords?.filter((issue) => issue.attachmentNames.length > 0).length ??
      0,
    [issueRecords]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await createIssueRecord({
      ...formData,
      attachmentNames: attachmentFiles.map((file) => file.name),
      notes: formData.notes.trim() || undefined,
    }).unwrap();

    setFormData(initialFormData);
    setAttachmentFiles([]);
  };

  if (isLoadingIssues) {
    return <div className="py-4">Loading...</div>;
  }

  if (isIssueError || !issueRecords) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch issue out records
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-5">
      <div>
        <Header name="Issue Out" />
        <p className="text-sm text-gray-500 mt-1">
          Track every item issued from HQ to a branch or directly to a person.
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
                Required for issues to branches and individuals.
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
                  }))
                }
                required
              >
                <option value="">Select HQ stock item</option>
                {stockItems?.map((item) => (
                  <option key={item.stockId} value={item.itemName}>
                    {item.itemName} ({item.totalQuantity} in stock)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClassName}>Serial No</label>
              <input
                className={inputClassName}
                value={formData.serialNumber}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    serialNumber: event.target.value,
                  }))
                }
                placeholder="Enter serial number"
                required
              />
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
                  }))
                }
                required
              >
                <option value="Branch">Branch</option>
                <option value="Person">Person</option>
              </select>
            </div>

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
                placeholder="Branch name or person name"
                required
              />
            </div>

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

          <div className="mt-4">
            <label className={labelClassName}>Address</label>
            <input
              className={inputClassName}
              value={formData.address}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              placeholder="Delivery address or office location"
              required
            />
          </div>

          <div className="mt-4">
            <label className={labelClassName}>
              Attachments (Optional)
            </label>
            <input
              type="file"
              multiple
              className={inputClassName}
              onChange={(event) =>
                setAttachmentFiles(Array.from(event.target.files ?? []))
              }
            />
            {attachmentFiles.length > 0 && (
              <p className="mt-2 text-sm text-gray-500">
                {attachmentFiles.length} attachment(s) selected
              </p>
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
            <button
              type="submit"
              disabled={isCreatingIssue}
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
              }}
            >
              Reset
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
                <UserSquare2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Issued to Branches</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {branchIssues}
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
                <p className="text-sm text-gray-500">Issued to People</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {personIssues}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
                <Paperclip className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Records With Attachments</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {attachedIssues}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
            <p className="text-sm font-medium text-gray-700">
              Required Issue Tracking
            </p>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>Item and serial number</li>
              <li>Issued to and issued by</li>
              <li>Address and issue date</li>
              <li>Optional attachments and notes</li>
            </ul>
          </div>
        </div>
      </div>

      <DataGrid
        rows={issueRecords}
        columns={columns}
        getRowId={(row) => row.issueId}
        checkboxSelection
        className="bg-white shadow rounded-lg border border-gray-200 !text-gray-700"
      />
    </div>
  );
};

export default Transfers;
