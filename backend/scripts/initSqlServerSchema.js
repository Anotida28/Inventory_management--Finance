const sql = require("mssql");

const parseBoolean = (value, fallback) => {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.toLowerCase() === "true";
};

const isIpv4Address = (value) => /^\d{1,3}(\.\d{1,3}){3}$/.test(value || "");

const parseSqlServerUrl = (rawUrl) => {
  if (!rawUrl || !rawUrl.toLowerCase().startsWith("sqlserver://")) {
    throw new Error("DATABASE_URL must start with sqlserver://");
  }

  const withoutScheme = rawUrl.slice("sqlserver://".length).trim();
  const firstSemicolon = withoutScheme.indexOf(";");
  const hostPort = firstSemicolon >= 0 ? withoutScheme.slice(0, firstSemicolon) : withoutScheme;
  const paramText = firstSemicolon >= 0 ? withoutScheme.slice(firstSemicolon + 1) : "";

  const [server, portText] = hostPort.split(":");
  const params = {};

  paramText
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const equalsIndex = entry.indexOf("=");

      if (equalsIndex < 0) {
        return;
      }

      const key = entry.slice(0, equalsIndex).trim().toLowerCase();
      const value = entry.slice(equalsIndex + 1).trim();
      params[key] = value;
    });

  return {
    server,
    port: portText ? Number(portText) : 1433,
    database: params.database,
    user: params.user,
    password: params.password,
    encrypt: parseBoolean(params.encrypt, true),
    trustServerCertificate: parseBoolean(params.trustservercertificate, false),
  };
};

