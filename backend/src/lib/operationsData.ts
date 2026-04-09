import fs from "fs";
import path from "path";
import { UploadedIssueAttachment } from "./issueUploads";

const { DatabaseSync } = require("node:sqlite") as {
  DatabaseSync: new (path: string) => any;
};

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
  serialNumbers: string[];
  notes?: string;
};

type HqStockItemDetail = HqStockItem & {
  availableSerialCount: number;
  issuedSerialCount: number;
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

type SerialSeedTemplate = {
  prefix: string;
  start: number;
  padding: number;
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

const receivingReceiptSeeds: ReceivingReceipt[] = [
  {
    receiptId: "RCV-2026-004",
    receiptType: "Batch",
    supplierId: "SUP-001",
    supplierName: "Zim Office Tech",
    arrivalDate: "2026-04-03",
    signedBy: "L. Dlamini",
    receivedBy: "Procurement Desk",
    itemCount: 4,
    totalQuantity: 26,
    totalAmount: 18450,
    documentCount: 3,
    documentStatus: "Complete",
    status: "Verified",
  },
  {
    receiptId: "RCV-2026-003",
    receiptType: "Single Item",
    supplierId: "SUP-004",
    supplierName: "Prime Devices Africa",
    arrivalDate: "2026-04-01",
    signedBy: "S. Mupfumi",
    receivedBy: "Stores Officer",
    itemCount: 1,
    totalQuantity: 1,
    totalAmount: 920,
    documentCount: 2,
    documentStatus: "Pending Review",
    status: "Pending Review",
  },
  {
    receiptId: "RCV-2026-002",
    receiptType: "Batch",
    supplierId: "SUP-002",
    supplierName: "SecureNet Distribution",
    arrivalDate: "2026-03-28",
    signedBy: "P. Chuma",
    receivedBy: "Procurement Desk",
    itemCount: 3,
    totalQuantity: 18,
    totalAmount: 12680,
    documentCount: 1,
    documentStatus: "Pending Review",
    status: "Logged",
  },
  {
    receiptId: "RCV-2026-001",
    receiptType: "Single Item",
    supplierId: "SUP-003",
    supplierName: "Office Source Wholesale",
    arrivalDate: "2026-03-19",
    signedBy: "T. Moyo",
    receivedBy: "Stores Officer",
    itemCount: 1,
    totalQuantity: 1,
    totalAmount: 640,
    documentCount: 0,
    documentStatus: "Missing",
    status: "Pending Review",
  },
];

const hqStockSeeds: HqStockItem[] = [
  {
    stockId: "STK-001",
    itemName: "Lenovo ThinkPad E14",
    category: "Laptop",
    totalQuantity: 12,
    serializedUnits: 12,
    nonSerializedUnits: 0,
    supplierName: "Zim Office Tech",
    lastArrivalDate: "2026-04-03",
    storageLocation: "HQ Cage A1",
    status: "Available",
  },
  {
    stockId: "STK-002",
    itemName: "MikroTik Router RB4011",
    category: "Network",
    totalQuantity: 6,
    serializedUnits: 6,
    nonSerializedUnits: 0,
    supplierName: "SecureNet Distribution",
    lastArrivalDate: "2026-03-28",
    storageLocation: "HQ Cage B2",
    status: "Available",
  },
  {
    stockId: "STK-003",
    itemName: 'HP 24" Monitor',
    category: "Monitor",
    totalQuantity: 20,
    serializedUnits: 0,
    nonSerializedUnits: 20,
    supplierName: "Zim Office Tech",
    lastArrivalDate: "2026-04-03",
    storageLocation: "HQ Rack C4",
    status: "Reserved",
  },
  {
    stockId: "STK-004",
    itemName: "Visitor Access Tablets",
    category: "Tablet",
    totalQuantity: 3,
    serializedUnits: 3,
    nonSerializedUnits: 0,
    supplierName: "Prime Devices Africa",
    lastArrivalDate: "2026-04-01",
    storageLocation: "HQ Cage A3",
    status: "Available",
  },
  {
    stockId: "STK-005",
    itemName: "Receipt Folders",
    category: "Stationery",
    totalQuantity: 40,
    serializedUnits: 0,
    nonSerializedUnits: 40,
    supplierName: "Office Source Wholesale",
    lastArrivalDate: "2026-03-19",
    storageLocation: "HQ Rack D1",
    status: "Low Stock",
  },
];

const issueRecordSeeds: IssueRecord[] = [
  {
    issueId: "ISS-2026-007",
    itemName: "Lenovo ThinkPad E14",
    serialNumber: "LNV-E14-240041",
    destinationType: "Branch",
    branchId: "BR-002",
    issuedTo: "Bulawayo Branch",
    issuedBy: "L. Dlamini",
    address: "12 Jason Moyo Road, Bulawayo",
    issueDate: "2026-04-05",
    attachmentNames: ["signed-dispatch-note.pdf", "vehicle-log.jpg"],
    attachments: [],
    notes: "Issued for new branch onboarding team.",
    status: "Issued",
  },
  {
    issueId: "ISS-2026-006",
    itemName: "MikroTik Router RB4011",
    serialNumber: "MKT-RB4011-7782",
    destinationType: "Branch",
    branchId: "BR-003",
    issuedTo: "Mutare Branch",
    issuedBy: "P. Chuma",
    address: "16 Herbert Chitepo Street, Mutare",
    issueDate: "2026-04-04",
    attachmentNames: ["router-issue-form.pdf"],
    attachments: [],
    notes: "Replacement router for branch connectivity upgrade.",
    acknowledgedBy: "B. Nyoni",
    acknowledgedAt: "2026-04-05",
    acknowledgementNotes: "Installed and confirmed by branch IT desk.",
    status: "Acknowledged",
  },
  {
    issueId: "ISS-2026-005",
    itemName: "Visitor Access Tablets",
    serialNumber: "VAT-TAB-1020",
    destinationType: "Person",
    issuedTo: "K. Mpofu",
    issuedBy: "S. Mupfumi",
    address: "OMDS Gweru Branch, Main Reception",
    issueDate: "2026-04-02",
    attachmentNames: [],
    attachments: [],
    notes: "Assigned to branch receptionist for visitor sign-in.",
    acknowledgedBy: "K. Mpofu",
    acknowledgedAt: "2026-04-02",
    status: "Acknowledged",
  },
  {
    issueId: "ISS-2026-004",
    itemName: 'HP 24" Monitor',
    serialNumber: "MON-HP24-3308",
    destinationType: "Person",
    issuedTo: "R. Dube",
    issuedBy: "L. Dlamini",
    address: "OMDS HQ Finance Office",
    issueDate: "2026-04-06",
    attachmentNames: ["desk-allocation-note.pdf"],
    attachments: [],
    notes: "Temporary workstation allocation at HQ.",
    status: "Issued",
  },
];

const serialSeedTemplates: Record<string, SerialSeedTemplate> = {
  "Lenovo ThinkPad E14": {
    prefix: "LNV-E14-",
    start: 240101,
    padding: 6,
  },
  "MikroTik Router RB4011": {
    prefix: "MKT-RB4011-",
    start: 7801,
    padding: 4,
  },
  "Visitor Access Tablets": {
    prefix: "VAT-TAB-",
    start: 1101,
    padding: 4,
  },
};

const configuredDatabasePath =
  process.env.OPERATIONS_DB_PATH || "./data/operations.sqlite";
const resolvedDatabasePath = path.isAbsolute(configuredDatabasePath)
  ? configuredDatabasePath
  : path.join(process.cwd(), configuredDatabasePath);

fs.mkdirSync(path.dirname(resolvedDatabasePath), { recursive: true });

const db = new DatabaseSync(resolvedDatabasePath);

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

const getTodayDate = () => new Date().toISOString().split("T")[0];

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
  downloadUrl: `${getPublicApiBaseUrl()}/operations/attachments/${
    row.attachmentId
  }/download`,
});

