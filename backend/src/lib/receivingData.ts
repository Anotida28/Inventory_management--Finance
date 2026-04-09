import fs from "fs";
import path from "path";
import { UploadedReceiptAttachment } from "./receiptUploads";

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

export type ReceiptAttachment = {
  attachmentId: string;
  receiptId: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
};

export type ReceivingReceiptLine = {
  lineId: string;
  receiptId: string;
  lineNumber: number;
  itemName: string;
  category: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  storageLocation: string;
  isSerialized: boolean;
  serialNumbers: string[];
};

export type ReceivingReceipt = {
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
  attachmentNames: string[];
  attachments: ReceiptAttachment[];
};

export type ReceivingReceiptDetail = ReceivingReceipt & {
  lines: ReceivingReceiptLine[];
};

type ReceivingKnownItem = {
  itemName: string;
  category: string;
  defaultStorageLocation: string;
  supplierName: string;
  isSerialized: boolean;
};

export type ReceivingOptions = {
  suppliers: Supplier[];
  stockLocations: string[];
  knownItems: ReceivingKnownItem[];
  receivedBySuggestions: string[];
  signedBySuggestions: string[];
};

export type NewReceivingReceiptLine = {
  itemName: string;
  category: string;
  quantity: number | string;
  unitCost: number | string;
  storageLocation: string;
  isSerialized?: boolean | string;
  serialNumbers?: string[] | string;
};

export type NewReceivingReceipt = {
  receiptType: "Batch" | "Single Item";
  supplierId: string;
  arrivalDate: string;
  signedBy: string;
  receivedBy: string;
  documentStatus?: "Complete" | "Pending Review" | "Missing";
  lines: NewReceivingReceiptLine[];
};

type OperationAttachment = {
  attachmentId: string;
  entityType: string;
  entityId: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  downloadUrl: string;
};

type StockLocationSeed = {
  locationId: string;
  locationName: string;
};

const stockLocationSeeds: StockLocationSeed[] = [
  { locationId: "LOC-001", locationName: "HQ Cage A1" },
  { locationId: "LOC-002", locationName: "HQ Cage A2" },
  { locationId: "LOC-003", locationName: "HQ Cage A3" },
  { locationId: "LOC-004", locationName: "HQ Cage B2" },
  { locationId: "LOC-005", locationName: "HQ Rack C4" },
  { locationId: "LOC-006", locationName: "HQ Rack D1" },
  { locationId: "LOC-007", locationName: "HQ Rack E2" },
];

const configuredDatabasePath =
  process.env.OPERATIONS_DB_PATH || "./data/operations.sqlite";
const resolvedDatabasePath = path.isAbsolute(configuredDatabasePath)
  ? configuredDatabasePath
  : path.join(process.cwd(), configuredDatabasePath);

fs.mkdirSync(path.dirname(resolvedDatabasePath), { recursive: true });

const db = new DatabaseSync(resolvedDatabasePath);

const parseJsonArray = (value: string | null) => {
  if (!value) return [];

  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
};

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeNumber = (value: unknown) => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return Number.NaN;
};

const normalizeBoolean = (value: unknown) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }

  return false;
};

const getPublicApiBaseUrl = () =>
  process.env.PUBLIC_API_BASE_URL ||
  `http://localhost:${process.env.PORT || 3001}`;

