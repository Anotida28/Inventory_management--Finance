"use client";

import Header from "@/components/Header";
import {
  HqStockItem,
  StockMovementRecord,
  useGetHqStockDetailQuery,
  useGetHqStockQuery,
} from "@/services/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  MapPin,
  Search,
  ScanBarcode,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const columns: GridColDef<HqStockItem>[] = [
  { field: "itemName", headerName: "Item", width: 220 },
  { field: "category", headerName: "Category", width: 140 },
  { field: "totalQuantity", headerName: "Units On Hand", width: 130 },
  { field: "serializedUnits", headerName: "Serialized", width: 120 },
  { field: "nonSerializedUnits", headerName: "Bulk Units", width: 120 },
  { field: "supplierName", headerName: "Supplier", width: 190 },
  { field: "storageLocation", headerName: "Storage", width: 140 },
  { field: "lastArrivalDate", headerName: "Last Arrival", width: 130 },
  { field: "status", headerName: "Status", width: 150 },
];

const formatMovementLabel = (movement: StockMovementRecord) => {
  if (movement.referenceType === "receiving_receipt") {
    return `Receipt ${movement.referenceId}`;
  }

  if (movement.referenceType === "issue_record") {
    return `Issue ${movement.referenceId}`;
  }

  return movement.referenceId;
};