const buildSeedSerialNumber = (itemName: string, index: number) => {
  const template = serialSeedTemplates[itemName];

  if (template) {
    return `${template.prefix}${String(template.start + index).padStart(
      template.padding,
      "0"
    )}`;
  }

  const compactItemName = itemName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12);

  return `SER-${compactItemName}-${String(index + 1).padStart(4, "0")}`;
};

const getTableColumns = (tableName: string) => {
  return (
    db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{ name: string }>
  ).map((column) => column.name);
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
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
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

  migrateIssueRecordsTableIfNeeded();

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_issue_records_status
    ON issue_records (status, issueDate);

    CREATE INDEX IF NOT EXISTS idx_issue_records_branch
    ON issue_records (branchId, destinationType);
  `);

  const supplierCount =
    db.prepare("SELECT COUNT(*) AS count FROM suppliers").get().count || 0;
  const branchCount =
    db.prepare("SELECT COUNT(*) AS count FROM branches").get().count || 0;
  const receiptCount =
    db.prepare("SELECT COUNT(*) AS count FROM receiving_receipts").get().count ||
    0;
  const stockCount =
    db.prepare("SELECT COUNT(*) AS count FROM hq_stock_items").get().count || 0;
  const issueCount =
    db.prepare("SELECT COUNT(*) AS count FROM issue_records").get().count || 0;
  const serialAssetCount =
    db.prepare("SELECT COUNT(*) AS count FROM hq_serial_assets").get().count ||
    0;

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

  if (receiptCount === 0) {
    const insertReceipt = db.prepare(`
      INSERT INTO receiving_receipts (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    receivingReceiptSeeds.forEach((receipt) => {
      insertReceipt.run(
        receipt.receiptId,
        receipt.receiptType,
        receipt.supplierId,
        receipt.supplierName,
        receipt.arrivalDate,
        receipt.signedBy,
        receipt.receivedBy,
        receipt.itemCount,
        receipt.totalQuantity,
        receipt.totalAmount,
        receipt.documentCount,
        receipt.documentStatus,
        receipt.status
      );
    });
  }

  if (stockCount === 0) {
    const insertStockItem = db.prepare(`
      INSERT INTO hq_stock_items (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    hqStockSeeds.forEach((item) => {
      insertStockItem.run(
        item.stockId,
        item.itemName,
        item.category,
        item.totalQuantity,
        item.serializedUnits,
        item.nonSerializedUnits,
        item.supplierName,
        item.lastArrivalDate,
        item.storageLocation,
        item.status
      );
    });
  }

  if (issueCount === 0) {
    const insertIssue = db.prepare(`
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
    `);

    issueRecordSeeds.forEach((issue) => {
      insertIssue.run(
        issue.issueId,
        issue.itemName,
        issue.serialNumber,
        issue.destinationType,
        issue.branchId ?? null,
        issue.issuedTo,
        issue.issuedBy,
        issue.address,
        issue.issueDate,
        JSON.stringify(issue.attachmentNames),
        issue.notes ?? null,
        issue.acknowledgedBy ?? null,
        issue.acknowledgedAt ?? null,
        issue.acknowledgementNotes ?? null,
        issue.returnedBy ?? null,
        issue.returnedAt ?? null,
        issue.returnNotes ?? null,
        issue.status
      );
    });
  }

  if (serialAssetCount === 0) {
    const stockRows = db
      .prepare(
        `
          SELECT
            stockId,
            itemName,
            serializedUnits,
            supplierName,
            lastArrivalDate,
            storageLocation
          FROM hq_stock_items
          WHERE serializedUnits > 0
          ORDER BY stockId ASC
        `
      )
      .all() as Array<{
      stockId: string;
      itemName: string;
      serializedUnits: number;
      supplierName: string;
      lastArrivalDate: string;
      storageLocation: string;
    }>;

    const insertSerialAsset = db.prepare(`
      INSERT INTO hq_serial_assets (
        assetId,
        stockId,
        itemName,
        serialNumber,
        supplierName,
        lastArrivalDate,
        storageLocation,
        status,
        issueId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stockRows.forEach((stockRow) => {
      for (let index = 0; index < stockRow.serializedUnits; index += 1) {
        insertSerialAsset.run(
          `${stockRow.stockId}-SER-${String(index + 1).padStart(3, "0")}`,
          stockRow.stockId,
          stockRow.itemName,
          buildSeedSerialNumber(stockRow.itemName, index),
          stockRow.supplierName,
          stockRow.lastArrivalDate,
          stockRow.storageLocation,
          "Available",
          null
        );
      }
    });
  }

  backfillIssueRecordBranchIds();
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
    .all() as HqStockItem[];

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
    const availableSerializedUnits = Math.min(
      availableSerialCounts.get(stockItem.stockId) ?? 0,
      stockItem.totalQuantity
    );

    return {
      ...stockItem,
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
  const nextStatus =
    stockItem.status === "Reserved"
      ? "Reserved"
      : nextTotalQuantity <= 5
      ? "Low Stock"
      : "Available";

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
  const highestIssueSequence =
    db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(issueId, 10) AS INTEGER)) AS sequence FROM issue_records"
      )
      .get().sequence || 0;
  const issueId = `ISS-${new Date().getFullYear()}-${String(
    highestIssueSequence + 1
  ).padStart(3, "0")}`;

  const trimmedItemName = newIssueRecord.itemName.trim();
  const trimmedSerialNumber = newIssueRecord.serialNumber.trim();
  const trimmedIssuedBy = newIssueRecord.issuedBy.trim();
  const trimmedIssuedTo = newIssueRecord.issuedTo.trim();
  const trimmedAddress = newIssueRecord.address.trim();
  const trimmedNotes = normalizeOptionalString(newIssueRecord.notes);
  const isBranchIssue = newIssueRecord.destinationType === "Branch";
  const isPersonIssue = newIssueRecord.destinationType === "Person";

  if (!isBranchIssue && !isPersonIssue) {
    throw new Error("Invalid issue destination type");
  }

  const selectedBranch = isBranchIssue
    ? newIssueRecord.branchId
      ? getBranchById(newIssueRecord.branchId)
      : getBranchByName(trimmedIssuedTo)
    : undefined;

  if (isBranchIssue && (!selectedBranch || selectedBranch.status !== "Active")) {
    throw new Error("Selected branch was not found");
  }

  const resolvedIssuedTo = selectedBranch?.name ?? trimmedIssuedTo;
  const resolvedAddress = selectedBranch?.address ?? trimmedAddress;

  if (
    !trimmedItemName ||
    !trimmedSerialNumber ||
    !resolvedIssuedTo ||
    !trimmedIssuedBy ||
    !resolvedAddress ||
    !newIssueRecord.issueDate
  ) {
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
    .get(trimmedSerialNumber);

  if (existingActiveIssue) {
    throw new Error("This serial number has already been issued");
  }

  const matchingStockItem = db
    .prepare("SELECT * FROM hq_stock_items WHERE itemName = ?")
    .get(trimmedItemName);

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
          serialNumber
        FROM hq_serial_assets
        WHERE itemName = ? AND serialNumber = ? AND status = 'Available'
      `
    )
    .get(trimmedItemName, trimmedSerialNumber);

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
    itemName: trimmedItemName,
    serialNumber: trimmedSerialNumber,
    destinationType: newIssueRecord.destinationType,
    branchId: selectedBranch?.branchId,
    issuedTo: resolvedIssuedTo,
    issuedBy: trimmedIssuedBy,
    address: resolvedAddress,
    issueDate: newIssueRecord.issueDate,
    attachmentNames,
    attachments: [],
    notes: trimmedNotes,
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
          downloadUrl: `${getPublicApiBaseUrl()}/operations/attachments/${attachmentId}/download`,
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
          serialNumbers,
          notes
        ) VALUES (?, 'Issue Out', ?, ?, ?, ?, 'issue_record', ?, ?, ?)
      `
    ).run(
      `${createdRecord.issueId}-MOVE-001`,
      matchingStockItem.stockId,
      createdRecord.itemName,
      -1,
      createdRecord.issueDate,
      createdRecord.issueId,
      JSON.stringify([createdRecord.serialNumber]),
      createdRecord.notes ?? null
    );

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

  const acknowledgedBy = acknowledgement.acknowledgedBy.trim();
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

  const returnedBy = issueReturn.returnedBy.trim();
  const returnedAt =
    normalizeOptionalString(issueReturn.returnedAt) ?? getTodayDate();
  const returnNotes = normalizeOptionalString(issueReturn.returnNotes);

  if (!returnedBy) {
    throw new Error("Missing return fields");
  }

  const matchingStockItem = db
    .prepare("SELECT * FROM hq_stock_items WHERE itemName = ?")
    .get(issueRecord.itemName);
  const serialAsset = db
    .prepare(
      `
        SELECT
          assetId,
          stockId,
          status,
          issueId
        FROM hq_serial_assets
        WHERE serialNumber = ?
      `
    )
    .get(issueRecord.serialNumber);

  db.exec("BEGIN");

  try {
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

    const canRestock =
      matchingStockItem &&
      serialAsset &&
      serialAsset.status === "Issued" &&
      (!serialAsset.issueId || serialAsset.issueId === issueId);

    if (serialAsset && serialAsset.status === "Issued") {
      db.prepare(
        `
          UPDATE hq_serial_assets
          SET
            status = 'Available',
            issueId = NULL
          WHERE assetId = ?
        `
      ).run(serialAsset.assetId);
    }

    if (canRestock) {
      const nextTotalQuantity = matchingStockItem.totalQuantity + 1;

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
            serialNumbers,
            notes
          ) VALUES (?, 'Return', ?, ?, ?, ?, 'issue_record', ?, ?, ?)
        `
      ).run(
        `${issueId}-MOVE-RET-001`,
        matchingStockItem.stockId,
        issueRecord.itemName,
        1,
        returnedAt,
        issueId,
        JSON.stringify([issueRecord.serialNumber]),
        returnNotes ?? null
      );

      updateHqStockLevels(matchingStockItem, nextTotalQuantity);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getIssueRecordByIdData(issueId);
};

const buildDocumentQueue = (
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

  return [...receiptEntries, ...issueEntries]
    .sort((left, right) =>
      right.date === left.date
        ? right.referenceId.localeCompare(left.referenceId)
        : right.date.localeCompare(left.date)
    )
    .slice(0, 6);
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
  const documentsPendingReview = receivingReceipts.filter(
    (receipt) => receipt.documentStatus !== "Complete"
  ).length;
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
    documentsPendingReview,
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
    documentQueue: buildDocumentQueue(receivingReceipts, issueRecords),
    recentActivity: buildRecentActivity(receivingReceipts, issueRecords),
    auditAlerts: buildAuditAlerts(hqStockItems, receivingReceipts, issueRecords),
  };
};