const ensureExtendedReceivingSchema = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_locations (
      locationId TEXT PRIMARY KEY,
      locationName TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS receiving_receipt_lines (
      lineId TEXT PRIMARY KEY,
      receiptId TEXT NOT NULL,
      lineNumber INTEGER NOT NULL,
      itemName TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unitCost REAL NOT NULL,
      totalCost REAL NOT NULL,
      storageLocation TEXT NOT NULL,
      isSerialized INTEGER NOT NULL DEFAULT 0,
      serialNumbers TEXT NOT NULL DEFAULT '[]'
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

    CREATE INDEX IF NOT EXISTS idx_receiving_receipt_lines_receipt
    ON receiving_receipt_lines (receiptId, lineNumber);

    CREATE INDEX IF NOT EXISTS idx_stock_movements_reference
    ON stock_movements (referenceType, referenceId);
  `);

  const stockLocationCount =
    db.prepare("SELECT COUNT(*) AS count FROM stock_locations").get().count || 0;

  if (stockLocationCount === 0) {
    const insertLocation = db.prepare(`
      INSERT INTO stock_locations (locationId, locationName)
      VALUES (?, ?)
    `);

    stockLocationSeeds.forEach((location) => {
      insertLocation.run(location.locationId, location.locationName);
    });
  }
};

ensureExtendedReceivingSchema();

const mapReceiptAttachment = (row: any): ReceiptAttachment => ({
  attachmentId: row.attachmentId,
  receiptId: row.receiptId,
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

const mapOperationAttachment = (row: any): OperationAttachment => ({
  attachmentId: row.attachmentId,
  entityType: row.entityType,
  entityId: row.entityId,
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

const mapReceivingReceiptLine = (row: any): ReceivingReceiptLine => ({
  lineId: row.lineId,
  receiptId: row.receiptId,
  lineNumber: row.lineNumber,
  itemName: row.itemName,
  category: row.category,
  quantity: row.quantity,
  unitCost: row.unitCost,
  totalCost: row.totalCost,
  storageLocation: row.storageLocation,
  isSerialized: Boolean(row.isSerialized),
  serialNumbers: parseJsonArray(row.serialNumbers),
});

const getReceiptAttachmentsByReceiptIds = (receiptIds: string[]) => {
  const attachmentsByReceiptId = new Map<string, ReceiptAttachment[]>();

  if (receiptIds.length === 0) {
    return attachmentsByReceiptId;
  }

  const placeholders = receiptIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
        SELECT
          attachmentId,
          entityId AS receiptId,
          originalName,
          storedName,
          storagePath,
          mimeType,
          fileSize,
          uploadedAt
        FROM attachments
        WHERE entityType = 'receiving_receipt' AND entityId IN (${placeholders})
        ORDER BY uploadedAt ASC, originalName ASC
      `
    )
    .all(...receiptIds);

  rows.forEach((row: any) => {
    const mappedAttachment = mapReceiptAttachment(row);
    const receiptAttachments =
      attachmentsByReceiptId.get(mappedAttachment.receiptId) ?? [];

    receiptAttachments.push(mappedAttachment);
    attachmentsByReceiptId.set(mappedAttachment.receiptId, receiptAttachments);
  });

  return attachmentsByReceiptId;
};

const getReceiptLinesByReceiptId = (receiptId: string) => {
  const rows = db
    .prepare(
      `
        SELECT
          lineId,
          receiptId,
          lineNumber,
          itemName,
          category,
          quantity,
          unitCost,
          totalCost,
          storageLocation,
          isSerialized,
          serialNumbers
        FROM receiving_receipt_lines
        WHERE receiptId = ?
        ORDER BY lineNumber ASC
      `
    )
    .all(receiptId);

  return rows.map(mapReceivingReceiptLine);
};

const deriveReceiptStatus = (
  documentStatus: ReceivingReceipt["documentStatus"]
): ReceivingReceipt["status"] => {
  if (documentStatus === "Complete") {
    return "Verified";
  }

  return "Pending Review";
};

const ensureStockLocationExists = (storageLocation: string) => {
  const existingLocation = db
    .prepare("SELECT locationId FROM stock_locations WHERE locationName = ?")
    .get(storageLocation);

  if (existingLocation) {
    return;
  }

  const highestSequence =
    db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(locationId, 5) AS INTEGER)) AS sequence FROM stock_locations"
      )
      .get().sequence || 0;

  const locationId = `LOC-${String(highestSequence + 1).padStart(3, "0")}`;

  db.prepare(
    `
      INSERT INTO stock_locations (locationId, locationName)
      VALUES (?, ?)
    `
  ).run(locationId, storageLocation);
};

const getNextReceiptId = () => {
  const highestSequence =
    db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(receiptId, 10) AS INTEGER)) AS sequence FROM receiving_receipts"
      )
      .get().sequence || 0;

  return `RCV-${new Date().getFullYear()}-${String(highestSequence + 1).padStart(
    3,
    "0"
  )}`;
};

