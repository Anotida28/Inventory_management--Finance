import { getBusinessTodayDate } from "./date";
import { db, ensureIndex } from "./database";
import { UploadedIssueAttachment } from "./issueUploads";
import { assertSchemaReady, runtimeSchemaMutationsEnabled } from "./runtimeSchema";
import {
  adjustStockLocationBalance,
  ensureStockLocationBalanceSchema,
  getStockLocationBalancesByStockId,
  getStockLocationBalancesByStockIds,
  getStorageLocationSummary,
  type StockLocationBalance,
} from "./stockLocationBalances";

type Supplier = {
  supplierId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  categoryFocus: string;
  lastDeliveryDate: string;
  activeContracts: number;
};

type Branch = {
  branchId: string;
  name: string;
  code: string;
  address: string;
  region: string;
  contactPerson: string;
  phone: string;
  status: "Active" | "Inactive";
};

type ReceivingReceipt = {
  receiptId: string;
  receiptType: "Batch" | "Single Item";
  supplierId: string;
  supplierName: string;
  arrivalDate: string;
  signedBy: string;
  receivedBy: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  documentCount: number;
  documentStatus: "Complete" | "Pending Review" | "Missing";
  status: "Verified" | "Pending Review" | "Logged";
};

type HqStockItem = {
  stockId: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  serializedUnits: number;
  nonSerializedUnits: number;
  supplierName: string;
  lastArrivalDate: string;
  storageLocation: string;
  locationCount: number;
  storageLocations: string[];
  status: "Available" | "Reserved" | "Low Stock";
};

type StockMovementRecord = {
  movementId: string;
  stockId: string;
  itemName: string;
  movementType: "Receipt" | "Issue Out" | "Return" | "Adjustment";
  quantityDelta: number;
  movementDate: string;
  referenceType: string;
  referenceId: string;
  storageLocation?: string;
  serialNumbers: string[];
  notes?: string;
};

type HqStockItemDetail = HqStockItem & {
  availableSerialCount: number;
  issuedSerialCount: number;
  locationBalances: StockLocationBalance[];
  recentMovements: StockMovementRecord[];
  availableSerialAssets: SerialAsset[];
};

type IssueStatus = "Issued" | "Acknowledged" | "Returned";

type IssueRecord = {
  issueId: string;
  itemName: string;
  serialNumber: string;
  destinationType: "Branch" | "Person";
  branchId?: string;
  issuedTo: string;
  issuedBy: string;
  address: string;
  issueDate: string;
  attachmentNames: string[];
  attachments: IssueAttachment[];
  notes?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  acknowledgementNotes?: string;
  returnedBy?: string;
  returnedAt?: string;
  returnNotes?: string;
  status: IssueStatus;
};

type IssueAttachment = {
  attachmentId: string;
  issueId: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
};

type SerialAsset = {
  assetId: string;
  stockId: string;
  itemName: string;
  serialNumber: string;
  supplierName: string;
  lastArrivalDate: string;
  storageLocation: string;
  status: "Available" | "Issued";
  issueId?: string;
};

type NewIssueRecord = {
  itemName: string;
  serialNumber: string;
  destinationType: "Branch" | "Person";
  branchId?: string;
  issuedTo: string;
  issuedBy: string;
  address: string;
  issueDate: string;
  attachmentNames?: string[];
  notes?: string;
};

type IssueAcknowledgement = {
  acknowledgedBy: string;
  acknowledgedAt?: string;
  acknowledgementNotes?: string;
};

type IssueReturn = {
  returnedBy: string;
  returnedAt?: string;
  returnNotes?: string;
};

type AuditAlert = {
  alertId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  referenceType: "receipt" | "issue" | "stock";
  referenceId: string;
};

type AuditActivity = {
  activityId: string;
  activityType:
    | "Receipt Logged"
    | "Issue Out"
    | "Issue Acknowledged"
    | "Issue Returned";
  occurredOn: string;
  actor: string;
  referenceId: string;
  detail: string;
  status: string;
};

type DocumentQueueEntry = {
  queueId: string;
  entityType: "Receipt" | "Issue";
  referenceId: string;
  title: string;
  owner: string;
  date: string;
  documentStatus: string;
  documentCount: number;
  reason: string;
};

