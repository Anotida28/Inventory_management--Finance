"use client";

import Header from "@/components/Header";
import { AuditActivity, useGetOperationsOverviewQuery } from "@/services/api";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  Building2,
  ClipboardCheck,
  FileCheck2,
  History,
  PackageSearch,
  RotateCcw,
  ScanBarcode,
  ShieldAlert,
  Store,
} from "lucide-react";
import numeral from "numeral";

const statusClassNames: Record<string, string> = {
  Verified: "bg-green-100 text-green-700",
  Logged: "bg-blue-100 text-blue-700",
  "Pending Review": "bg-yellow-100 text-yellow-700",
  Complete: "bg-green-100 text-green-700",
  Missing: "bg-red-100 text-red-700",
  Issued: "bg-amber-100 text-amber-700",
  Acknowledged: "bg-emerald-100 text-emerald-700",
  Returned: "bg-slate-200 text-slate-700",
  Available: "bg-green-100 text-green-700",
  Reserved: "bg-blue-100 text-blue-700",
  "Low Stock": "bg-red-100 text-red-700",
};

const alertClassNames: Record<string, string> = {
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-red-200 bg-red-50 text-red-700",
};

const getActivityIcon = (activityType: AuditActivity["activityType"]) => {
  switch (activityType) {
    case "Receipt Logged":
      return ClipboardCheck;
    case "Issue Out":
      return ArrowRightLeft;
    case "Issue Acknowledged":
      return FileCheck2;
    case "Issue Returned":
      return RotateCcw;
    default:
      return History;
  }
};

