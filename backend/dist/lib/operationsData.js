"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationsOverviewData = exports.returnIssueRecordData = exports.acknowledgeIssueRecordData = exports.createIssueRecordData = exports.getAvailableSerialAssetsData = exports.getIssueAttachmentByIdData = exports.getIssueRecordByIdData = exports.getIssueRecordsData = exports.getHqStockDetailData = exports.getHqStockData = exports.getBranchesData = exports.getSuppliersData = exports.getReceivingReceiptsData = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const date_1 = require("./date");
const stockLocationBalances_1 = require("./stockLocationBalances");
const { DatabaseSync } = require("node:sqlite");
const supplierSeeds = [
    {
        supplierId: "SUP-001",
        name: "Zim Office Tech",
        contactPerson: "Tariro Moyo",
        phone: "+263 77 120 4481",
        email: "deliveries@zimofficetech.co.zw",
        categoryFocus: "Computers and Peripherals",
        lastDeliveryDate: "2026-04-03",
        activeContracts: 3,
    },
    {
        supplierId: "SUP-002",
        name: "SecureNet Distribution",
        contactPerson: "Brian Chikore",
        phone: "+263 77 344 2109",
        email: "ops@securenetdistribution.co.zw",
        categoryFocus: "Networking and Security",
        lastDeliveryDate: "2026-03-28",
        activeContracts: 2,
    },
    {
        supplierId: "SUP-003",
        name: "Office Source Wholesale",
        contactPerson: "Rudo Dube",
        phone: "+263 71 889 3410",
        email: "support@officesource.africa",
        categoryFocus: "Furniture and Consumables",
        lastDeliveryDate: "2026-03-19",
        activeContracts: 1,
    },
    {
        supplierId: "SUP-004",
        name: "Prime Devices Africa",
        contactPerson: "Elton Ncube",
        phone: "+263 78 445 6612",
        email: "hq@primedevices.africa",
        categoryFocus: "Mobile and Field Devices",
        lastDeliveryDate: "2026-04-01",
        activeContracts: 4,
    },
];
const branchSeeds = [
    {
        branchId: "BR-001",
        name: "Harare Branch",
        code: "HAR",
        address: "45 Samora Machel Avenue, Harare",
        region: "Harare",
        contactPerson: "F. Muchengeti",
        phone: "+263 77 210 4401",
        status: "Active",
    },
    {
        branchId: "BR-002",
        name: "Bulawayo Branch",
        code: "BYO",
        address: "12 Jason Moyo Road, Bulawayo",
        region: "Bulawayo",
        contactPerson: "T. Nkomo",
        phone: "+263 77 210 4402",
        status: "Active",
    },
    {
        branchId: "BR-003",
        name: "Mutare Branch",
        code: "MTA",
        address: "16 Herbert Chitepo Street, Mutare",
        region: "Manicaland",
        contactPerson: "B. Nyoni",
        phone: "+263 77 210 4403",
        status: "Active",
    },
    {
        branchId: "BR-004",
        name: "Gweru Branch",
        code: "GWE",
        address: "8 Main Street, Gweru",
        region: "Midlands",
        contactPerson: "K. Mpofu",
        phone: "+263 77 210 4404",
        status: "Active",
    },
    {
        branchId: "BR-005",
        name: "Masvingo Branch",
        code: "MSV",
        address: "22 Simon Mazorodze Road, Masvingo",
        region: "Masvingo",
        contactPerson: "L. Moyo",
        phone: "+263 77 210 4405",
        status: "Active",
    },
];
const configuredDatabasePath = process.env.OPERATIONS_DB_PATH || "./data/operations.sqlite";
const resolvedDatabasePath = path_1.default.isAbsolute(configuredDatabasePath)
    ? configuredDatabasePath
    : path_1.default.join(process.cwd(), configuredDatabasePath);
fs_1.default.mkdirSync(path_1.default.dirname(resolvedDatabasePath), { recursive: true });
const db = new DatabaseSync(resolvedDatabasePath);
const parseAttachmentNames = (value) => {
    if (!value)
        return [];
    try {
        return JSON.parse(value);
    }
    catch (_a) {
        return [];
    }
};
const normalizeOptionalString = (value) => {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmedValue = value.trim();
    return trimmedValue ? trimmedValue : undefined;
};
const normalizeIssueRecordInput = (newIssueRecord) => ({
    itemName: normalizeOptionalString(newIssueRecord.itemName),
    serialNumber: normalizeOptionalString(newIssueRecord.serialNumber),
    branchId: normalizeOptionalString(newIssueRecord.branchId),
    issuedTo: normalizeOptionalString(newIssueRecord.issuedTo),
    issuedBy: normalizeOptionalString(newIssueRecord.issuedBy),
    address: normalizeOptionalString(newIssueRecord.address),
    issueDate: normalizeOptionalString(newIssueRecord.issueDate),
    notes: normalizeOptionalString(newIssueRecord.notes),
});
const getTodayDate = () => (0, date_1.getBusinessTodayDate)();
const mapIssueRecord = (row) => ({
    issueId: row.issueId,
    itemName: row.itemName,
    serialNumber: row.serialNumber,
    destinationType: row.destinationType,
    branchId: normalizeOptionalString(row.branchId),
    issuedTo: row.issuedTo,
    issuedBy: row.issuedBy,
    address: row.address,
    issueDate: row.issueDate,
    attachmentNames: parseAttachmentNames(row.attachmentNames),
    attachments: [],
    notes: normalizeOptionalString(row.notes),
    acknowledgedBy: normalizeOptionalString(row.acknowledgedBy),
    acknowledgedAt: normalizeOptionalString(row.acknowledgedAt),
    acknowledgementNotes: normalizeOptionalString(row.acknowledgementNotes),
    returnedBy: normalizeOptionalString(row.returnedBy),
    returnedAt: normalizeOptionalString(row.returnedAt),
    returnNotes: normalizeOptionalString(row.returnNotes),
    status: row.status,
});
const mapSerialAsset = (row) => {
    var _a;
    return ({
        assetId: row.assetId,
        stockId: row.stockId,
        itemName: row.itemName,
        serialNumber: row.serialNumber,
        supplierName: row.supplierName,
        lastArrivalDate: row.lastArrivalDate,
        storageLocation: row.storageLocation,
        status: row.status,
        issueId: (_a = row.issueId) !== null && _a !== void 0 ? _a : undefined,
    });
};
const mapStockMovement = (row) => {
    var _a;
    return ({
        movementId: row.movementId,
        stockId: row.stockId,
        itemName: row.itemName,
        movementType: row.movementType,
        quantityDelta: row.quantityDelta,
        movementDate: row.movementDate,
        referenceType: row.referenceType,
        referenceId: row.referenceId,
        storageLocation: normalizeOptionalString(row.storageLocation),
        serialNumbers: parseAttachmentNames(row.serialNumbers),
        notes: (_a = row.notes) !== null && _a !== void 0 ? _a : undefined,
    });
};
const getPublicApiBaseUrl = () => process.env.PUBLIC_API_BASE_URL ||
    `http://localhost:${process.env.PORT || 3001}`;
