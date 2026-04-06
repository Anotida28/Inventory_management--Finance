"use client";

import Header from "@/components/Header";
import { useGetOperationsOverviewQuery } from "@/services/api";
import {
  ArrowRightLeft,
  Boxes,
  Building2,
  ClipboardCheck,
  FileCheck2,
  ScanBarcode,
} from "lucide-react";
import numeral from "numeral";

const statusClassNames: Record<string, string> = {
  Verified: "bg-green-100 text-green-700",
  Logged: "bg-blue-100 text-blue-700",
  "Pending Review": "bg-yellow-100 text-yellow-700",
  Complete: "bg-green-100 text-green-700",
  Missing: "bg-red-100 text-red-700",
  "Pending Dispatch": "bg-gray-100 text-gray-700",
  "In Transit": "bg-blue-100 text-blue-700",
  "Awaiting Acknowledgement": "bg-yellow-100 text-yellow-700",
  Received: "bg-green-100 text-green-700",
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
      description: "Goods logged at HQ and ready for verification.",
      Icon: ClipboardCheck,
    },
    {
      title: "HQ Units On Hand",
      value: data.hqUnitsOnHand.toString(),
      description: `${data.serializedUnits} serialized assets currently tracked.`,
      Icon: Boxes,
    },
    {
      title: "Pending Transfers",
      value: data.pendingTransfers.toString(),
      description: "Branch requests waiting for dispatch or acknowledgement.",
      Icon: ArrowRightLeft,
    },
    {
      title: "Active Suppliers",
      value: data.activeSuppliers.toString(),
      description: `${data.documentsPendingReview} receipts still need document review.`,
      Icon: Building2,
    },
  ];

  return (
    <div className="space-y-6 pb-6">
      <div>
        <Header name="OMDS Operations Dashboard" />
        <p className="text-sm text-gray-500 mt-1">
          Monitor goods received at HQ before they are issued to branches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {overviewCards.map(({ title, value, description, Icon }) => (
          <div
            key={title}
            className="bg-white shadow-md rounded-2xl border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-full p-3 bg-blue-50 border border-blue-100">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                OMDS
              </span>
            </div>
            <h2 className="mt-4 text-sm font-medium text-gray-500">{title}</h2>
            <p className="mt-2 text-3xl font-bold text-gray-800">{value}</p>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white shadow-md rounded-2xl">
          <div className="px-6 pt-5 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">
                Recent Receipts
              </h2>
              <p className="text-sm text-gray-400">
                Latest deliveries logged at HQ.
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
                  <th className="py-2 font-medium">Type</th>
                  <th className="py-2 font-medium">Signer</th>
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
                    <td className="py-3 text-gray-600">{receipt.receiptType}</td>
                    <td className="py-3 text-gray-600">{receipt.signedBy}</td>
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusClassNames[receipt.status]
                        }`}
                      >
                        {receipt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-2xl p-5">
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
      </div>

      <div className="bg-white shadow-md rounded-2xl">
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">
              Transfer Queue
            </h2>
            <p className="text-sm text-gray-400">
              Branch issues after stock is received at HQ.
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
                <th className="py-2 font-medium">Transfer</th>
                <th className="py-2 font-medium">Branch</th>
                <th className="py-2 font-medium">Dispatch</th>
                <th className="py-2 font-medium">Expected</th>
                <th className="py-2 font-medium">Qty</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.transferQueue.map((transfer) => (
                <tr key={transfer.transferId} className="border-t">
                  <td className="py-3 font-semibold text-gray-700">
                    {transfer.transferId}
                  </td>
                  <td className="py-3 text-gray-600">{transfer.branchName}</td>
                  <td className="py-3 text-gray-600">{transfer.dispatchDate}</td>
                  <td className="py-3 text-gray-600">
                    {transfer.expectedArrivalDate}
                  </td>
                  <td className="py-3 text-gray-600">
                    {transfer.totalQuantity}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        statusClassNames[transfer.status]
                      }`}
                    >
                      {transfer.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