const Dashboard = () => {
  const { data, isLoading, isError } = useGetOperationsOverviewQuery();

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !data) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to load OMDS workflow overview
      </div>
    );
  }

  const overviewCards = [
    {
      title: "Receipts This Month",
      value: data.receiptsThisMonth.toString(),
      description: numeral(data.totalReceivedValue).format("$0,0.00"),
      helper: "Total value received this month",
      Icon: ClipboardCheck,
    },
    {
      title: "Pending Acknowledgement",
      value: data.pendingIssues.toString(),
      description: `${data.acknowledgedIssues} acknowledged`,
      helper: `${data.returnedIssues} returned to HQ`,
      Icon: ArrowRightLeft,
    },
    {
      title: "Document Exceptions",
      value: data.documentsPendingReview.toString(),
      description: `${data.documentQueue.length} items in audit queue`,
      helper: "Receipts and issues needing document attention",
      Icon: ShieldAlert,
    },
    {
      title: "Low Stock Watch",
      value: data.lowStockItems.toString(),
      description: `${data.hqUnitsOnHand} total units on hand`,
      helper: `${data.serializedUnits} serialized assets tracked`,
      Icon: AlertTriangle,
    },
    {
      title: "Branch Coverage",
      value: `${data.branchesWithIssuedAssets}/${data.activeBranches}`,
      description: `${data.branchIssues} branch issue records`,
      helper: "Branches currently holding issued assets",
      Icon: Store,
    },
    {
      title: "Active Suppliers",
      value: data.activeSuppliers.toString(),
      description: `${data.supplierHighlights.length} highlighted below`,
      helper: "Suppliers currently feeding HQ stock",
      Icon: Building2,
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div>
        <Header name="OMDS Operations Dashboard" />
        <p className="text-sm text-gray-500 mt-1">
          Live audit trail for receiving, HQ stock, and issue-out activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-5">
        {overviewCards.map(({ title, value, description, helper, Icon }) => (
          <div
            key={title}
            className="bg-white shadow-md rounded-2xl border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                Audit
              </span>
            </div>
            <h2 className="mt-4 text-sm font-medium text-gray-500">{title}</h2>
            <p className="mt-2 text-3xl font-bold text-gray-800">{value}</p>
            <p className="mt-2 text-sm text-gray-600">{description}</p>
            <p className="mt-1 text-xs text-gray-400">{helper}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {data.auditAlerts.map((alert) => (
          <div
            key={alert.alertId}
            className={`rounded-2xl border p-4 ${alertClassNames[alert.severity]}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{alert.title}</p>
              <span className="text-[11px] uppercase tracking-wide">
                {alert.severity}
              </span>
            </div>
            <p className="mt-2 text-sm">{alert.detail}</p>
            <p className="mt-2 text-xs opacity-80">
              Ref: {alert.referenceId} ({alert.referenceType})
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <History className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Recent Activity
              </h2>
              <p className="text-sm text-gray-400">
                Traceable actions across receipts, issue-outs, acknowledgements,
                and returns.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {data.recentActivity.map((activity) => {
              const ActivityIcon = getActivityIcon(activity.activityType);

              return (
                <div
                  key={activity.activityId}
                  className="border border-gray-100 rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full p-2 bg-slate-100">
                      <ActivityIcon className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-700">
                          {activity.activityType}
                        </p>
                        <span className="text-xs text-gray-400">
                          {activity.occurredOn}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {activity.detail}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                        <span className="text-gray-500">
                          By {activity.actor}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full ${
                            statusClassNames[activity.status] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {activity.status}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        Ref: {activity.referenceId}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Document Audit Queue
              </h2>
              <p className="text-sm text-gray-400">
                Receipts and issue records that still need documentation work.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.documentQueue.length > 0 ? (
              data.documentQueue.map((entry) => (
                <div
                  key={entry.queueId}
                  className="border border-gray-100 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-700">{entry.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {entry.entityType} {entry.referenceId}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusClassNames[entry.documentStatus] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {entry.documentStatus}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">{entry.reason}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-400">
                    <span>Owner: {entry.owner}</span>
                    <span>
                      {entry.date} | {entry.documentCount} document(s)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No current document exceptions.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white shadow-md rounded-2xl border border-gray-100">
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Recent Receipts
              </h2>
              <p className="text-sm text-gray-400">
                Latest deliveries logged into HQ stock.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Received Value</p>
              <p className="font-bold text-gray-700">
                {numeral(data.totalReceivedValue).format("$0,0.00")}
              </p>
            </div>
          </div>
          <hr />
          <div className="overflow-x-auto px-6 py-4">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 font-medium">Receipt</th>
                  <th className="py-2 font-medium">Supplier</th>
                  <th className="py-2 font-medium">Arrival</th>
                  <th className="py-2 font-medium">Units</th>
                  <th className="py-2 font-medium">Documents</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentReceipts.map((receipt) => (
                  <tr key={receipt.receiptId} className="border-t">
                    <td className="py-3 font-semibold text-gray-700">
                      {receipt.receiptId}
                    </td>
                    <td className="py-3 text-gray-600">{receipt.supplierName}</td>
                    <td className="py-3 text-gray-600">{receipt.arrivalDate}</td>
                    <td className="py-3 text-gray-600">{receipt.totalQuantity}</td>
                    <td className="py-3 text-gray-600">{receipt.documentCount}</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusClassNames[receipt.documentStatus]
                        }`}
                      >
                        {receipt.documentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <PackageSearch className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Stock Watchlist
              </h2>
              <p className="text-sm text-gray-400">
                Items that need replenishment or closer monitoring.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {data.stockWatchlist.map((item) => (
              <div
                key={item.stockId}
                className="border border-gray-100 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-700">{item.itemName}</p>
                    <p className="text-sm text-gray-500">{item.storageLocation}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      statusClassNames[item.status]
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-600">
                    {item.totalQuantity} unit(s) on hand
                  </span>
                  <span className="text-gray-400">{item.lastArrivalDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white shadow-md rounded-2xl border border-gray-100">
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Issue Lifecycle Register
              </h2>
              <p className="text-sm text-gray-400">
                Most recent issue records with their current audit state.
              </p>
            </div>
            <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
              <ScanBarcode className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <hr />
          <div className="overflow-x-auto px-6 py-4">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 font-medium">Issue</th>
                  <th className="py-2 font-medium">Item</th>
                  <th className="py-2 font-medium">Destination</th>
                  <th className="py-2 font-medium">Date</th>
                  <th className="py-2 font-medium">Documents</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.issueOutQueue.map((issue) => (
                  <tr key={issue.issueId} className="border-t">
                    <td className="py-3 font-semibold text-gray-700">
                      {issue.issueId}
                    </td>
                    <td className="py-3 text-gray-600">
                      {issue.itemName}
                      <p className="text-xs text-gray-400 mt-1">
                        {issue.serialNumber}
                      </p>
                    </td>
                    <td className="py-3 text-gray-600">{issue.issuedTo}</td>
                    <td className="py-3 text-gray-600">{issue.issueDate}</td>
                    <td className="py-3 text-gray-600">
                      {issue.attachments.length || issue.attachmentNames.length}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusClassNames[issue.status]
                        }`}
                      >
                        {issue.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
                <FileCheck2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-700">
                  Supplier Highlights
                </h2>
                <p className="text-sm text-gray-400">
                  Vendors currently supporting HQ intake.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {data.supplierHighlights.map((supplier) => (
                <div
                  key={supplier.supplierId}
                  className="border border-gray-100 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-700">
                        {supplier.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {supplier.categoryFocus}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {supplier.activeContracts} active
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600">
                    Contact: {supplier.contactPerson}
                  </p>
                  <p className="text-sm text-gray-600">
                    Last delivery: {supplier.lastDeliveryDate}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow-md rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
                <Boxes className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-700">
                  Branch Asset Spread
                </h2>
                <p className="text-sm text-gray-400">
                  Current operational coverage across branches.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Active Branches</p>
                <p className="mt-2 text-3xl font-bold text-gray-800">
                  {data.activeBranches}
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 p-4">
                <p className="text-sm text-gray-500">Branches With Assets</p>
                <p className="mt-2 text-3xl font-bold text-gray-800">
                  {data.branchesWithIssuedAssets}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