const mapIssueAttachment = (row) => ({
    attachmentId: row.attachmentId,
    issueId: row.issueId,
    originalName: row.originalName,
    storedName: row.storedName,
    storagePath: row.storagePath,
    mimeType: row.mimeType,
    fileSize: row.fileSize,
    uploadedAt: row.uploadedAt,
    downloadUrl: `${getPublicApiBaseUrl()}/operations/attachments/${row.attachmentId}/download`,
});
const getHqStockStatus = (currentStatus, nextTotalQuantity) => {
    if (currentStatus === "Reserved") {
        return "Reserved";
    }
    return nextTotalQuantity <= 5 ? "Low Stock" : "Available";
};
const getTableColumns = (tableName) => {
    return db
        .prepare(`PRAGMA table_info(${tableName})`)
        .all().map((column) => column.name);
};
const migrateIssueRecordsTableIfNeeded = () => {
    const issueRecordColumns = getTableColumns("issue_records");
    if (issueRecordColumns.length > 0 &&
        issueRecordColumns.includes("branchId") &&
        issueRecordColumns.includes("acknowledgedBy") &&
        issueRecordColumns.includes("returnedAt")) {
        return;
    }
    if (issueRecordColumns.length === 0) {
        return;
    }
    db.exec("BEGIN");
    try {
        db.exec(`
      ALTER TABLE issue_records RENAME TO issue_records_legacy;

      CREATE TABLE issue_records (
        issueId TEXT PRIMARY KEY,
        itemName TEXT NOT NULL,
        serialNumber TEXT NOT NULL,
        destinationType TEXT NOT NULL,
        branchId TEXT,
        issuedTo TEXT NOT NULL,
        issuedBy TEXT NOT NULL,
        address TEXT NOT NULL,
        issueDate TEXT NOT NULL,
        attachmentNames TEXT NOT NULL DEFAULT '[]',
        notes TEXT,
        acknowledgedBy TEXT,
        acknowledgedAt TEXT,
        acknowledgementNotes TEXT,
        returnedBy TEXT,
        returnedAt TEXT,
        returnNotes TEXT,
        status TEXT NOT NULL
      );

      INSERT INTO issue_records (
        issueId,
        itemName,
        serialNumber,
        destinationType,
        branchId,
        issuedTo,
        issuedBy,
        address,
        issueDate,
        attachmentNames,
        notes,
        acknowledgedBy,
        acknowledgedAt,
        acknowledgementNotes,
        returnedBy,
        returnedAt,
        returnNotes,
        status
      )
      SELECT
        issueId,
        itemName,
        serialNumber,
        destinationType,
        NULL,
        issuedTo,
        issuedBy,
        address,
        issueDate,
        attachmentNames,
        notes,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        status
      FROM issue_records_legacy;

      DROP TABLE issue_records_legacy;
    `);
        db.exec("COMMIT");
    }
    catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
};
const backfillIssueRecordBranchIds = () => {
    const branches = db
        .prepare(`
        SELECT
          branchId,
          name,
          address
        FROM branches
        WHERE status = 'Active'
      `)
        .all();
    if (branches.length === 0) {
        return;
    }
    const assignBranchId = db.prepare(`
    UPDATE issue_records
    SET branchId = ?, address = ?
    WHERE destinationType = 'Branch'
      AND issuedTo = ?
      AND (branchId IS NULL OR branchId = '')
  `);
    branches.forEach((branch) => {
        assignBranchId.run(branch.branchId, branch.address, branch.name);
    });
};
const backfillStockLocationBalancesIfNeeded = () => {
    const balanceCount = db
        .prepare("SELECT COUNT(*) AS count FROM hq_stock_location_balances")
        .get().count || 0;
    const stockCount = db.prepare("SELECT COUNT(*) AS count FROM hq_stock_items").get().count || 0;
    if (balanceCount > 0 || stockCount === 0) {
        return;
    }
    const stockItems = db
        .prepare(`
        SELECT
          stockId,
          totalQuantity,
          storageLocation
        FROM hq_stock_items
      `)
        .all();
    const serializedByLocation = db
        .prepare(`
          SELECT
            stockId,
            storageLocation,
            COUNT(*) AS count
          FROM hq_serial_assets
          WHERE status = 'Available'
          GROUP BY stockId, storageLocation
        `)
        .all().reduce((accumulator, row) => {
        const key = `${row.stockId}::${row.storageLocation}`;
        accumulator.set(key, {
            storageLocation: row.storageLocation,
            serializedUnits: row.count,
            nonSerializedUnits: 0,
        });
        return accumulator;
    }, new Map());
    const receiptLineColumns = getTableColumns("receiving_receipt_lines");
    const nonSerializedByStockId = new Map();
    if (receiptLineColumns.length > 0) {
        const nonSerializedReceiptRows = db
            .prepare(`
          SELECT
            stock.stockId,
            lines.storageLocation,
            SUM(lines.quantity) AS quantity
          FROM receiving_receipt_lines AS lines
          INNER JOIN hq_stock_items AS stock
            ON stock.itemName = lines.itemName
          WHERE lines.isSerialized = 0
          GROUP BY stock.stockId, lines.storageLocation
        `)
            .all();
        nonSerializedReceiptRows.forEach((row) => {
            var _a;
            const stockLocations = (_a = nonSerializedByStockId.get(row.stockId)) !== null && _a !== void 0 ? _a : new Map();
            stockLocations.set(row.storageLocation, {
                storageLocation: row.storageLocation,
                nonSerializedUnits: row.quantity,
            });
            nonSerializedByStockId.set(row.stockId, stockLocations);
        });
    }
    db.exec("BEGIN");
    try {
        stockItems.forEach((stockItem) => {
            var _a, _b, _c, _d, _e, _f;
            const locationEntries = new Map();
            Array.from(serializedByLocation.entries())
                .filter(([key]) => key.startsWith(`${stockItem.stockId}::`))
                .forEach(([, value]) => {
                locationEntries.set(value.storageLocation, Object.assign({}, value));
            });
            const nonSerializedLocations = nonSerializedByStockId.get(stockItem.stockId);
            const availableSerializedUnits = Array.from(locationEntries.values()).reduce((sum, entry) => sum + entry.serializedUnits, 0);
            const expectedNonSerializedUnits = Math.max(stockItem.totalQuantity - availableSerializedUnits, 0);
            if (nonSerializedLocations && nonSerializedLocations.size > 0) {
                const fromReceipts = Array.from(nonSerializedLocations.values()).reduce((sum, entry) => sum + entry.nonSerializedUnits, 0);
                if (fromReceipts <= expectedNonSerializedUnits) {
                    nonSerializedLocations.forEach((entry) => {
                        var _a, _b;
                        const existingEntry = locationEntries.get(entry.storageLocation);
                        locationEntries.set(entry.storageLocation, {
                            storageLocation: entry.storageLocation,
                            serializedUnits: (_a = existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.serializedUnits) !== null && _a !== void 0 ? _a : 0,
                            nonSerializedUnits: ((_b = existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.nonSerializedUnits) !== null && _b !== void 0 ? _b : 0) + entry.nonSerializedUnits,
                        });
                    });
                    const remainder = expectedNonSerializedUnits - fromReceipts;
                    if (remainder > 0) {
                        const fallbackLocation = stockItem.storageLocation || "Unassigned";
                        const existingEntry = locationEntries.get(fallbackLocation);
                        locationEntries.set(fallbackLocation, {
                            storageLocation: fallbackLocation,
                            serializedUnits: (_a = existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.serializedUnits) !== null && _a !== void 0 ? _a : 0,
                            nonSerializedUnits: ((_b = existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.nonSerializedUnits) !== null && _b !== void 0 ? _b : 0) + remainder,
                        });
                    }
                }
                else {
                    const fallbackLocation = stockItem.storageLocation || "Unassigned";
                    const existingEntry = locationEntries.get(fallbackLocation);
                    locationEntries.set(fallbackLocation, {
                        storageLocation: fallbackLocation,
                        serializedUnits: (_c = existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.serializedUnits) !== null && _c !== void 0 ? _c : 0,
                        nonSerializedUnits: ((_d = existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.nonSerializedUnits) !== null && _d !== void 0 ? _d : 0) + expectedNonSerializedUnits,
                    });
                }
            }
            else if (expectedNonSerializedUnits > 0) {
                const fallbackLocation = stockItem.storageLocation || "Unassigned";
                const existingEntry = locationEntries.get(fallbackLocation);
                locationEntries.set(fallbackLocation, {
                    storageLocation: fallbackLocation,
                    serializedUnits: (_e = existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.serializedUnits) !== null && _e !== void 0 ? _e : 0,
                    nonSerializedUnits: ((_f = existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.nonSerializedUnits) !== null && _f !== void 0 ? _f : 0) + expectedNonSerializedUnits,
                });
            }
            Array.from(locationEntries.values())
                .filter((entry) => entry.serializedUnits > 0 || entry.nonSerializedUnits > 0)
                .forEach((entry) => {
                (0, stockLocationBalances_1.adjustStockLocationBalance)(db, {
                    stockId: stockItem.stockId,
                    storageLocation: entry.storageLocation,
                    quantityDelta: entry.serializedUnits + entry.nonSerializedUnits,
                    serializedDelta: entry.serializedUnits,
                    nonSerializedDelta: entry.nonSerializedUnits,
                    movementDate: getTodayDate(),
                });
            });
        });
        db.exec("COMMIT");
    }
    catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
};
const initializeDatabase = () => {
    db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS suppliers (
      supplierId TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contactPerson TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      categoryFocus TEXT NOT NULL,
      lastDeliveryDate TEXT NOT NULL,
      activeContracts INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      branchId TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      address TEXT NOT NULL,
      region TEXT NOT NULL,
      contactPerson TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receiving_receipts (
      receiptId TEXT PRIMARY KEY,
      receiptType TEXT NOT NULL,
      supplierId TEXT NOT NULL,
      supplierName TEXT NOT NULL,
      arrivalDate TEXT NOT NULL,
      signedBy TEXT NOT NULL,
      receivedBy TEXT NOT NULL,
      itemCount INTEGER NOT NULL,
      totalQuantity INTEGER NOT NULL,
      totalAmount REAL NOT NULL,
      documentCount INTEGER NOT NULL,
      documentStatus TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hq_stock_items (
      stockId TEXT PRIMARY KEY,
      itemName TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      totalQuantity INTEGER NOT NULL,
      serializedUnits INTEGER NOT NULL,
      nonSerializedUnits INTEGER NOT NULL,
      supplierName TEXT NOT NULL,
      lastArrivalDate TEXT NOT NULL,
      storageLocation TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issue_records (
      issueId TEXT PRIMARY KEY,
      itemName TEXT NOT NULL,
      serialNumber TEXT NOT NULL,
      destinationType TEXT NOT NULL,
      branchId TEXT,
      issuedTo TEXT NOT NULL,
      issuedBy TEXT NOT NULL,
      address TEXT NOT NULL,
      issueDate TEXT NOT NULL,
      attachmentNames TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      acknowledgedBy TEXT,
      acknowledgedAt TEXT,
      acknowledgementNotes TEXT,
      returnedBy TEXT,
      returnedAt TEXT,
      returnNotes TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
      attachmentId TEXT PRIMARY KEY,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      originalName TEXT NOT NULL,
      storedName TEXT NOT NULL,
      storagePath TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      uploadedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hq_serial_assets (
      assetId TEXT PRIMARY KEY,
      stockId TEXT NOT NULL,
      itemName TEXT NOT NULL,
      serialNumber TEXT NOT NULL UNIQUE,
      supplierName TEXT NOT NULL,
      lastArrivalDate TEXT NOT NULL,
      storageLocation TEXT NOT NULL,
      status TEXT NOT NULL,
      issueId TEXT
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      movementId TEXT PRIMARY KEY,
      movementType TEXT NOT NULL,
      stockId TEXT NOT NULL,
      itemName TEXT NOT NULL,
      quantityDelta INTEGER NOT NULL,
      movementDate TEXT NOT NULL,
      referenceType TEXT NOT NULL,
      referenceId TEXT NOT NULL,
      storageLocation TEXT,
      serialNumbers TEXT,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_hq_serial_assets_item_status
    ON hq_serial_assets (itemName, status);

    CREATE INDEX IF NOT EXISTS idx_attachments_entity
    ON attachments (entityType, entityId);

    CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
    ON stock_movements (referenceType, referenceId);

    CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_date
    ON stock_movements (stockId, movementDate);
  `);
    (0, stockLocationBalances_1.ensureStockLocationBalanceSchema)(db);
    migrateIssueRecordsTableIfNeeded();
    const stockMovementColumns = getTableColumns("stock_movements");
    if (stockMovementColumns.length > 0 &&
        !stockMovementColumns.includes("storageLocation")) {
        db.exec(`
      ALTER TABLE stock_movements
      ADD COLUMN storageLocation TEXT
    `);
    }
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_issue_records_status
    ON issue_records (status, issueDate);

    CREATE INDEX IF NOT EXISTS idx_issue_records_branch
    ON issue_records (branchId, destinationType);
  `);
    const supplierCount = db.prepare("SELECT COUNT(*) AS count FROM suppliers").get().count || 0;
    const branchCount = db.prepare("SELECT COUNT(*) AS count FROM branches").get().count || 0;
    if (supplierCount === 0) {
        const insertSupplier = db.prepare(`
      INSERT INTO suppliers (
        supplierId,
        name,
        contactPerson,
        phone,
        email,
        categoryFocus,
        lastDeliveryDate,
        activeContracts
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        supplierSeeds.forEach((supplier) => {
            insertSupplier.run(supplier.supplierId, supplier.name, supplier.contactPerson, supplier.phone, supplier.email, supplier.categoryFocus, supplier.lastDeliveryDate, supplier.activeContracts);
        });
    }
    if (branchCount === 0) {
        const insertBranch = db.prepare(`
      INSERT INTO branches (
        branchId,
        name,
        code,
        address,
        region,
        contactPerson,
        phone,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        branchSeeds.forEach((branch) => {
            insertBranch.run(branch.branchId, branch.name, branch.code, branch.address, branch.region, branch.contactPerson, branch.phone, branch.status);
        });
    }
    backfillIssueRecordBranchIds();
    backfillStockLocationBalancesIfNeeded();
};
initializeDatabase();
const getReceivingReceiptsData = () => {
    return db
        .prepare(`
        SELECT
          receiptId,
          receiptType,
          supplierId,
          supplierName,
          arrivalDate,
          signedBy,
          receivedBy,
          itemCount,
          totalQuantity,
          totalAmount,
          documentCount,
          documentStatus,
          status
        FROM receiving_receipts
        ORDER BY arrivalDate DESC, receiptId DESC
      `)
        .all();
};
exports.getReceivingReceiptsData = getReceivingReceiptsData;
const getSuppliersData = () => {
    return db
        .prepare(`
        SELECT
          supplierId,
          name,
          contactPerson,
          phone,
          email,
          categoryFocus,
          lastDeliveryDate,
          activeContracts
        FROM suppliers
        ORDER BY name ASC
      `)
        .all();
};
exports.getSuppliersData = getSuppliersData;
const getBranchesData = () => {
    return db
        .prepare(`
        SELECT
          branchId,
          name,
          code,
          address,
          region,
          contactPerson,
          phone,
          status
        FROM branches
        ORDER BY status DESC, name ASC
      `)
        .all();
};
exports.getBranchesData = getBranchesData;
const getHqStockData = () => {
    const stockRows = db
        .prepare(`
        SELECT
          stockId,
          itemName,
          category,
          totalQuantity,
          serializedUnits,
          nonSerializedUnits,
          supplierName,
          lastArrivalDate,
          storageLocation,
          status
        FROM hq_stock_items
        ORDER BY itemName ASC
      `)
        .all();
    const locationBalancesByStockId = (0, stockLocationBalances_1.getStockLocationBalancesByStockIds)(db, stockRows.map((stockItem) => stockItem.stockId));
    const availableSerialRows = db
        .prepare(`
        SELECT
          stockId,
          COUNT(*) AS count
        FROM hq_serial_assets
        WHERE status = 'Available'
        GROUP BY stockId
      `)
        .all();
    const availableSerialCounts = new Map(availableSerialRows.map((row) => [row.stockId, row.count]));
    return stockRows.map((stockItem) => {
        var _a, _b;
        const locationBalances = (_a = locationBalancesByStockId.get(stockItem.stockId)) !== null && _a !== void 0 ? _a : [];
        const availableSerializedUnits = Math.min((_b = availableSerialCounts.get(stockItem.stockId)) !== null && _b !== void 0 ? _b : 0, stockItem.totalQuantity);
        const storageLocations = locationBalances.map((locationBalance) => locationBalance.storageLocation);
        return Object.assign(Object.assign({}, stockItem), { storageLocation: locationBalances.length > 0
                ? (0, stockLocationBalances_1.getStorageLocationSummary)(locationBalances)
                : stockItem.storageLocation || "Unassigned", locationCount: locationBalances.length > 0
                ? locationBalances.length
                : stockItem.totalQuantity > 0 && stockItem.storageLocation
                    ? 1
                    : 0, storageLocations: storageLocations.length > 0
                ? storageLocations
                : stockItem.storageLocation
                    ? [stockItem.storageLocation]
                    : [], serializedUnits: availableSerializedUnits, nonSerializedUnits: Math.max(stockItem.totalQuantity - availableSerializedUnits, 0) });
    });
};
exports.getHqStockData = getHqStockData;
const getStockMovementsByStockId = (stockId, limit = 12) => {
    const rows = db
        .prepare(`
        SELECT
          movementId,
          stockId,
          itemName,
          movementType,
          quantityDelta,
          movementDate,
          referenceType,
          referenceId,
          storageLocation,
          serialNumbers,
          notes
        FROM stock_movements
        WHERE stockId = ?
        ORDER BY movementDate DESC, movementId DESC
        LIMIT ?
      `)
        .all(stockId, limit);
    return rows.map(mapStockMovement);
};
const getHqStockDetailData = (stockId) => {
    const stockItem = (0, exports.getHqStockData)().find((item) => item.stockId === stockId);
    if (!stockItem) {
        return null;
    }
    const availableSerialAssets = (0, exports.getAvailableSerialAssetsData)(stockItem.itemName);
    const issuedSerialCount = db
        .prepare(`
          SELECT COUNT(*) AS count
          FROM hq_serial_assets
          WHERE stockId = ? AND status = 'Issued'
        `)
        .get(stockId).count || 0;
    return Object.assign(Object.assign({}, stockItem), { availableSerialCount: availableSerialAssets.length, issuedSerialCount, locationBalances: (0, stockLocationBalances_1.getStockLocationBalancesByStockId)(db, stockId), recentMovements: getStockMovementsByStockId(stockId), availableSerialAssets });
};
exports.getHqStockDetailData = getHqStockDetailData;
const getIssueAttachmentsByIssueIds = (issueIds) => {
    const attachmentsByIssueId = new Map();
    if (issueIds.length === 0) {
        return attachmentsByIssueId;
    }
    const placeholders = issueIds.map(() => "?").join(", ");
    const rows = db
        .prepare(`
        SELECT
          attachmentId,
          entityId AS issueId,
          originalName,
          storedName,
          storagePath,
          mimeType,
          fileSize,
          uploadedAt
        FROM attachments
        WHERE entityType = 'issue_record' AND entityId IN (${placeholders})
        ORDER BY uploadedAt ASC, originalName ASC
      `)
        .all(...issueIds);
    rows.forEach((row) => {
        var _a;
        const mappedAttachment = mapIssueAttachment(row);
        const issueAttachments = (_a = attachmentsByIssueId.get(mappedAttachment.issueId)) !== null && _a !== void 0 ? _a : [];
        issueAttachments.push(mappedAttachment);
        attachmentsByIssueId.set(mappedAttachment.issueId, issueAttachments);
    });
    return attachmentsByIssueId;
};
const getIssueRecordsData = () => {
    const rows = db
        .prepare(`
        SELECT
          issueId,
          itemName,
          serialNumber,
          destinationType,
          branchId,
          issuedTo,
          issuedBy,
          address,
          issueDate,
          attachmentNames,
          notes,
          acknowledgedBy,
          acknowledgedAt,
          acknowledgementNotes,
          returnedBy,
          returnedAt,
          returnNotes,
          status
        FROM issue_records
        ORDER BY issueDate DESC, issueId DESC
      `)
        .all();
    const issueAttachmentsByIssueId = getIssueAttachmentsByIssueIds(rows.map((row) => row.issueId));
    return rows.map((row) => {
        var _a;
        const mappedIssue = mapIssueRecord(row);
        const attachments = (_a = issueAttachmentsByIssueId.get(mappedIssue.issueId)) !== null && _a !== void 0 ? _a : [];
        return Object.assign(Object.assign({}, mappedIssue), { attachments, attachmentNames: attachments.length > 0
                ? attachments.map((attachment) => attachment.originalName)
                : mappedIssue.attachmentNames });
    });
};
exports.getIssueRecordsData = getIssueRecordsData;
const getIssueRecordByIdData = (issueId) => {
    var _a;
    return (_a = (0, exports.getIssueRecordsData)().find((issue) => issue.issueId === issueId)) !== null && _a !== void 0 ? _a : null;
};
exports.getIssueRecordByIdData = getIssueRecordByIdData;
const getIssueAttachmentByIdData = (attachmentId) => {
    const row = db
        .prepare(`
        SELECT
          attachmentId,
          entityId AS issueId,
          originalName,
          storedName,
          storagePath,
          mimeType,
          fileSize,
          uploadedAt
        FROM attachments
        WHERE entityType = 'issue_record' AND attachmentId = ?
      `)
        .get(attachmentId);
    if (!row) {
        return null;
    }
    return mapIssueAttachment(row);
};
exports.getIssueAttachmentByIdData = getIssueAttachmentByIdData;
const getAvailableSerialAssetsData = (itemName) => {
    const rows = itemName
        ? db
            .prepare(`
            SELECT
              assetId,
              stockId,
              itemName,
              serialNumber,
              supplierName,
              lastArrivalDate,
              storageLocation,
              status,
              issueId
            FROM hq_serial_assets
            WHERE status = 'Available' AND itemName = ?
            ORDER BY itemName ASC, serialNumber ASC
          `)
            .all(itemName)
        : db
            .prepare(`
            SELECT
              assetId,
              stockId,
              itemName,
              serialNumber,
              supplierName,
              lastArrivalDate,
              storageLocation,
              status,
              issueId
            FROM hq_serial_assets
            WHERE status = 'Available'
            ORDER BY itemName ASC, serialNumber ASC
          `)
            .all();
    return rows.map(mapSerialAsset);
};
exports.getAvailableSerialAssetsData = getAvailableSerialAssetsData;
const getBranchById = (branchId) => {
    return db
        .prepare(`
          SELECT
            branchId,
            name,
            code,
            address,
            region,
            contactPerson,
            phone,
            status
          FROM branches
          WHERE branchId = ?
        `)
        .get(branchId);
};
const getBranchByName = (branchName) => {
    return db
        .prepare(`
          SELECT
            branchId,
            name,
            code,
            address,
            region,
            contactPerson,
            phone,
            status
          FROM branches
          WHERE name = ?
        `)
        .get(branchName);
};
const updateHqStockLevels = (stockItem, nextTotalQuantity) => {
    const remainingAvailableSerials = db
        .prepare(`
          SELECT COUNT(*) AS count
          FROM hq_serial_assets
          WHERE stockId = ? AND status = 'Available'
        `)
        .get(stockItem.stockId).count || 0;
    const nextSerializedUnits = Math.min(remainingAvailableSerials, nextTotalQuantity);
    const nextNonSerializedUnits = Math.max(nextTotalQuantity - nextSerializedUnits, 0);
    const nextStatus = getHqStockStatus(stockItem.status, nextTotalQuantity);
    db.prepare(`
      UPDATE hq_stock_items
      SET
        totalQuantity = ?,
        serializedUnits = ?,
        nonSerializedUnits = ?,
        status = ?
      WHERE stockId = ?
    `).run(nextTotalQuantity, nextSerializedUnits, nextNonSerializedUnits, nextStatus, stockItem.stockId);
};
const createIssueRecordData = (newIssueRecord, uploadedAttachments = []) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const highestIssueSequence = db
        .prepare("SELECT MAX(CAST(SUBSTR(issueId, 10) AS INTEGER)) AS sequence FROM issue_records")
        .get().sequence || 0;
    const issueId = `ISS-${new Date().getFullYear()}-${String(highestIssueSequence + 1).padStart(3, "0")}`;
    const normalizedInput = normalizeIssueRecordInput(newIssueRecord);
    const isBranchIssue = newIssueRecord.destinationType === "Branch";
    const isPersonIssue = newIssueRecord.destinationType === "Person";
    if (!isBranchIssue && !isPersonIssue) {
        throw new Error("Invalid issue destination type");
    }
    if (!normalizedInput.itemName ||
        !normalizedInput.serialNumber ||
        !normalizedInput.issuedBy ||
        !normalizedInput.issueDate) {
        throw new Error("Missing required issue-out fields");
    }
    if (isPersonIssue &&
        (!normalizedInput.issuedTo || !normalizedInput.address)) {
        throw new Error("Missing required issue-out fields");
    }
    if (isBranchIssue &&
        !normalizedInput.branchId &&
        !normalizedInput.issuedTo) {
        throw new Error("Missing required issue-out fields");
    }
    const selectedBranch = isBranchIssue
        ? normalizedInput.branchId
            ? getBranchById(normalizedInput.branchId)
            : getBranchByName(normalizedInput.issuedTo)
        : undefined;
    if (isBranchIssue && (!selectedBranch || selectedBranch.status !== "Active")) {
        throw new Error("Selected branch was not found");
    }
    const resolvedIssuedTo = (_a = selectedBranch === null || selectedBranch === void 0 ? void 0 : selectedBranch.name) !== null && _a !== void 0 ? _a : normalizedInput.issuedTo;
    const resolvedAddress = (_b = selectedBranch === null || selectedBranch === void 0 ? void 0 : selectedBranch.address) !== null && _b !== void 0 ? _b : normalizedInput.address;
    if (!resolvedIssuedTo || !resolvedAddress) {
        throw new Error("Missing required issue-out fields");
    }
    const existingActiveIssue = db
        .prepare(`
        SELECT issueId
        FROM issue_records
        WHERE serialNumber = ? AND status != 'Returned'
      `)
        .get(normalizedInput.serialNumber);
    if (existingActiveIssue) {
        throw new Error("This serial number has already been issued");
    }
    const matchingStockItem = db
        .prepare("SELECT * FROM hq_stock_items WHERE itemName = ?")
        .get(normalizedInput.itemName);
    if (!matchingStockItem) {
        throw new Error("Item was not found in HQ stock");
    }
    if (matchingStockItem.totalQuantity <= 0) {
        throw new Error("No stock remains for this item");
    }
    const availableSerialAsset = db
        .prepare(`
        SELECT
          assetId,
          stockId,
          serialNumber,
          storageLocation
        FROM hq_serial_assets
        WHERE itemName = ? AND serialNumber = ? AND status = 'Available'
      `)
        .get(normalizedInput.itemName, normalizedInput.serialNumber);
    if (!availableSerialAsset) {
        throw new Error("Selected serial number is not available in HQ stock");
    }
    const nextTotalQuantity = Math.max(matchingStockItem.totalQuantity - 1, 0);
    const attachmentNames = uploadedAttachments.length > 0
        ? uploadedAttachments.map((attachment) => attachment.originalName)
        : (_c = newIssueRecord.attachmentNames) !== null && _c !== void 0 ? _c : [];
    const createdRecord = {
        issueId,
        itemName: normalizedInput.itemName,
        serialNumber: normalizedInput.serialNumber,
        destinationType: newIssueRecord.destinationType,
        branchId: selectedBranch === null || selectedBranch === void 0 ? void 0 : selectedBranch.branchId,
        issuedTo: resolvedIssuedTo,
        issuedBy: normalizedInput.issuedBy,
        address: resolvedAddress,
        issueDate: normalizedInput.issueDate,
        attachmentNames,
        attachments: [],
        notes: normalizedInput.notes,
        status: "Issued",
    };
    db.exec("BEGIN");
    try {
        db.prepare(`
        INSERT INTO issue_records (
          issueId,
          itemName,
          serialNumber,
          destinationType,
          branchId,
          issuedTo,
          issuedBy,
          address,
          issueDate,
          attachmentNames,
          notes,
          acknowledgedBy,
          acknowledgedAt,
          acknowledgementNotes,
          returnedBy,
          returnedAt,
          returnNotes,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(createdRecord.issueId, createdRecord.itemName, createdRecord.serialNumber, createdRecord.destinationType, (_d = createdRecord.branchId) !== null && _d !== void 0 ? _d : null, createdRecord.issuedTo, createdRecord.issuedBy, createdRecord.address, createdRecord.issueDate, JSON.stringify(createdRecord.attachmentNames), (_e = createdRecord.notes) !== null && _e !== void 0 ? _e : null, null, null, null, null, null, null, createdRecord.status);
        if (uploadedAttachments.length > 0) {
            const insertAttachment = db.prepare(`
          INSERT INTO attachments (
            attachmentId,
            entityType,
            entityId,
            originalName,
            storedName,
            storagePath,
            mimeType,
            fileSize,
            uploadedAt
          ) VALUES (?, 'issue_record', ?, ?, ?, ?, ?, ?, ?)
        `);
            uploadedAttachments.forEach((attachment, index) => {
                const attachmentId = `${createdRecord.issueId}-ATT-${String(index + 1).padStart(3, "0")}`;
                const uploadedAt = new Date().toISOString();
                insertAttachment.run(attachmentId, createdRecord.issueId, attachment.originalName, attachment.storedName, attachment.storagePath, attachment.mimeType, attachment.fileSize, uploadedAt);
                createdRecord.attachments.push({
                    attachmentId,
                    issueId: createdRecord.issueId,
                    originalName: attachment.originalName,
                    storedName: attachment.storedName,
                    storagePath: attachment.storagePath,
                    mimeType: attachment.mimeType,
                    fileSize: attachment.fileSize,
                    uploadedAt,
                    downloadUrl: `${getPublicApiBaseUrl()}/operations/attachments/${attachmentId}/download`,
                });
            });
        }
        db.prepare(`
        UPDATE hq_serial_assets
        SET
          status = 'Issued',
          issueId = ?
        WHERE assetId = ?
      `).run(createdRecord.issueId, availableSerialAsset.assetId);
        db.prepare(`
        INSERT INTO stock_movements (
          movementId,
          movementType,
          stockId,
          itemName,
          quantityDelta,
          movementDate,
          referenceType,
          referenceId,
          storageLocation,
          serialNumbers,
          notes
        ) VALUES (?, 'Issue Out', ?, ?, ?, ?, 'issue_record', ?, ?, ?, ?)
      `).run(`${createdRecord.issueId}-MOVE-001`, matchingStockItem.stockId, createdRecord.itemName, -1, createdRecord.issueDate, createdRecord.issueId, availableSerialAsset.storageLocation, JSON.stringify([createdRecord.serialNumber]), (_f = createdRecord.notes) !== null && _f !== void 0 ? _f : null);
        (0, stockLocationBalances_1.adjustStockLocationBalance)(db, {
            stockId: matchingStockItem.stockId,
            storageLocation: availableSerialAsset.storageLocation,
            quantityDelta: -1,
            serializedDelta: -1,
            nonSerializedDelta: 0,
            movementDate: createdRecord.issueDate,
        });
        updateHqStockLevels(matchingStockItem, nextTotalQuantity);
        db.exec("COMMIT");
    }
    catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
    return (_g = (0, exports.getIssueRecordByIdData)(issueId)) !== null && _g !== void 0 ? _g : createdRecord;
};
exports.createIssueRecordData = createIssueRecordData;
const acknowledgeIssueRecordData = (issueId, acknowledgement) => {
    var _a;
    const issueRecord = (0, exports.getIssueRecordByIdData)(issueId);
    if (!issueRecord) {
        throw new Error("Issue record was not found");
    }
    if (issueRecord.status === "Returned") {
        throw new Error("Returned issue records cannot be acknowledged");
    }
    if (issueRecord.status === "Acknowledged") {
        throw new Error("Issue record has already been acknowledged");
    }
    const acknowledgedBy = normalizeOptionalString(acknowledgement.acknowledgedBy);
    const acknowledgedAt = (_a = normalizeOptionalString(acknowledgement.acknowledgedAt)) !== null && _a !== void 0 ? _a : getTodayDate();
    const acknowledgementNotes = normalizeOptionalString(acknowledgement.acknowledgementNotes);
    if (!acknowledgedBy) {
        throw new Error("Missing acknowledgement fields");
    }
    db.prepare(`
      UPDATE issue_records
      SET
        status = 'Acknowledged',
        acknowledgedBy = ?,
        acknowledgedAt = ?,
        acknowledgementNotes = ?
      WHERE issueId = ?
    `).run(acknowledgedBy, acknowledgedAt, acknowledgementNotes !== null && acknowledgementNotes !== void 0 ? acknowledgementNotes : null, issueId);
    return (0, exports.getIssueRecordByIdData)(issueId);
};
exports.acknowledgeIssueRecordData = acknowledgeIssueRecordData;
const returnIssueRecordData = (issueId, issueReturn) => {
    var _a;
    const issueRecord = (0, exports.getIssueRecordByIdData)(issueId);
    if (!issueRecord) {
        throw new Error("Issue record was not found");
    }
    if (issueRecord.status === "Returned") {
        throw new Error("Issue record has already been returned");
    }
    const returnedBy = normalizeOptionalString(issueReturn.returnedBy);
    const returnedAt = (_a = normalizeOptionalString(issueReturn.returnedAt)) !== null && _a !== void 0 ? _a : getTodayDate();
    const returnNotes = normalizeOptionalString(issueReturn.returnNotes);
    if (!returnedBy) {
        throw new Error("Missing return fields");
    }
    db.exec("BEGIN");
    try {
        const matchingStockItem = db
            .prepare("SELECT * FROM hq_stock_items WHERE itemName = ?")
            .get(issueRecord.itemName);
        const serialAsset = db
            .prepare(`
        SELECT
          assetId,
          stockId,
          storageLocation,
          status,
          issueId
        FROM hq_serial_assets
        WHERE serialNumber = ?
      `)
            .get(issueRecord.serialNumber);
        if (!matchingStockItem) {
            throw new Error("HQ stock item was not found for this return");
        }
        if (!serialAsset) {
            throw new Error("Serial asset was not found for this issue");
        }
        if (serialAsset.status !== "Issued") {
            throw new Error("Serial asset is not currently issued");
        }
        if (serialAsset.issueId !== issueId) {
            throw new Error("Serial asset is linked to a different issue");
        }
        if (serialAsset.stockId !== matchingStockItem.stockId) {
            throw new Error("Serial asset is linked to the wrong HQ stock item");
        }
        const nextTotalQuantity = matchingStockItem.totalQuantity + 1;
        db.prepare(`
        UPDATE hq_serial_assets
        SET
          status = 'Available',
          issueId = NULL
        WHERE assetId = ?
      `).run(serialAsset.assetId);
        db.prepare(`
        INSERT INTO stock_movements (
          movementId,
          movementType,
          stockId,
          itemName,
          quantityDelta,
          movementDate,
          referenceType,
          referenceId,
          storageLocation,
          serialNumbers,
          notes
        ) VALUES (?, 'Return', ?, ?, ?, ?, 'issue_record', ?, ?, ?, ?)
      `).run(`${issueId}-MOVE-RET-001`, matchingStockItem.stockId, issueRecord.itemName, 1, returnedAt, issueId, serialAsset.storageLocation, JSON.stringify([issueRecord.serialNumber]), returnNotes !== null && returnNotes !== void 0 ? returnNotes : null);
        (0, stockLocationBalances_1.adjustStockLocationBalance)(db, {
            stockId: matchingStockItem.stockId,
            storageLocation: serialAsset.storageLocation,
            quantityDelta: 1,
            serializedDelta: 1,
            nonSerializedDelta: 0,
            movementDate: returnedAt,
        });
        updateHqStockLevels(matchingStockItem, nextTotalQuantity);
        db.prepare(`
        UPDATE issue_records
        SET
          status = 'Returned',
          returnedBy = ?,
          returnedAt = ?,
          returnNotes = ?
        WHERE issueId = ?
      `).run(returnedBy, returnedAt, returnNotes !== null && returnNotes !== void 0 ? returnNotes : null, issueId);
        db.exec("COMMIT");
    }
    catch (error) {
        db.exec("ROLLBACK");
        throw error;
    }
    return (0, exports.getIssueRecordByIdData)(issueId);
};
exports.returnIssueRecordData = returnIssueRecordData;
const buildDocumentQueueEntries = (receivingReceipts, issueRecords) => {
    const receiptEntries = receivingReceipts
        .filter((receipt) => receipt.documentStatus !== "Complete")
        .map((receipt) => ({
        queueId: `receipt-${receipt.receiptId}`,
        entityType: "Receipt",
        referenceId: receipt.receiptId,
        title: `${receipt.supplierName} delivery`,
        owner: receipt.signedBy,
        date: receipt.arrivalDate,
        documentStatus: receipt.documentStatus,
        documentCount: receipt.documentCount,
        reason: receipt.documentStatus === "Missing"
            ? "Receipt has no supporting documents attached."
            : "Receipt documents still need review before full sign-off.",
    }));
    const issueEntries = issueRecords
        .filter((issue) => issue.attachments.length === 0 && issue.attachmentNames.length === 0)
        .map((issue) => ({
        queueId: `issue-${issue.issueId}`,
        entityType: "Issue",
        referenceId: issue.issueId,
        title: `${issue.itemName} to ${issue.issuedTo}`,
        owner: issue.issuedBy,
        date: issue.issueDate,
        documentStatus: "Missing",
        documentCount: 0,
        reason: "Issue record has no dispatch or handover document attached.",
    }));
    return [...receiptEntries, ...issueEntries].sort((left, right) => right.date === left.date
        ? right.referenceId.localeCompare(left.referenceId)
        : right.date.localeCompare(left.date));
};
const buildRecentActivity = (receivingReceipts, issueRecords) => {
    const receiptActivity = receivingReceipts.map((receipt) => ({
        activityId: `receipt-${receipt.receiptId}`,
        activityType: "Receipt Logged",
        occurredOn: receipt.arrivalDate,
        actor: receipt.receivedBy,
        referenceId: receipt.receiptId,
        detail: `${receipt.totalQuantity} unit(s) received from ${receipt.supplierName}`,
        status: receipt.documentStatus,
    }));
    const issueActivity = issueRecords.flatMap((issue) => {
        const activities = [
            {
                activityId: `issue-${issue.issueId}`,
                activityType: "Issue Out",
                occurredOn: issue.issueDate,
                actor: issue.issuedBy,
                referenceId: issue.issueId,
                detail: `${issue.itemName} issued to ${issue.issuedTo}`,
                status: issue.status,
            },
        ];
        if (issue.acknowledgedAt && issue.acknowledgedBy) {
            activities.push({
                activityId: `ack-${issue.issueId}`,
                activityType: "Issue Acknowledged",
                occurredOn: issue.acknowledgedAt,
                actor: issue.acknowledgedBy,
                referenceId: issue.issueId,
                detail: `${issue.serialNumber} acknowledged at destination`,
                status: "Acknowledged",
            });
        }
        if (issue.returnedAt && issue.returnedBy) {
            activities.push({
                activityId: `return-${issue.issueId}`,
                activityType: "Issue Returned",
                occurredOn: issue.returnedAt,
                actor: issue.returnedBy,
                referenceId: issue.issueId,
                detail: `${issue.serialNumber} returned to HQ stock`,
                status: "Returned",
            });
        }
        return activities;
    });
    return [...receiptActivity, ...issueActivity]
        .sort((left, right) => right.occurredOn === left.occurredOn
        ? right.activityId.localeCompare(left.activityId)
        : right.occurredOn.localeCompare(left.occurredOn))
        .slice(0, 8);
};
const buildAuditAlerts = (hqStockItems, receivingReceipts, issueRecords) => {
    const lowStockItems = hqStockItems.filter((item) => item.status === "Low Stock");
    const missingReceiptDocuments = receivingReceipts.filter((receipt) => receipt.documentStatus === "Missing");
    const pendingReceiptReview = receivingReceipts.filter((receipt) => receipt.documentStatus === "Pending Review");
    const issuesAwaitingAcknowledgement = issueRecords.filter((issue) => issue.status === "Issued");
    const alerts = [];
    if (missingReceiptDocuments.length > 0) {
        alerts.push({
            alertId: "missing-receipt-documents",
            severity: "critical",
            title: "Receipts missing documents",
            detail: `${missingReceiptDocuments.length} receipt(s) have no supporting paperwork attached.`,
            referenceType: "receipt",
            referenceId: missingReceiptDocuments[0].receiptId,
        });
    }
    if (pendingReceiptReview.length > 0) {
        alerts.push({
            alertId: "pending-receipt-review",
            severity: "warning",
            title: "Receipts waiting for review",
            detail: `${pendingReceiptReview.length} receipt(s) still need document review.`,
            referenceType: "receipt",
            referenceId: pendingReceiptReview[0].receiptId,
        });
    }
    if (issuesAwaitingAcknowledgement.length > 0) {
        alerts.push({
            alertId: "issues-awaiting-acknowledgement",
            severity: "warning",
            title: "Issues awaiting acknowledgement",
            detail: `${issuesAwaitingAcknowledgement.length} issued asset(s) have not yet been acknowledged.`,
            referenceType: "issue",
            referenceId: issuesAwaitingAcknowledgement[0].issueId,
        });
    }
    if (lowStockItems.length > 0) {
        const riskiestStockItem = [...lowStockItems].sort((left, right) => left.totalQuantity - right.totalQuantity)[0];
        alerts.push({
            alertId: "low-stock-items",
            severity: riskiestStockItem.totalQuantity <= 1 ? "critical" : "info",
            title: "HQ stock needs replenishment",
            detail: `${lowStockItems.length} stock item(s) are flagged low stock. Lowest level: ${riskiestStockItem.itemName}.`,
            referenceType: "stock",
            referenceId: riskiestStockItem.stockId,
        });
    }
    return alerts;
};
const getOperationsOverviewData = () => {
    const receivingReceipts = (0, exports.getReceivingReceiptsData)();
    const hqStockItems = (0, exports.getHqStockData)();
    const issueRecords = (0, exports.getIssueRecordsData)();
    const suppliers = (0, exports.getSuppliersData)();
    const branches = (0, exports.getBranchesData)();
    const currentMonthPrefix = getTodayDate().slice(0, 7);
    const documentQueueEntries = buildDocumentQueueEntries(receivingReceipts, issueRecords);
    const documentsPendingReview = documentQueueEntries.filter((entry) => entry.documentStatus === "Pending Review").length;
    const missingDocumentItems = documentQueueEntries.filter((entry) => entry.documentStatus === "Missing").length;
    const documentQueueTotal = documentQueueEntries.length;
    const receiptsThisMonth = receivingReceipts.filter((receipt) => receipt.arrivalDate.startsWith(currentMonthPrefix)).length;
    const totalReceivedValue = receivingReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
    const hqUnitsOnHand = hqStockItems.reduce((sum, item) => sum + item.totalQuantity, 0);
    const serializedUnits = hqStockItems.reduce((sum, item) => sum + item.serializedUnits, 0);
    const lowStockItems = hqStockItems.filter((item) => item.status === "Low Stock");
    const acknowledgedIssues = issueRecords.filter((issue) => issue.status === "Acknowledged").length;
    const returnedIssues = issueRecords.filter((issue) => issue.status === "Returned").length;
    const branchIssues = issueRecords.filter((issue) => issue.destinationType === "Branch").length;
    const activeBranches = branches.filter((branch) => branch.status === "Active")
        .length;
    const branchesWithIssuedAssets = new Set(issueRecords
        .filter((issue) => issue.destinationType === "Branch" &&
        issue.status !== "Returned" &&
        issue.branchId)
        .map((issue) => issue.branchId)).size;
    return {
        receiptsThisMonth,
        totalReceivedValue,
        hqUnitsOnHand,
        serializedUnits,
        pendingIssues: issueRecords.filter((issue) => issue.status === "Issued")
            .length,
        activeSuppliers: suppliers.length,
        documentExceptions: documentQueueTotal,
        documentsPendingReview,
        missingDocumentItems,
        documentQueueTotal,
        lowStockItems: lowStockItems.length,
        acknowledgedIssues,
        returnedIssues,
        branchIssues,
        activeBranches,
        branchesWithIssuedAssets,
        recentReceipts: receivingReceipts.slice(0, 4),
        issueOutQueue: issueRecords.slice(0, 5),
        supplierHighlights: suppliers.slice(0, 3),
        stockWatchlist: [...hqStockItems]
            .filter((item) => item.status !== "Available" || item.totalQuantity <= 5)
            .sort((left, right) => left.totalQuantity === right.totalQuantity
            ? left.itemName.localeCompare(right.itemName)
            : left.totalQuantity - right.totalQuantity)
            .slice(0, 5),
        documentQueue: documentQueueEntries.slice(0, 6),
        recentActivity: buildRecentActivity(receivingReceipts, issueRecords),
        auditAlerts: buildAuditAlerts(hqStockItems, receivingReceipts, issueRecords),
    };
};
exports.getOperationsOverviewData = getOperationsOverviewData;