const getNextStockId = () => {
  const highestSequence =
    db
      .prepare(
        "SELECT MAX(CAST(SUBSTR(stockId, 5) AS INTEGER)) AS sequence FROM hq_stock_items"
      )
      .get().sequence || 0;

  return `STK-${String(highestSequence + 1).padStart(3, "0")}`;
};

const parseSerialNumbers = (value: NewReceivingReceiptLine["serialNumbers"]) => {
  if (Array.isArray(value)) {
    return value.map((serial) => serial.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]+/)
      .map((serial) => serial.trim())
      .filter(Boolean);
  }

  return [];
};

const isSerializedItemInStock = (itemName: string) => {
  const serialCount =
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM hq_serial_assets
          WHERE itemName = ?
        `
      )
      .get(itemName).count || 0;

  return serialCount > 0;
};

const getAvailableSerialCountByStockId = (stockId: string) => {
  return (
    db
      .prepare(
        `
          SELECT COUNT(*) AS count
          FROM hq_serial_assets
          WHERE stockId = ? AND status = 'Available'
        `
      )
      .get(stockId).count || 0
  );
};

export const getReceivingOptionsData = (): ReceivingOptions => {
  const suppliers = db
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

  const stockLocations = (
    db
      .prepare(
        `
          SELECT locationName
          FROM stock_locations
          ORDER BY locationName ASC
        `
      )
      .all() as Array<{ locationName: string }>
  ).map((location) => location.locationName);

  const knownItems = (
    db
      .prepare(
        `
          SELECT
            itemName,
            category,
            storageLocation AS defaultStorageLocation,
            supplierName
          FROM hq_stock_items
          ORDER BY itemName ASC
        `
      )
      .all() as Array<{
      itemName: string;
      category: string;
      defaultStorageLocation: string;
      supplierName: string;
    }>
  ).map((item) => ({
    ...item,
    isSerialized: isSerializedItemInStock(item.itemName),
  }));

  const receivedBySuggestions = (
    db
      .prepare(
        `
          SELECT DISTINCT receivedBy
          FROM receiving_receipts
          ORDER BY receivedBy ASC
        `
      )
      .all() as Array<{ receivedBy: string }>
  ).map((row) => row.receivedBy);

  const signedBySuggestions = (
    db
      .prepare(
        `
          SELECT DISTINCT signedBy
          FROM receiving_receipts
          ORDER BY signedBy ASC
        `
      )
      .all() as Array<{ signedBy: string }>
  ).map((row) => row.signedBy);

  return {
    suppliers,
    stockLocations,
    knownItems,
    receivedBySuggestions,
    signedBySuggestions,
  };
};

export const getReceivingReceiptsWithAttachmentsData = (): ReceivingReceipt[] => {
  const rows = db
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
    .all();

  const attachmentsByReceiptId = getReceiptAttachmentsByReceiptIds(
    rows.map((row: any) => row.receiptId)
  );

  return rows.map((row: any) => {
    const attachments = attachmentsByReceiptId.get(row.receiptId) ?? [];

    return {
      receiptId: row.receiptId,
      receiptType: row.receiptType,
      supplierId: row.supplierId,
      supplierName: row.supplierName,
      arrivalDate: row.arrivalDate,
      signedBy: row.signedBy,
      receivedBy: row.receivedBy,
      itemCount: row.itemCount,
      totalQuantity: row.totalQuantity,
      totalAmount: row.totalAmount,
      documentCount: row.documentCount,
      documentStatus: row.documentStatus,
      status: row.status,
      attachments,
      attachmentNames: attachments.map((attachment) => attachment.originalName),
    };
  });
};

export const getReceivingReceiptByIdData = (
  receiptId: string
): ReceivingReceiptDetail | null => {
  const row = db
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
        WHERE receiptId = ?
      `
    )
    .get(receiptId);

  if (!row) {
    return null;
  }

  const attachments = getReceiptAttachmentsByReceiptIds([receiptId]).get(
    receiptId
  ) ?? [];

  return {
    receiptId: row.receiptId,
    receiptType: row.receiptType,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    arrivalDate: row.arrivalDate,
    signedBy: row.signedBy,
    receivedBy: row.receivedBy,
    itemCount: row.itemCount,
    totalQuantity: row.totalQuantity,
    totalAmount: row.totalAmount,
    documentCount: row.documentCount,
    documentStatus: row.documentStatus,
    status: row.status,
    attachments,
    attachmentNames: attachments.map((attachment) => attachment.originalName),
    lines: getReceiptLinesByReceiptId(receiptId),
  };
};