const schemaSql = `
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'omds')
BEGIN
  EXEC('CREATE SCHEMA omds')
END

IF OBJECT_ID('omds.auth_users', 'U') IS NULL
BEGIN
  CREATE TABLE omds.auth_users (
    userId NVARCHAR(64) NOT NULL PRIMARY KEY,
    username NVARCHAR(64) NOT NULL UNIQUE,
    name NVARCHAR(255) NOT NULL,
    email NVARCHAR(255) NOT NULL UNIQUE,
    passwordHash NVARCHAR(255) NOT NULL,
    role NVARCHAR(32) NOT NULL,
    status NVARCHAR(32) NOT NULL DEFAULT 'Active',
    createdAt NVARCHAR(32) NOT NULL,
    updatedAt NVARCHAR(32) NOT NULL,
    lastLogin NVARCHAR(32) NULL
  )
END

IF OBJECT_ID('omds.suppliers', 'U') IS NULL
BEGIN
  CREATE TABLE omds.suppliers (
    supplierId NVARCHAR(64) NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    contactPerson NVARCHAR(255) NOT NULL,
    phone NVARCHAR(64) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    categoryFocus NVARCHAR(255) NOT NULL,
    lastDeliveryDate NVARCHAR(32) NOT NULL,
    activeContracts INT NOT NULL
  )
END

IF OBJECT_ID('omds.branches', 'U') IS NULL
BEGIN
  CREATE TABLE omds.branches (
    branchId NVARCHAR(64) NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL UNIQUE,
    code NVARCHAR(64) NOT NULL UNIQUE,
    address NVARCHAR(255) NOT NULL,
    region NVARCHAR(128) NOT NULL,
    contactPerson NVARCHAR(255) NOT NULL,
    phone NVARCHAR(64) NOT NULL,
    status NVARCHAR(32) NOT NULL
  )
END

IF OBJECT_ID('omds.receiving_receipts', 'U') IS NULL
BEGIN
  CREATE TABLE omds.receiving_receipts (
    receiptId NVARCHAR(64) NOT NULL PRIMARY KEY,
    receiptType NVARCHAR(32) NOT NULL,
    supplierId NVARCHAR(64) NOT NULL,
    supplierName NVARCHAR(255) NOT NULL,
    arrivalDate NVARCHAR(32) NOT NULL,
    signedBy NVARCHAR(255) NOT NULL,
    receivedBy NVARCHAR(255) NOT NULL,
    itemCount INT NOT NULL,
    totalQuantity INT NOT NULL,
    totalAmount FLOAT NOT NULL,
    documentCount INT NOT NULL,
    documentStatus NVARCHAR(32) NOT NULL,
    status NVARCHAR(32) NOT NULL
  )
END

IF OBJECT_ID('omds.receiving_receipt_lines', 'U') IS NULL
BEGIN
  CREATE TABLE omds.receiving_receipt_lines (
    lineId NVARCHAR(96) NOT NULL PRIMARY KEY,
    receiptId NVARCHAR(64) NOT NULL,
    lineNumber INT NOT NULL,
    itemName NVARCHAR(255) NOT NULL,
    category NVARCHAR(128) NOT NULL,
    quantity INT NOT NULL,
    unitCost FLOAT NOT NULL,
    totalCost FLOAT NOT NULL,
    storageLocation NVARCHAR(255) NOT NULL,
    isSerialized BIT NOT NULL DEFAULT 0,
    serialNumbers NVARCHAR(MAX) NOT NULL
  )
END

IF OBJECT_ID('omds.hq_stock_items', 'U') IS NULL
BEGIN
  CREATE TABLE omds.hq_stock_items (
    stockId NVARCHAR(64) NOT NULL PRIMARY KEY,
    itemName NVARCHAR(255) NOT NULL UNIQUE,
    category NVARCHAR(128) NOT NULL,
    totalQuantity INT NOT NULL,
    serializedUnits INT NOT NULL,
    nonSerializedUnits INT NOT NULL,
    supplierName NVARCHAR(255) NOT NULL,
    lastArrivalDate NVARCHAR(32) NOT NULL,
    storageLocation NVARCHAR(255) NOT NULL,
    status NVARCHAR(32) NOT NULL
  )
END

IF OBJECT_ID('omds.issue_records', 'U') IS NULL
BEGIN
  CREATE TABLE omds.issue_records (
    issueId NVARCHAR(64) NOT NULL PRIMARY KEY,
    itemName NVARCHAR(255) NOT NULL,
    serialNumber NVARCHAR(255) NOT NULL,
    destinationType NVARCHAR(32) NOT NULL,
    branchId NVARCHAR(64) NULL,
    issuedTo NVARCHAR(255) NOT NULL,
    issuedBy NVARCHAR(255) NOT NULL,
    address NVARCHAR(255) NOT NULL,
    issueDate NVARCHAR(32) NOT NULL,
    attachmentNames NVARCHAR(MAX) NOT NULL,
    notes NVARCHAR(MAX) NULL,
    acknowledgedBy NVARCHAR(255) NULL,
    acknowledgedAt NVARCHAR(32) NULL,
    acknowledgementNotes NVARCHAR(MAX) NULL,
    returnedBy NVARCHAR(255) NULL,
    returnedAt NVARCHAR(32) NULL,
    returnNotes NVARCHAR(MAX) NULL,
    status NVARCHAR(32) NOT NULL
  )
END

IF OBJECT_ID('omds.attachments', 'U') IS NULL
BEGIN
  CREATE TABLE omds.attachments (
    attachmentId NVARCHAR(96) NOT NULL PRIMARY KEY,
    entityType NVARCHAR(64) NOT NULL,
    entityId NVARCHAR(64) NOT NULL,
    originalName NVARCHAR(255) NOT NULL,
    storedName NVARCHAR(255) NOT NULL,
    storagePath NVARCHAR(512) NOT NULL,
    mimeType NVARCHAR(128) NOT NULL,
    fileSize INT NOT NULL,
    uploadedAt NVARCHAR(32) NOT NULL
  )
END

IF OBJECT_ID('omds.hq_serial_assets', 'U') IS NULL
BEGIN
  CREATE TABLE omds.hq_serial_assets (
    assetId NVARCHAR(64) NOT NULL PRIMARY KEY,
    stockId NVARCHAR(64) NOT NULL,
    itemName NVARCHAR(255) NOT NULL,
    serialNumber NVARCHAR(255) NOT NULL UNIQUE,
    supplierName NVARCHAR(255) NOT NULL,
    lastArrivalDate NVARCHAR(32) NOT NULL,
    storageLocation NVARCHAR(255) NOT NULL,
    status NVARCHAR(32) NOT NULL,
    issueId NVARCHAR(64) NULL
  )
END

IF OBJECT_ID('omds.stock_movements', 'U') IS NULL
BEGIN
  CREATE TABLE omds.stock_movements (
    movementId NVARCHAR(96) NOT NULL PRIMARY KEY,
    movementType NVARCHAR(64) NOT NULL,
    stockId NVARCHAR(64) NOT NULL,
    itemName NVARCHAR(255) NOT NULL,
    quantityDelta INT NOT NULL,
    movementDate NVARCHAR(32) NOT NULL,
    referenceType NVARCHAR(64) NOT NULL,
    referenceId NVARCHAR(64) NOT NULL,
    storageLocation NVARCHAR(255) NULL,
    serialNumbers NVARCHAR(MAX) NULL,
    notes NVARCHAR(MAX) NULL
  )
END

IF OBJECT_ID('omds.stock_locations', 'U') IS NULL
BEGIN
  CREATE TABLE omds.stock_locations (
    locationId NVARCHAR(64) NOT NULL PRIMARY KEY,
    locationName NVARCHAR(255) NOT NULL UNIQUE
  )
END

IF OBJECT_ID('omds.hq_stock_location_balances', 'U') IS NULL
BEGIN
  CREATE TABLE omds.hq_stock_location_balances (
    balanceId NVARCHAR(64) NOT NULL PRIMARY KEY,
    stockId NVARCHAR(64) NOT NULL,
    storageLocation NVARCHAR(255) NOT NULL,
    totalQuantity INT NOT NULL,
    serializedUnits INT NOT NULL DEFAULT 0,
    nonSerializedUnits INT NOT NULL DEFAULT 0,
    lastMovementDate NVARCHAR(32) NOT NULL
  )
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_auth_users_username' AND object_id = OBJECT_ID('omds.auth_users'))
  CREATE INDEX idx_auth_users_username ON omds.auth_users (username)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_auth_users_email' AND object_id = OBJECT_ID('omds.auth_users'))
  CREATE INDEX idx_auth_users_email ON omds.auth_users (email)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_receiving_receipt_lines_receipt' AND object_id = OBJECT_ID('omds.receiving_receipt_lines'))
  CREATE INDEX idx_receiving_receipt_lines_receipt ON omds.receiving_receipt_lines (receiptId, lineNumber)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_attachments_entity' AND object_id = OBJECT_ID('omds.attachments'))
  CREATE INDEX idx_attachments_entity ON omds.attachments (entityType, entityId)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_stock_movements_reference' AND object_id = OBJECT_ID('omds.stock_movements'))
  CREATE INDEX idx_stock_movements_reference ON omds.stock_movements (referenceType, referenceId)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_stock_movements_stock_date' AND object_id = OBJECT_ID('omds.stock_movements'))
  CREATE INDEX idx_stock_movements_stock_date ON omds.stock_movements (stockId, movementDate)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_hq_serial_assets_item_status' AND object_id = OBJECT_ID('omds.hq_serial_assets'))
  CREATE INDEX idx_hq_serial_assets_item_status ON omds.hq_serial_assets (itemName, status)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_issue_records_status' AND object_id = OBJECT_ID('omds.issue_records'))
  CREATE INDEX idx_issue_records_status ON omds.issue_records (status, issueDate)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_issue_records_branch' AND object_id = OBJECT_ID('omds.issue_records'))
  CREATE INDEX idx_issue_records_branch ON omds.issue_records (branchId, destinationType)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_hq_stock_location_balances_unique' AND object_id = OBJECT_ID('omds.hq_stock_location_balances'))
  CREATE UNIQUE INDEX idx_hq_stock_location_balances_unique ON omds.hq_stock_location_balances (stockId, storageLocation)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_hq_stock_location_balances_stock' AND object_id = OBJECT_ID('omds.hq_stock_location_balances'))
  CREATE INDEX idx_hq_stock_location_balances_stock ON omds.hq_stock_location_balances (stockId, totalQuantity, storageLocation)
`;