const supplierSeeds: Supplier[] = [
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

const branchSeeds: Branch[] = [
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

const parseAttachmentNames = (value: string | null) => {
  if (!value) return [];

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
};

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
};

const normalizeIssueRecordInput = (newIssueRecord: NewIssueRecord) => ({
  itemName: normalizeOptionalString(newIssueRecord.itemName),
  serialNumber: normalizeOptionalString(newIssueRecord.serialNumber),
  branchId: normalizeOptionalString(newIssueRecord.branchId),
  issuedTo: normalizeOptionalString(newIssueRecord.issuedTo),
  issuedBy: normalizeOptionalString(newIssueRecord.issuedBy),
  address: normalizeOptionalString(newIssueRecord.address),
  issueDate: normalizeOptionalString(newIssueRecord.issueDate),
  notes: normalizeOptionalString(newIssueRecord.notes),
});

const getTodayDate = () => getBusinessTodayDate();

const mapIssueRecord = (row: any): IssueRecord => ({
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

const mapSerialAsset = (row: any): SerialAsset => ({
  assetId: row.assetId,
  stockId: row.stockId,
  itemName: row.itemName,
  serialNumber: row.serialNumber,
  supplierName: row.supplierName,
  lastArrivalDate: row.lastArrivalDate,
  storageLocation: row.storageLocation,
  status: row.status,
  issueId: row.issueId ?? undefined,
});

const mapStockMovement = (row: any): StockMovementRecord => ({
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
  notes: row.notes ?? undefined,
});

const getPublicApiBaseUrl = () =>
  process.env.PUBLIC_API_BASE_URL ||
  `http://localhost:${process.env.PORT || 3001}`;

const mapIssueAttachment = (row: any): IssueAttachment => ({
  attachmentId: row.attachmentId,
  issueId: row.issueId,
  originalName: row.originalName,
  storedName: row.storedName,
  storagePath: row.storagePath,
  mimeType: row.mimeType,
  fileSize: row.fileSize,
  uploadedAt: row.uploadedAt,
  downloadUrl: `${getPublicApiBaseUrl()}/api/operations/attachments/${
    row.attachmentId
  }/download`,
});

const getHqStockStatus = (
  currentStatus: HqStockItem["status"],
  nextTotalQuantity: number
): HqStockItem["status"] => {
  if (currentStatus === "Reserved") {
    return "Reserved";
  }

  return nextTotalQuantity <= 5 ? "Low Stock" : "Available";
};

const getTableColumns = (tableName: string) => {
  return db.getTableColumns(tableName);
};

const migrateIssueRecordsTableIfNeeded = () => {
  const issueRecordColumns = getTableColumns("issue_records");

  if (
    issueRecordColumns.length > 0 &&
    issueRecordColumns.includes("branchId") &&
    issueRecordColumns.includes("acknowledgedBy") &&
    issueRecordColumns.includes("returnedAt")
  ) {
    return;
  }

  if (issueRecordColumns.length === 0) {
    return;
  }

  const missingColumns = [
    {
      name: "branchId",
      definition: "VARCHAR(64) NULL AFTER destinationType",
    },
    {
      name: "acknowledgedBy",
      definition: "VARCHAR(255) NULL AFTER notes",
    },
    {
      name: "acknowledgedAt",
      definition: "VARCHAR(32) NULL AFTER acknowledgedBy",
    },
    {
      name: "acknowledgementNotes",
      definition: "TEXT NULL AFTER acknowledgedAt",
    },
    {
      name: "returnedBy",
      definition: "VARCHAR(255) NULL AFTER acknowledgementNotes",
    },
    {
      name: "returnedAt",
      definition: "VARCHAR(32) NULL AFTER returnedBy",
    },
    {
      name: "returnNotes",
      definition: "TEXT NULL AFTER returnedAt",
    },
  ].filter((column) => !issueRecordColumns.includes(column.name));

  missingColumns.forEach((column) => {
    db.exec(
      `ALTER TABLE issue_records ADD COLUMN ${column.name} ${column.definition}`
    );
  });
};

const backfillIssueRecordBranchIds = () => {
  const branches = db
    .prepare(
      `
        SELECT
          branchId,
          name,
          address
        FROM branches
        WHERE status = 'Active'
      `
    )
    .all() as Array<{ branchId: string; name: string; address: string }>;

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
  const balanceCount =
    (
      db
        .prepare("SELECT COUNT(*) AS count FROM hq_stock_location_balances")
        .get() as { count: number }
    ).count || 0;
  const stockCount =
    (
      db.prepare("SELECT COUNT(*) AS count FROM hq_stock_items").get() as {
        count: number;
      }
    ).count || 0;

  if (balanceCount > 0 || stockCount === 0) {
    return;
  }

  const stockItems = db
    .prepare(
      `
        SELECT
          stockId,
          totalQuantity,
          storageLocation
        FROM hq_stock_items
      `
    )
    .all() as Array<{
    stockId: string;
    totalQuantity: number;
    storageLocation: string;
  }>;
  const serializedByLocation = (
    db
      .prepare(
        `
          SELECT
            stockId,
            storageLocation,
            COUNT(*) AS count
          FROM hq_serial_assets
          WHERE status = 'Available'
          GROUP BY stockId, storageLocation
        `
      )
      .all() as Array<{
      stockId: string;
      storageLocation: string;
      count: number;
    }>
  ).reduce((accumulator, row) => {
    const key = `${row.stockId}::${row.storageLocation}`;

    accumulator.set(key, {
      storageLocation: row.storageLocation,
      serializedUnits: row.count,
      nonSerializedUnits: 0,
    });

    return accumulator;
  }, new Map<string, { storageLocation: string; serializedUnits: number; nonSerializedUnits: number }>());
  const receiptLineColumns = getTableColumns("receiving_receipt_lines");
  const nonSerializedByStockId = new Map<
    string,
    Map<string, { storageLocation: string; nonSerializedUnits: number }>
  >();

  if (receiptLineColumns.length > 0) {
    const nonSerializedReceiptRows = db
      .prepare(
        `
          SELECT
            stock.stockId,
            lines.storageLocation,
            SUM(lines.quantity) AS quantity
          FROM receiving_receipt_lines AS lines
          INNER JOIN hq_stock_items AS stock
            ON stock.itemName = lines.itemName
          WHERE lines.isSerialized = 0
          GROUP BY stock.stockId, lines.storageLocation
        `
      )
      .all() as Array<{
      stockId: string;
      storageLocation: string;
      quantity: number;
    }>;

    nonSerializedReceiptRows.forEach((row) => {
      const stockLocations =
        nonSerializedByStockId.get(row.stockId) ??
        new Map<string, { storageLocation: string; nonSerializedUnits: number }>();

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
      const locationEntries = new Map<
        string,
        {
          storageLocation: string;
          serializedUnits: number;
          nonSerializedUnits: number;
        }
      >();

      Array.from(serializedByLocation.entries())
        .filter(([key]) => key.startsWith(`${stockItem.stockId}::`))
        .forEach(([, value]) => {
          locationEntries.set(value.storageLocation, { ...value });
        });

      const nonSerializedLocations = nonSerializedByStockId.get(stockItem.stockId);
      const availableSerializedUnits = Array.from(locationEntries.values()).reduce(
        (sum, entry) => sum + entry.serializedUnits,
        0
      );
      const expectedNonSerializedUnits = Math.max(
        stockItem.totalQuantity - availableSerializedUnits,
        0
      );

      if (nonSerializedLocations && nonSerializedLocations.size > 0) {
        const fromReceipts = Array.from(nonSerializedLocations.values()).reduce(
          (sum, entry) => sum + entry.nonSerializedUnits,
          0
        );

        if (fromReceipts <= expectedNonSerializedUnits) {
          nonSerializedLocations.forEach((entry) => {
            const existingEntry = locationEntries.get(entry.storageLocation);

            locationEntries.set(entry.storageLocation, {
              storageLocation: entry.storageLocation,
              serializedUnits: existingEntry?.serializedUnits ?? 0,
              nonSerializedUnits:
                (existingEntry?.nonSerializedUnits ?? 0) + entry.nonSerializedUnits,
            });
          });

          const remainder = expectedNonSerializedUnits - fromReceipts;

          if (remainder > 0) {
            const fallbackLocation = stockItem.storageLocation || "Unassigned";
            const existingEntry = locationEntries.get(fallbackLocation);

            locationEntries.set(fallbackLocation, {
              storageLocation: fallbackLocation,
              serializedUnits: existingEntry?.serializedUnits ?? 0,
              nonSerializedUnits:
                (existingEntry?.nonSerializedUnits ?? 0) + remainder,
            });
          }
        } else {
          const fallbackLocation = stockItem.storageLocation || "Unassigned";
          const existingEntry = locationEntries.get(fallbackLocation);

          locationEntries.set(fallbackLocation, {
            storageLocation: fallbackLocation,
            serializedUnits: existingEntry?.serializedUnits ?? 0,
            nonSerializedUnits:
              (existingEntry?.nonSerializedUnits ?? 0) + expectedNonSerializedUnits,
          });
        }
      } else if (expectedNonSerializedUnits > 0) {
        const fallbackLocation = stockItem.storageLocation || "Unassigned";
        const existingEntry = locationEntries.get(fallbackLocation);

        locationEntries.set(fallbackLocation, {
          storageLocation: fallbackLocation,
          serializedUnits: existingEntry?.serializedUnits ?? 0,
          nonSerializedUnits:
            (existingEntry?.nonSerializedUnits ?? 0) + expectedNonSerializedUnits,
        });
      }

      Array.from(locationEntries.values())
        .filter(
          (entry) => entry.serializedUnits > 0 || entry.nonSerializedUnits > 0
        )
        .forEach((entry) => {
          adjustStockLocationBalance(db, {
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
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

const initializeDatabase = () => {
  if (runtimeSchemaMutationsEnabled()) {
    if (db.dialect === "mysql") {
      db.exec(`
        CREATE TABLE IF NOT EXISTS suppliers (
          supplierId VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          contactPerson VARCHAR(255) NOT NULL,
          phone VARCHAR(64) NOT NULL,
          email VARCHAR(255) NOT NULL,
          categoryFocus VARCHAR(255) NOT NULL,
          lastDeliveryDate VARCHAR(32) NOT NULL,
          activeContracts INT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS branches (
          branchId VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          code VARCHAR(64) NOT NULL UNIQUE,
          address VARCHAR(255) NOT NULL,
          region VARCHAR(128) NOT NULL,
          contactPerson VARCHAR(255) NOT NULL,
          phone VARCHAR(64) NOT NULL,
          status VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS receiving_receipts (
          receiptId VARCHAR(64) PRIMARY KEY,
          receiptType VARCHAR(32) NOT NULL,
          supplierId VARCHAR(64) NOT NULL,
          supplierName VARCHAR(255) NOT NULL,
          arrivalDate VARCHAR(32) NOT NULL,
          signedBy VARCHAR(255) NOT NULL,
          receivedBy VARCHAR(255) NOT NULL,
          itemCount INT NOT NULL,
          totalQuantity INT NOT NULL,
          totalAmount DOUBLE NOT NULL,
          documentCount INT NOT NULL,
          documentStatus VARCHAR(32) NOT NULL,
          status VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS hq_stock_items (
          stockId VARCHAR(64) PRIMARY KEY,
          itemName VARCHAR(255) NOT NULL UNIQUE,
          category VARCHAR(128) NOT NULL,
          totalQuantity INT NOT NULL,
          serializedUnits INT NOT NULL,
          nonSerializedUnits INT NOT NULL,
          supplierName VARCHAR(255) NOT NULL,
          lastArrivalDate VARCHAR(32) NOT NULL,
          storageLocation VARCHAR(255) NOT NULL,
          status VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS issue_records (
          issueId VARCHAR(64) PRIMARY KEY,
          itemName VARCHAR(255) NOT NULL,
          serialNumber VARCHAR(255) NOT NULL,
          destinationType VARCHAR(32) NOT NULL,
          branchId VARCHAR(64) NULL,
          issuedTo VARCHAR(255) NOT NULL,
          issuedBy VARCHAR(255) NOT NULL,
          address VARCHAR(255) NOT NULL,
          issueDate VARCHAR(32) NOT NULL,
          attachmentNames LONGTEXT NOT NULL,
          notes TEXT NULL,
          acknowledgedBy VARCHAR(255) NULL,
          acknowledgedAt VARCHAR(32) NULL,
          acknowledgementNotes TEXT NULL,
          returnedBy VARCHAR(255) NULL,
          returnedAt VARCHAR(32) NULL,
          returnNotes TEXT NULL,
          status VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS attachments (
          attachmentId VARCHAR(64) PRIMARY KEY,
          entityType VARCHAR(64) NOT NULL,
          entityId VARCHAR(64) NOT NULL,
          originalName VARCHAR(255) NOT NULL,
          storedName VARCHAR(255) NOT NULL,
          storagePath VARCHAR(512) NOT NULL,
          mimeType VARCHAR(128) NOT NULL,
          fileSize INT NOT NULL,
          uploadedAt VARCHAR(32) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS hq_serial_assets (
          assetId VARCHAR(64) PRIMARY KEY,
          stockId VARCHAR(64) NOT NULL,
          itemName VARCHAR(255) NOT NULL,
          serialNumber VARCHAR(255) NOT NULL UNIQUE,
          supplierName VARCHAR(255) NOT NULL,
          lastArrivalDate VARCHAR(32) NOT NULL,
          storageLocation VARCHAR(255) NOT NULL,
          status VARCHAR(32) NOT NULL,
          issueId VARCHAR(64) NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS stock_movements (
          movementId VARCHAR(64) PRIMARY KEY,
          movementType VARCHAR(64) NOT NULL,
          stockId VARCHAR(64) NOT NULL,
          itemName VARCHAR(255) NOT NULL,
          quantityDelta INT NOT NULL,
          movementDate VARCHAR(32) NOT NULL,
          referenceType VARCHAR(64) NOT NULL,
          referenceId VARCHAR(64) NOT NULL,
          storageLocation VARCHAR(255) NULL,
          serialNumbers LONGTEXT NULL,
          notes TEXT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      ensureStockLocationBalanceSchema(db);

      migrateIssueRecordsTableIfNeeded();

      const stockMovementColumns = getTableColumns("stock_movements");

      if (
        stockMovementColumns.length > 0 &&
        !stockMovementColumns.includes("storageLocation")
      ) {
        db.exec(`
          ALTER TABLE stock_movements
          ADD COLUMN storageLocation VARCHAR(255)
        `);
      }
    }

    ensureIndex("hq_serial_assets", "idx_hq_serial_assets_item_status", [
      "itemName",
      "status",
    ]);
    ensureIndex("attachments", "idx_attachments_entity", [
      "entityType",
      "entityId",
    ]);
    ensureIndex("stock_movements", "idx_stock_movements_reference", [
      "referenceType",
      "referenceId",
    ]);
    ensureIndex("stock_movements", "idx_stock_movements_stock_date", [
      "stockId",
      "movementDate",
    ]);
    ensureIndex("issue_records", "idx_issue_records_status", [
      "status",
      "issueDate",
    ]);
    ensureIndex("issue_records", "idx_issue_records_branch", [
      "branchId",
      "destinationType",
    ]);

    const supplierCount =
      db.prepare("SELECT COUNT(*) AS count FROM suppliers").get().count || 0;
    const branchCount =
      db.prepare("SELECT COUNT(*) AS count FROM branches").get().count || 0;

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
        insertSupplier.run(
          supplier.supplierId,
          supplier.name,
          supplier.contactPerson,
          supplier.phone,
          supplier.email,
          supplier.categoryFocus,
          supplier.lastDeliveryDate,
          supplier.activeContracts
        );
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
        insertBranch.run(
          branch.branchId,
          branch.name,
          branch.code,
          branch.address,
          branch.region,
          branch.contactPerson,
          branch.phone,
          branch.status
        );
      });
    }

    backfillIssueRecordBranchIds();
    backfillStockLocationBalancesIfNeeded();
  }

  assertSchemaReady("Operations", [
    {
      tableName: "suppliers",
      requiredColumns: [
        "supplierId",
        "name",
        "contactPerson",
        "phone",
        "email",
        "categoryFocus",
        "lastDeliveryDate",
        "activeContracts",
      ],
    },
    {
      tableName: "branches",
      requiredColumns: [
        "branchId",
        "name",
        "code",
        "address",
        "region",
        "contactPerson",
        "phone",
        "status",
      ],
    },
    {
      tableName: "receiving_receipts",
      requiredColumns: [
        "receiptId",
        "receiptType",
        "supplierId",
        "supplierName",
        "arrivalDate",
        "signedBy",
        "receivedBy",
        "itemCount",
        "totalQuantity",
        "totalAmount",
        "documentCount",
        "documentStatus",
        "status",
      ],
    },
    {
      tableName: "hq_stock_items",
      requiredColumns: [
        "stockId",
        "itemName",
        "category",
        "totalQuantity",
        "serializedUnits",
        "nonSerializedUnits",
        "supplierName",
        "lastArrivalDate",
        "storageLocation",
        "status",
      ],
    },
    {
      tableName: "issue_records",
      requiredColumns: [
        "issueId",
        "itemName",
        "serialNumber",
        "destinationType",
        "branchId",
        "issuedTo",
        "issuedBy",
        "address",
        "issueDate",
        "attachmentNames",
        "notes",
        "acknowledgedBy",
        "acknowledgedAt",
        "acknowledgementNotes",
        "returnedBy",
        "returnedAt",
        "returnNotes",
        "status",
      ],
    },
    {
      tableName: "hq_serial_assets",
      requiredColumns: [
        "assetId",
        "stockId",
        "itemName",
        "serialNumber",
        "supplierName",
        "lastArrivalDate",
        "storageLocation",
        "status",
        "issueId",
      ],
    },
    {
      tableName: "attachments",
      requiredColumns: [
        "attachmentId",
        "entityType",
        "entityId",
        "originalName",
        "storedName",
        "storagePath",
        "mimeType",
        "fileSize",
        "uploadedAt",
      ],
    },
    {
      tableName: "stock_movements",
      requiredColumns: [
        "movementId",
        "movementType",
        "stockId",
        "itemName",
        "quantityDelta",
        "movementDate",
        "referenceType",
        "referenceId",
        "storageLocation",
        "serialNumbers",
        "notes",
      ],
    },
    {
      tableName: "hq_stock_location_balances",
      requiredColumns: [
        "balanceId",
        "stockId",
        "storageLocation",
        "totalQuantity",
        "serializedUnits",
        "nonSerializedUnits",
        "lastMovementDate",
      ],
    },
  ]);
};

initializeDatabase();

export const getReceivingReceiptsData = (): ReceivingReceipt[] => {
  return db
    .prepare(
      `
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
      `
    )
    .all() as ReceivingReceipt[];
};

export const getSuppliersData = (): Supplier[] => {
  return db
    .prepare(
      `
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
      `
    )
    .all() as Supplier[];
};

export const getBranchesData = (): Branch[] => {
  return db
    .prepare(
      `
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
      `
    )
    .all() as Branch[];
};

export const getHqStockData = (): HqStockItem[] => {
  const stockRows = db
    .prepare(
      `
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
      `
    )
    .all() as Array<
    Omit<HqStockItem, "locationCount" | "storageLocations">
  >;
  const locationBalancesByStockId = getStockLocationBalancesByStockIds(
    db,
    stockRows.map((stockItem) => stockItem.stockId)
  );

  const availableSerialRows = db
    .prepare(
      `
        SELECT
          stockId,
          COUNT(*) AS count
        FROM hq_serial_assets
        WHERE status = 'Available'
        GROUP BY stockId
      `
    )
    .all() as Array<{ stockId: string; count: number }>;

  const availableSerialCounts = new Map(
    availableSerialRows.map((row) => [row.stockId, row.count])
  );

  return stockRows.map((stockItem) => {
    const locationBalances =
      locationBalancesByStockId.get(stockItem.stockId) ?? [];
    const availableSerializedUnits = Math.min(
      availableSerialCounts.get(stockItem.stockId) ?? 0,
      stockItem.totalQuantity
    );
    const storageLocations = locationBalances.map(
      (locationBalance) => locationBalance.storageLocation
    );

    return {
      ...stockItem,
      storageLocation:
        locationBalances.length > 0
          ? getStorageLocationSummary(locationBalances)
          : stockItem.storageLocation || "Unassigned",
      locationCount:
        locationBalances.length > 0
          ? locationBalances.length
          : stockItem.totalQuantity > 0 && stockItem.storageLocation
          ? 1
          : 0,
      storageLocations:
        storageLocations.length > 0
          ? storageLocations
          : stockItem.storageLocation
          ? [stockItem.storageLocation]
          : [],
      serializedUnits: availableSerializedUnits,
      nonSerializedUnits: Math.max(
        stockItem.totalQuantity - availableSerializedUnits,
        0
      ),
    };
  });
};

const getStockMovementsByStockId = (stockId: string, limit = 12) => {
  const rows = db
    .prepare(
      `
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
      `
    )
    .all(stockId, limit);

  return rows.map(mapStockMovement);
};

export const getHqStockDetailData = (
  stockId: string
): HqStockItemDetail | null => {
  const stockItem = getHqStockData().find((item) => item.stockId === stockId);

  if (!stockItem) {
    return null;
  }

  const availableSerialAssets = getAvailableSerialAssetsData(stockItem.itemName);
  const issuedSerialCount =
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM hq_serial_assets
          WHERE stockId = ? AND status = 'Issued'
        `
      )
      .get(stockId).count || 0;

  return {
    ...stockItem,
    availableSerialCount: availableSerialAssets.length,
    issuedSerialCount,
    locationBalances: getStockLocationBalancesByStockId(db, stockId),
    recentMovements: getStockMovementsByStockId(stockId),
    availableSerialAssets,
  };
};

const getIssueAttachmentsByIssueIds = (issueIds: string[]) => {
  const attachmentsByIssueId = new Map<string, IssueAttachment[]>();

  if (issueIds.length === 0) {
    return attachmentsByIssueId;
  }

  const placeholders = issueIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
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
      `
    )
    .all(...issueIds);

  rows.forEach((row: any) => {
    const mappedAttachment = mapIssueAttachment(row);
    const issueAttachments =
      attachmentsByIssueId.get(mappedAttachment.issueId) ?? [];

    issueAttachments.push(mappedAttachment);
    attachmentsByIssueId.set(mappedAttachment.issueId, issueAttachments);
  });

  return attachmentsByIssueId;
};

export const getIssueRecordsData = (): IssueRecord[] => {
  const rows = db
    .prepare(
      `
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
      `
    )
    .all();

  const issueAttachmentsByIssueId = getIssueAttachmentsByIssueIds(
    rows.map((row: any) => row.issueId)
  );

  return rows.map((row: any) => {
    const mappedIssue = mapIssueRecord(row);
    const attachments = issueAttachmentsByIssueId.get(mappedIssue.issueId) ?? [];

    return {
      ...mappedIssue,
      attachments,
      attachmentNames:
        attachments.length > 0
          ? attachments.map((attachment) => attachment.originalName)
          : mappedIssue.attachmentNames,
    };
  });
};

export const getIssueRecordByIdData = (issueId: string) => {
  return getIssueRecordsData().find((issue) => issue.issueId === issueId) ?? null;
};

export const getIssueAttachmentByIdData = (attachmentId: string) => {
  const row = db
    .prepare(
      `
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
      `
    )
    .get(attachmentId);

  if (!row) {
    return null;
  }

  return mapIssueAttachment(row);
};

export const getAvailableSerialAssetsData = (
  itemName?: string
): SerialAsset[] => {
  const rows = itemName
    ? db
        .prepare(
          `
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
          `
        )
        .all(itemName)
    : db
        .prepare(
          `
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
          `
        )
        .all();

  return rows.map(mapSerialAsset);
};

const getBranchById = (branchId: string) => {
  return (
    db
      .prepare(
        `
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
        `
      )
      .get(branchId) as Branch | undefined
  );
};

const getBranchByName = (branchName: string) => {
  return (
    db
      .prepare(
        `
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
        `
      )
      .get(branchName) as Branch | undefined
  );
};

const updateHqStockLevels = (
  stockItem: Pick<HqStockItem, "stockId" | "status">,
  nextTotalQuantity: number
) => {
  const remainingAvailableSerials =
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM hq_serial_assets
          WHERE stockId = ? AND status = 'Available'
        `
      )
      .get(stockItem.stockId).count || 0;

  const nextSerializedUnits = Math.min(
    remainingAvailableSerials,
    nextTotalQuantity
  );
  const nextNonSerializedUnits = Math.max(
    nextTotalQuantity - nextSerializedUnits,
    0
  );
  const nextStatus = getHqStockStatus(stockItem.status, nextTotalQuantity);

  db.prepare(
    `
      UPDATE hq_stock_items
      SET
        totalQuantity = ?,
        serializedUnits = ?,
        nonSerializedUnits = ?,
        status = ?
      WHERE stockId = ?
    `
  ).run(
    nextTotalQuantity,
    nextSerializedUnits,
    nextNonSerializedUnits,
    nextStatus,
    stockItem.stockId
  );
};

export const createIssueRecordData = (
  newIssueRecord: NewIssueRecord,
  uploadedAttachments: UploadedIssueAttachment[] = []
): IssueRecord => {
  const highestIssueSequence = db.getNumericSuffixSequence(
    "issue_records",
    "issueId",
    10
  );
  const issueId = `ISS-${new Date().getFullYear()}-${String(
    highestIssueSequence + 1
  ).padStart(3, "0")}`;

  const normalizedInput = normalizeIssueRecordInput(newIssueRecord);
  const isBranchIssue = newIssueRecord.destinationType === "Branch";
  const isPersonIssue = newIssueRecord.destinationType === "Person";

  if (!isBranchIssue && !isPersonIssue) {
    throw new Error("Invalid issue destination type");
  }

  if (
    !normalizedInput.itemName ||
    !normalizedInput.serialNumber ||
    !normalizedInput.issuedBy ||
    !normalizedInput.issueDate
  ) {
    throw new Error("Missing required issue-out fields");
  }

  if (
    isPersonIssue &&
    (!normalizedInput.issuedTo || !normalizedInput.address)
  ) {
    throw new Error("Missing required issue-out fields");
  }

  if (
    isBranchIssue &&
    !normalizedInput.branchId &&
    !normalizedInput.issuedTo
  ) {
    throw new Error("Missing required issue-out fields");
  }

  const selectedBranch = isBranchIssue
    ? normalizedInput.branchId
      ? getBranchById(normalizedInput.branchId)
      : getBranchByName(normalizedInput.issuedTo!)
    : undefined;

  if (isBranchIssue && (!selectedBranch || selectedBranch.status !== "Active")) {
    throw new Error("Selected branch was not found");
  }

  const resolvedIssuedTo = selectedBranch?.name ?? normalizedInput.issuedTo;
  const resolvedAddress = selectedBranch?.address ?? normalizedInput.address;

  if (!resolvedIssuedTo || !resolvedAddress) {
    throw new Error("Missing required issue-out fields");
  }

  const existingActiveIssue = db
    .prepare(
      `
        SELECT issueId
        FROM issue_records
        WHERE serialNumber = ? AND status != 'Returned'
      `
    )
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
    .prepare(
      `
        SELECT
          assetId,
          stockId,
          serialNumber,
          storageLocation
        FROM hq_serial_assets
        WHERE itemName = ? AND serialNumber = ? AND status = 'Available'
      `
    )
    .get(normalizedInput.itemName, normalizedInput.serialNumber) as
    | Pick<SerialAsset, "assetId" | "stockId" | "serialNumber" | "storageLocation">
    | undefined;

  if (!availableSerialAsset) {
    throw new Error("Selected serial number is not available in HQ stock");
  }

  const nextTotalQuantity = Math.max(matchingStockItem.totalQuantity - 1, 0);
  const attachmentNames =
    uploadedAttachments.length > 0
      ? uploadedAttachments.map((attachment) => attachment.originalName)
      : newIssueRecord.attachmentNames ?? [];

  const createdRecord: IssueRecord = {
    issueId,
    itemName: normalizedInput.itemName,
    serialNumber: normalizedInput.serialNumber,
    destinationType: newIssueRecord.destinationType,
    branchId: selectedBranch?.branchId,
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
    db.prepare(
      `
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
      `
    ).run(
      createdRecord.issueId,
      createdRecord.itemName,
      createdRecord.serialNumber,
      createdRecord.destinationType,
      createdRecord.branchId ?? null,
      createdRecord.issuedTo,
      createdRecord.issuedBy,
      createdRecord.address,
      createdRecord.issueDate,
      JSON.stringify(createdRecord.attachmentNames),
      createdRecord.notes ?? null,
      null,
      null,
      null,
      null,
      null,
      null,
      createdRecord.status
    );

    if (uploadedAttachments.length > 0) {
      const insertAttachment = db.prepare(
        `
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
        `
      );

      uploadedAttachments.forEach((attachment, index) => {
        const attachmentId = `${createdRecord.issueId}-ATT-${String(
          index + 1
        ).padStart(3, "0")}`;
        const uploadedAt = new Date().toISOString();

        insertAttachment.run(
          attachmentId,
          createdRecord.issueId,
          attachment.originalName,
          attachment.storedName,
          attachment.storagePath,
          attachment.mimeType,
          attachment.fileSize,
          uploadedAt
        );

        createdRecord.attachments.push({
          attachmentId,
          issueId: createdRecord.issueId,
          originalName: attachment.originalName,
          storedName: attachment.storedName,
          storagePath: attachment.storagePath,
          mimeType: attachment.mimeType,
          fileSize: attachment.fileSize,
          uploadedAt,
          downloadUrl: `${getPublicApiBaseUrl()}/api/operations/attachments/${attachmentId}/download`,
        });
      });
    }

    db.prepare(
      `
        UPDATE hq_serial_assets
        SET
          status = 'Issued',
          issueId = ?
        WHERE assetId = ?
      `
    ).run(createdRecord.issueId, availableSerialAsset.assetId);

    db.prepare(
      `
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
      `
    ).run(
      `${createdRecord.issueId}-MOVE-001`,
      matchingStockItem.stockId,
      createdRecord.itemName,
      -1,
      createdRecord.issueDate,
      createdRecord.issueId,
      availableSerialAsset.storageLocation,
      JSON.stringify([createdRecord.serialNumber]),
      createdRecord.notes ?? null
    );

    adjustStockLocationBalance(db, {
      stockId: matchingStockItem.stockId,
      storageLocation: availableSerialAsset.storageLocation,
      quantityDelta: -1,
      serializedDelta: -1,
      nonSerializedDelta: 0,
      movementDate: createdRecord.issueDate,
    });

    updateHqStockLevels(matchingStockItem, nextTotalQuantity);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getIssueRecordByIdData(issueId) ?? createdRecord;
};

export const acknowledgeIssueRecordData = (
  issueId: string,
  acknowledgement: IssueAcknowledgement
) => {
  const issueRecord = getIssueRecordByIdData(issueId);

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
  const acknowledgedAt =
    normalizeOptionalString(acknowledgement.acknowledgedAt) ?? getTodayDate();
  const acknowledgementNotes = normalizeOptionalString(
    acknowledgement.acknowledgementNotes
  );

  if (!acknowledgedBy) {
    throw new Error("Missing acknowledgement fields");
  }

  db.prepare(
    `
      UPDATE issue_records
      SET
        status = 'Acknowledged',
        acknowledgedBy = ?,
        acknowledgedAt = ?,
        acknowledgementNotes = ?
      WHERE issueId = ?
    `
  ).run(acknowledgedBy, acknowledgedAt, acknowledgementNotes ?? null, issueId);

  return getIssueRecordByIdData(issueId);
};

export const returnIssueRecordData = (
  issueId: string,
  issueReturn: IssueReturn
) => {
  const issueRecord = getIssueRecordByIdData(issueId);

  if (!issueRecord) {
    throw new Error("Issue record was not found");
  }

  if (issueRecord.status === "Returned") {
    throw new Error("Issue record has already been returned");
  }

  const returnedBy = normalizeOptionalString(issueReturn.returnedBy);
  const returnedAt =
    normalizeOptionalString(issueReturn.returnedAt) ?? getTodayDate();
  const returnNotes = normalizeOptionalString(issueReturn.returnNotes);

  if (!returnedBy) {
    throw new Error("Missing return fields");
  }

  db.exec("BEGIN");

  try {
    const matchingStockItem = db
      .prepare("SELECT * FROM hq_stock_items WHERE itemName = ?")
      .get(issueRecord.itemName) as HqStockItem | undefined;
    const serialAsset = db
      .prepare(
        `
        SELECT
          assetId,
          stockId,
          storageLocation,
          status,
          issueId
        FROM hq_serial_assets
        WHERE serialNumber = ?
      `
    )
      .get(issueRecord.serialNumber) as
      | Pick<
          SerialAsset,
          "assetId" | "stockId" | "storageLocation" | "status" | "issueId"
        >
      | undefined;

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

    db.prepare(
      `
        UPDATE hq_serial_assets
        SET
          status = 'Available',
          issueId = NULL
        WHERE assetId = ?
      `
    ).run(serialAsset.assetId);

    db.prepare(
      `
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
      `
    ).run(
      `${issueId}-MOVE-RET-001`,
      matchingStockItem.stockId,
      issueRecord.itemName,
      1,
      returnedAt,
      issueId,
      serialAsset.storageLocation,
      JSON.stringify([issueRecord.serialNumber]),
      returnNotes ?? null
    );

    adjustStockLocationBalance(db, {
      stockId: matchingStockItem.stockId,
      storageLocation: serialAsset.storageLocation,
      quantityDelta: 1,
      serializedDelta: 1,
      nonSerializedDelta: 0,
      movementDate: returnedAt,
    });

    updateHqStockLevels(matchingStockItem, nextTotalQuantity);

    db.prepare(
      `
        UPDATE issue_records
        SET
          status = 'Returned',
          returnedBy = ?,
          returnedAt = ?,
          returnNotes = ?
        WHERE issueId = ?
      `
    ).run(returnedBy, returnedAt, returnNotes ?? null, issueId);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getIssueRecordByIdData(issueId);
};

const buildDocumentQueueEntries = (
  receivingReceipts: ReceivingReceipt[],
  issueRecords: IssueRecord[]
) => {
  const receiptEntries: DocumentQueueEntry[] = receivingReceipts
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
      reason:
        receipt.documentStatus === "Missing"
          ? "Receipt has no supporting documents attached."
          : "Receipt documents still need review before full sign-off.",
    }));

  const issueEntries: DocumentQueueEntry[] = issueRecords
    .filter(
      (issue) =>
        issue.attachments.length === 0 && issue.attachmentNames.length === 0
    )
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

  return [...receiptEntries, ...issueEntries].sort((left, right) =>
    right.date === left.date
      ? right.referenceId.localeCompare(left.referenceId)
      : right.date.localeCompare(left.date)
  );
};

const buildRecentActivity = (
  receivingReceipts: ReceivingReceipt[],
  issueRecords: IssueRecord[]
) => {
  const receiptActivity: AuditActivity[] = receivingReceipts.map((receipt) => ({
    activityId: `receipt-${receipt.receiptId}`,
    activityType: "Receipt Logged",
    occurredOn: receipt.arrivalDate,
    actor: receipt.receivedBy,
    referenceId: receipt.receiptId,
    detail: `${receipt.totalQuantity} unit(s) received from ${receipt.supplierName}`,
    status: receipt.documentStatus,
  }));

  const issueActivity: AuditActivity[] = issueRecords.flatMap((issue) => {
    const activities: AuditActivity[] = [
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
    .sort((left, right) =>
      right.occurredOn === left.occurredOn
        ? right.activityId.localeCompare(left.activityId)
        : right.occurredOn.localeCompare(left.occurredOn)
    )
    .slice(0, 8);
};

const buildAuditAlerts = (
  hqStockItems: HqStockItem[],
  receivingReceipts: ReceivingReceipt[],
  issueRecords: IssueRecord[]
) => {
  const lowStockItems = hqStockItems.filter((item) => item.status === "Low Stock");
  const missingReceiptDocuments = receivingReceipts.filter(
    (receipt) => receipt.documentStatus === "Missing"
  );
  const pendingReceiptReview = receivingReceipts.filter(
    (receipt) => receipt.documentStatus === "Pending Review"
  );
  const issuesAwaitingAcknowledgement = issueRecords.filter(
    (issue) => issue.status === "Issued"
  );

  const alerts: AuditAlert[] = [];

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
    const riskiestStockItem = [...lowStockItems].sort(
      (left, right) => left.totalQuantity - right.totalQuantity
    )[0];

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

export const getOperationsOverviewData = () => {
  const receivingReceipts = getReceivingReceiptsData();
  const hqStockItems = getHqStockData();
  const issueRecords = getIssueRecordsData();
  const suppliers = getSuppliersData();
  const branches = getBranchesData();
  const currentMonthPrefix = getTodayDate().slice(0, 7);
  const documentQueueEntries = buildDocumentQueueEntries(
    receivingReceipts,
    issueRecords
  );
  const documentsPendingReview = documentQueueEntries.filter(
    (entry) => entry.documentStatus === "Pending Review"
  ).length;
  const missingDocumentItems = documentQueueEntries.filter(
    (entry) => entry.documentStatus === "Missing"
  ).length;
  const documentQueueTotal = documentQueueEntries.length;

  const receiptsThisMonth = receivingReceipts.filter((receipt) =>
    receipt.arrivalDate.startsWith(currentMonthPrefix)
  ).length;
  const totalReceivedValue = receivingReceipts.reduce(
    (sum, receipt) => sum + receipt.totalAmount,
    0
  );
  const hqUnitsOnHand = hqStockItems.reduce(
    (sum, item) => sum + item.totalQuantity,
    0
  );
  const serializedUnits = hqStockItems.reduce(
    (sum, item) => sum + item.serializedUnits,
    0
  );
  const lowStockItems = hqStockItems.filter((item) => item.status === "Low Stock");
  const acknowledgedIssues = issueRecords.filter(
    (issue) => issue.status === "Acknowledged"
  ).length;
  const returnedIssues = issueRecords.filter(
    (issue) => issue.status === "Returned"
  ).length;
  const branchIssues = issueRecords.filter(
    (issue) => issue.destinationType === "Branch"
  ).length;
  const activeBranches = branches.filter((branch) => branch.status === "Active")
    .length;
  const branchesWithIssuedAssets = new Set(
    issueRecords
      .filter(
        (issue) =>
          issue.destinationType === "Branch" &&
          issue.status !== "Returned" &&
          issue.branchId
      )
      .map((issue) => issue.branchId as string)
  ).size;

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
      .sort((left, right) =>
        left.totalQuantity === right.totalQuantity
          ? left.itemName.localeCompare(right.itemName)
          : left.totalQuantity - right.totalQuantity
      )
      .slice(0, 5),
    documentQueue: documentQueueEntries.slice(0, 6),
    recentActivity: buildRecentActivity(receivingReceipts, issueRecords),
    auditAlerts: buildAuditAlerts(hqStockItems, receivingReceipts, issueRecords),
  };
};