export const getOperationAttachmentByIdData = (
  attachmentId: string
): OperationAttachment | null => {
  const row = db
    .prepare(
      `
        SELECT
          attachmentId,
          entityType,
          entityId,
          originalName,
          storedName,
          storagePath,
          mimeType,
          fileSize,
          uploadedAt
        FROM attachments
        WHERE attachmentId = ?
      `
    )
    .get(attachmentId);

  if (!row) {
    return null;
  }

  return mapOperationAttachment(row);
};

export const createReceivingReceiptData = (
  newReceipt: NewReceivingReceipt,
  uploadedAttachments: UploadedReceiptAttachment[] = []
): ReceivingReceiptDetail => {
  const receiptType = normalizeString(newReceipt.receiptType) as
    | "Batch"
    | "Single Item";
  const supplierId = normalizeString(newReceipt.supplierId);
  const arrivalDate = normalizeString(newReceipt.arrivalDate);
  const signedBy = normalizeString(newReceipt.signedBy);
  const receivedBy = normalizeString(newReceipt.receivedBy);
  const documentStatus = (
    normalizeString(newReceipt.documentStatus) || "Pending Review"
  ) as ReceivingReceipt["documentStatus"];
  const lines = Array.isArray(newReceipt.lines) ? newReceipt.lines : [];

  if (!supplierId || !arrivalDate || !signedBy || !receivedBy || lines.length === 0) {
    throw new Error("Missing required receipt fields");
  }

  if (receiptType !== "Batch" && receiptType !== "Single Item") {
    throw new Error("Invalid receipt type");
  }

  if (
    documentStatus !== "Complete" &&
    documentStatus !== "Pending Review" &&
    documentStatus !== "Missing"
  ) {
    throw new Error("Invalid document status");
  }

  if (receiptType === "Single Item" && lines.length !== 1) {
    throw new Error("Single item receipts can only contain one line");
  }

  const supplier = db
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
        WHERE supplierId = ?
      `
    )
    .get(supplierId) as Supplier | undefined;

  if (!supplier) {
    throw new Error("Supplier was not found");
  }

  const normalizedLines = lines.map((line, index) => {
    const itemName = normalizeString(line.itemName);
    const category = normalizeString(line.category);
    const storageLocation = normalizeString(line.storageLocation);
    const quantity = normalizeNumber(line.quantity);
    const unitCost = normalizeNumber(line.unitCost);
    const serialNumbers = parseSerialNumbers(line.serialNumbers);
    const requestedSerialized = normalizeBoolean(line.isSerialized);

    if (
      !itemName ||
      !category ||
      !storageLocation ||
      !Number.isFinite(quantity) ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitCost) ||
      unitCost < 0
    ) {
      throw new Error(`Receipt line ${index + 1} is missing required fields`);
    }

    const existingStockItem = db
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
          WHERE itemName = ?
        `
      )
      .get(itemName) as HqStockItem | undefined;

    const existingSerializedItem = isSerializedItemInStock(itemName);
    const isSerialized = existingStockItem
      ? existingSerializedItem || requestedSerialized
      : requestedSerialized;

    if (existingSerializedItem && !requestedSerialized) {
      throw new Error(
        `Receipt line ${index + 1} must include serial numbers for ${itemName}`
      );
    }

    if (
      existingStockItem &&
      !existingSerializedItem &&
      requestedSerialized &&
      existingStockItem.totalQuantity > 0
    ) {
      throw new Error(
        `Receipt line ${index + 1} cannot switch ${itemName} to serialized stock`
      );
    }

    if (isSerialized && serialNumbers.length !== quantity) {
      throw new Error(
        `Receipt line ${index + 1} must include one serial number per unit`
      );
    }

    if (!isSerialized && serialNumbers.length > 0) {
      throw new Error(
        `Receipt line ${index + 1} includes serial numbers for a non-serialized item`
      );
    }

    const duplicatesInLine = new Set<string>();
    serialNumbers.forEach((serialNumber) => {
      if (duplicatesInLine.has(serialNumber)) {
        throw new Error(`Receipt line ${index + 1} contains duplicate serials`);
      }

      duplicatesInLine.add(serialNumber);
    });

    return {
      lineNumber: index + 1,
      itemName,
      category: existingStockItem?.category || category,
      quantity,
      unitCost,
      totalCost: Number((quantity * unitCost).toFixed(2)),
      storageLocation,
      isSerialized,
      serialNumbers,
      existingStockItem,
    };
  });

  const seenSerialNumbers = new Set<string>();
  const seenItemNames = new Set<string>();

  normalizedLines.forEach((line) => {
    const normalizedItemName = line.itemName.toLowerCase();

    if (seenItemNames.has(normalizedItemName)) {
      throw new Error("Each item can only appear once per receipt");
    }

    seenItemNames.add(normalizedItemName);
  });

  normalizedLines.forEach((line) => {
    line.serialNumbers.forEach((serialNumber) => {
      if (seenSerialNumbers.has(serialNumber)) {
        throw new Error("Duplicate serial numbers were supplied in this receipt");
      }

      seenSerialNumbers.add(serialNumber);

      const existingSerial = db
        .prepare(
          `
            SELECT assetId
            FROM hq_serial_assets
            WHERE serialNumber = ?
          `
        )
        .get(serialNumber);

      if (existingSerial) {
        throw new Error(`Serial number ${serialNumber} already exists in HQ stock`);
      }
    });
  });

  const receiptId = getNextReceiptId();
  const totalQuantity = normalizedLines.reduce(
    (sum, line) => sum + line.quantity,
    0
  );
  const totalAmount = Number(
    normalizedLines.reduce((sum, line) => sum + line.totalCost, 0).toFixed(2)
  );
  const createdStatus = deriveReceiptStatus(documentStatus);

  const createdReceipt: ReceivingReceiptDetail = {
    receiptId,
    receiptType,
    supplierId,
    supplierName: supplier.name,
    arrivalDate,
    signedBy,
    receivedBy,
    itemCount: normalizedLines.length,
    totalQuantity,
    totalAmount,
    documentCount: uploadedAttachments.length,
    documentStatus,
    status: createdStatus,
    attachmentNames: uploadedAttachments.map((attachment) => attachment.originalName),
    attachments: [],
    lines: [],
  };

  db.exec("BEGIN");

  try {
    db.prepare(
      `
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
      `
    ).run(
      createdReceipt.receiptId,
      createdReceipt.receiptType,
      createdReceipt.supplierId,
      createdReceipt.supplierName,
      createdReceipt.arrivalDate,
      createdReceipt.signedBy,
      createdReceipt.receivedBy,
      createdReceipt.itemCount,
      createdReceipt.totalQuantity,
      createdReceipt.totalAmount,
      createdReceipt.documentCount,
      createdReceipt.documentStatus,
      createdReceipt.status
    );

    db.prepare(
      `
        UPDATE suppliers
        SET lastDeliveryDate = ?
        WHERE supplierId = ?
      `
    ).run(arrivalDate, supplierId);

    const insertReceiptLine = db.prepare(
      `
        INSERT INTO receiving_receipt_lines (
          lineId,
          receiptId,
          lineNumber,
          itemName,
          category,
          quantity,
          unitCost,
          totalCost,
          storageLocation,
          isSerialized,
          serialNumbers
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );

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
        ) VALUES (?, 'receiving_receipt', ?, ?, ?, ?, ?, ?, ?)
      `
    );

    const insertStockMovement = db.prepare(
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
        ) VALUES (?, 'Receipt', ?, ?, ?, ?, 'receiving_receipt', ?, ?, ?)
      `
    );

    normalizedLines.forEach((line) => {
      ensureStockLocationExists(line.storageLocation);

      const lineId = `${createdReceipt.receiptId}-LINE-${String(
        line.lineNumber
      ).padStart(3, "0")}`;

      insertReceiptLine.run(
        lineId,
        createdReceipt.receiptId,
        line.lineNumber,
        line.itemName,
        line.category,
        line.quantity,
        line.unitCost,
        line.totalCost,
        line.storageLocation,
        line.isSerialized ? 1 : 0,
        JSON.stringify(line.serialNumbers)
      );

      const existingStockItem = line.existingStockItem;
      const stockId = existingStockItem?.stockId || getNextStockId();
      const nextTotalQuantity =
        (existingStockItem?.totalQuantity ?? 0) + line.quantity;

      if (!existingStockItem) {
        db.prepare(
          `
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
          `
        ).run(
          stockId,
          line.itemName,
          line.category,
          0,
          0,
          0,
          supplier.name,
          arrivalDate,
          line.storageLocation,
          "Available"
        );
      }

      if (line.isSerialized) {
        const existingSerialAssetCount =
          db
            .prepare(
              `
                SELECT COUNT(*) AS count
                FROM hq_serial_assets
                WHERE stockId = ?
              `
            )
            .get(stockId).count || 0;

        const insertSerialAsset = db.prepare(
          `
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', ?)
          `
        );

        line.serialNumbers.forEach((serialNumber, index) => {
          const assetId = `${stockId}-SER-${String(
            existingSerialAssetCount + index + 1
          ).padStart(3, "0")}`;

          insertSerialAsset.run(
            assetId,
            stockId,
            line.itemName,
            serialNumber,
            supplier.name,
            arrivalDate,
            line.storageLocation,
            null
          );
        });
      }

      const availableSerialCount = getAvailableSerialCountByStockId(stockId);
      const nonSerializedUnits = Math.max(
        nextTotalQuantity - availableSerialCount,
        0
      );
      const nextStatus = nextTotalQuantity <= 5 ? "Low Stock" : "Available";

      db.prepare(
        `
          UPDATE hq_stock_items
          SET
            category = ?,
            totalQuantity = ?,
            serializedUnits = ?,
            nonSerializedUnits = ?,
            supplierName = ?,
            lastArrivalDate = ?,
            storageLocation = ?,
            status = ?
          WHERE stockId = ?
        `
      ).run(
        line.category,
        nextTotalQuantity,
        availableSerialCount,
        nonSerializedUnits,
        supplier.name,
        arrivalDate,
        line.storageLocation,
        nextStatus,
        stockId
      );

      insertStockMovement.run(
        `${createdReceipt.receiptId}-MOVE-${String(line.lineNumber).padStart(3, "0")}`,
        stockId,
        line.itemName,
        line.quantity,
        arrivalDate,
        createdReceipt.receiptId,
        line.serialNumbers.length > 0 ? JSON.stringify(line.serialNumbers) : null,
        `Receipt line ${line.lineNumber}`
      );

      createdReceipt.lines.push({
        lineId,
        receiptId: createdReceipt.receiptId,
        lineNumber: line.lineNumber,
        itemName: line.itemName,
        category: line.category,
        quantity: line.quantity,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
        storageLocation: line.storageLocation,
        isSerialized: line.isSerialized,
        serialNumbers: line.serialNumbers,
      });
    });

    uploadedAttachments.forEach((attachment, index) => {
      const attachmentId = `${createdReceipt.receiptId}-ATT-${String(
        index + 1
      ).padStart(3, "0")}`;
      const uploadedAt = new Date().toISOString();

      insertAttachment.run(
        attachmentId,
        createdReceipt.receiptId,
        attachment.originalName,
        attachment.storedName,
        attachment.storagePath,
        attachment.mimeType,
        attachment.fileSize,
        uploadedAt
      );

      createdReceipt.attachments.push({
        attachmentId,
        receiptId: createdReceipt.receiptId,
        originalName: attachment.originalName,
        storedName: attachment.storedName,
        storagePath: attachment.storagePath,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        uploadedAt,
        downloadUrl: `${getPublicApiBaseUrl()}/operations/attachments/${attachmentId}/download`,
      });
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return createdReceipt;
};