const Inventory = () => {
  const searchParams = useSearchParams();
  const { data: stock, isError, isLoading } = useGetHqStockQuery();
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const highlightedStockId = searchParams.get("stockId");
  const {
    data: selectedStock,
    isFetching: isFetchingStockDetail,
  } = useGetHqStockDetailQuery(selectedStockId ?? "", {
    skip: !selectedStockId,
  });

  useEffect(() => {
    setSearchTerm(searchParams.get("search") ?? "");
  }, [searchParams]);

  const stockItems = stock ?? [];
  const totalUnits = stockItems.reduce((sum, item) => sum + item.totalQuantity, 0);
  const serializedUnits = stockItems.reduce(
    (sum, item) => sum + item.serializedUnits,
    0
  );
  const lowStockItems = stockItems.filter(
    (item) => item.status === "Low Stock"
  ).length;
  const storageLocationCount = new Set(
    stockItems.flatMap((item) => item.storageLocations)
  ).size;
  const categoryOptions = Array.from(
    new Set(stockItems.map((item) => item.category))
  ).sort();

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredStock = stockItems.filter((item) => {
    const matchesSearch =
      !normalizedSearch ||
      item.itemName.toLowerCase().includes(normalizedSearch) ||
      item.supplierName.toLowerCase().includes(normalizedSearch) ||
      item.storageLocation.toLowerCase().includes(normalizedSearch) ||
      item.storageLocations.some((location) =>
        location.toLowerCase().includes(normalizedSearch)
      );
    const matchesStatus = statusFilter === "All" || item.status === statusFilter;
    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  useEffect(() => {
    if (!filteredStock.length) {
      setSelectedStockId(null);
      return;
    }

    if (
      highlightedStockId &&
      filteredStock.some((item) => item.stockId === highlightedStockId)
    ) {
      if (selectedStockId !== highlightedStockId) {
        setSelectedStockId(highlightedStockId);
      }
      return;
    }

    if (
      !selectedStockId ||
      !filteredStock.some((item) => item.stockId === selectedStockId)
    ) {
      setSelectedStockId(filteredStock[0].stockId);
    }
  }, [filteredStock, highlightedStockId, selectedStockId]);

  if (isLoading) {
    return <div className="py-4">Loading...</div>;
  }

  if (isError || !stock) {
    return (
      <div className="text-center text-red-500 py-4">
        Failed to fetch HQ stock
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-5">
      <div>
        <Header name="HQ Stock" />
        <p className="text-sm text-gray-500 mt-1">
          Live stock held at HQ after receiving and before branch issue-out.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <Boxes className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">Total Units On Hand</p>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-3">{totalUnits}</p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <ScanBarcode className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">Serialized Assets</p>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-3">
            {serializedUnits}
          </p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">Low Stock Items</p>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-3">{lowStockItems}</p>
        </div>
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-500">Storage Locations</p>
          </div>
          <p className="text-3xl font-bold text-gray-800 mt-3">
            {storageLocationCount}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500"
              placeholder="Search item, supplier, or location"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <select
            className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Reserved">Reserved</option>
            <option value="Low Stock">Low Stock</option>
          </select>
          <select
            className="w-full p-2.5 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:border-blue-500"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="All">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          {filteredStock.length} matching stock item
          {filteredStock.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr,1fr] gap-5">
        <div className="bg-white shadow rounded-2xl border border-gray-100 p-3">
          <DataGrid
            rows={filteredStock}
            columns={columns}
            getRowId={(row) => row.stockId}
            autoHeight
            checkboxSelection
            disableRowSelectionOnClick
            onRowClick={(params) => setSelectedStockId(String(params.row.stockId))}
            className="bg-white rounded-lg border border-gray-200 !text-gray-700"
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">Selected Stock Item</p>
                <h2 className="text-xl font-semibold text-gray-800 mt-1">
                  {selectedStock?.itemName ?? "Choose an item from the table"}
                </h2>
              </div>
              {isFetchingStockDetail && (
                <span className="text-xs text-gray-400">Loading detail...</span>
              )}
            </div>

            {selectedStock ? (
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.category}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Supplier</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.supplierName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Storage Summary</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.storageLocation}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Locations</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.locationCount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Available Serials</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.availableSerialCount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Issued Serials</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.issuedSerialCount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Units On Hand</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.totalQuantity}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Last Arrival</p>
                  <p className="font-medium text-gray-700 mt-1">
                    {selectedStock.lastArrivalDate}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Select an item to see stock movement and serial details.
              </p>
            )}
          </div>

          <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-700">
              Location Breakdown
            </h3>
            <div className="mt-4 space-y-3">
              {selectedStock?.locationBalances.length ? (
                selectedStock.locationBalances.map((locationBalance) => (
                  <div
                    key={locationBalance.balanceId}
                    className="border border-gray-100 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-gray-700">
                        {locationBalance.storageLocation}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">
                        {locationBalance.totalQuantity} units
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Serialized</p>
                        <p className="font-medium text-gray-700 mt-1">
                          {locationBalance.serializedUnits}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Bulk Units</p>
                        <p className="font-medium text-gray-700 mt-1">
                          {locationBalance.nonSerializedUnits}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last Movement</p>
                        <p className="font-medium text-gray-700 mt-1">
                          {locationBalance.lastMovementDate}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No location balances are recorded for this stock item yet.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-700">
              Recent Stock Movements
            </h3>
            <div className="mt-4 space-y-3">
              {selectedStock?.recentMovements.length ? (
                selectedStock.recentMovements.map((movement) => (
                  <div
                    key={movement.movementId}
                    className="border border-gray-100 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {movement.quantityDelta >= 0 ? (
                          <ArrowDownLeft className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          {movement.movementType}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          movement.quantityDelta >= 0
                            ? "text-green-600"
                            : "text-red-500"
                        }`}
                      >
                        {movement.quantityDelta >= 0 ? "+" : ""}
                        {movement.quantityDelta}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {formatMovementLabel(movement)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {movement.movementDate}
                    </p>
                    {movement.storageLocation && (
                      <p className="text-xs text-gray-500 mt-1">
                        Location: {movement.storageLocation}
                      </p>
                    )}
                    {movement.serialNumbers.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2 truncate">
                        Serials: {movement.serialNumbers.join(", ")}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No recorded stock movements for this item yet.
                </p>
              )}
            </div>
          </div>

          <div className="bg-white shadow rounded-2xl border border-gray-100 p-5">
            <h3 className="text-base font-semibold text-gray-700">
              Available Serial Assets
            </h3>
            <div className="mt-4 space-y-2">
              {selectedStock?.availableSerialAssets.length ? (
                selectedStock.availableSerialAssets.slice(0, 8).map((asset) => (
                  <div
                    key={asset.assetId}
                    className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-700">
                      {asset.serialNumber}
                    </span>
                    <span className="text-gray-500">{asset.storageLocation}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No available serial assets for this stock item.
                </p>
              )}
              {selectedStock &&
                selectedStock.availableSerialAssets.length > 8 && (
                  <p className="text-xs text-gray-400">
                    Showing 8 of {selectedStock.availableSerialAssets.length} available
                    serial assets.
                  </p>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