const main = async () => {
  const rawUrl = process.env.DATABASE_URL;
  const config = parseSqlServerUrl(rawUrl);

  if (!config.server || !config.database || !config.user) {
    throw new Error(
      "DATABASE_URL is missing required sqlserver settings (server, database, user)."
    );
  }

  const encryptForConnection =
    config.encrypt && !(config.trustServerCertificate && isIpv4Address(config.server));

  if (config.encrypt && !encryptForConnection) {
    console.log(
      "TLS encryption was disabled for this run because SQL Server was provided as an IP address with trustServerCertificate=true."
    );
  }

  const pool = await sql.connect({
    server: config.server,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    options: {
      encrypt: encryptForConnection,
      trustServerCertificate: config.trustServerCertificate,
    },
  });

  await pool.request().batch(schemaSql);

  const tableRows = await pool
    .request()
    .query(
      "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='omds' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME"
    );

  console.log(
    `SQL Server schema initialized successfully. omds tables: ${tableRows.recordset.length}`
  );
  tableRows.recordset.forEach((row) => {
    console.log(`- ${row.TABLE_SCHEMA}.${row.TABLE_NAME}`);
  });

  await pool.close();
};

main().catch((error) => {
  console.error("Failed to initialize SQL Server schema:", error.message);
  process.exitCode = 1;
});
