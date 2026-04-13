const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { DatabaseSync } = require("node:sqlite");

const createTempDatabasePath = () => {
  const tempDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "omari-return-regression-")
  );

  return {
    tempDirectory,
    databasePath: path.join(tempDirectory, "operations.sqlite"),
  };
};

const readStockQuantity = (db, itemName) =>
  db.prepare("SELECT totalQuantity FROM hq_stock_items WHERE itemName = ?").get(
    itemName
  ).totalQuantity;

const readIssueStatus = (db, issueId) =>
  db
    .prepare("SELECT status FROM issue_records WHERE issueId = ?")
    .get(issueId).status;

const readIssueRecord = (db, issueId) =>
  db
    .prepare(
      `
        SELECT
          issueId,
          branchId,
          issuedTo,
          address,
          status
        FROM issue_records
        WHERE issueId = ?
      `
    )
    .get(issueId);

const readSerialAsset = (db, serialNumber) =>
  db
    .prepare(
      `
        SELECT
          status,
          issueId
        FROM hq_serial_assets
        WHERE serialNumber = ?
      `
    )
    .get(serialNumber);

const readReturnMovementCount = (db, issueId) =>
  db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM stock_movements
        WHERE referenceId = ? AND movementType = 'Return'
      `
    )
    .get(issueId).count;

const readLocationBalances = (db, stockId) =>
  db
    .prepare(
      `
        SELECT
          storageLocation,
          totalQuantity,
          serializedUnits,
          nonSerializedUnits
        FROM hq_stock_location_balances
        WHERE stockId = ?
        ORDER BY storageLocation ASC
      `
    )
    .all(stockId)
    .map((row) => ({
      storageLocation: row.storageLocation,
      totalQuantity: row.totalQuantity,
      serializedUnits: row.serializedUnits,
      nonSerializedUnits: row.nonSerializedUnits,
    }));

const readDocumentOverviewCounts = (db) => {
  const receiptRows = db
    .prepare(
      `
        SELECT receiptId, documentStatus
        FROM receiving_receipts
      `
    )
    .all();
  const issueRows = db
    .prepare(
      `
        SELECT
          issueId,
          attachmentNames,
          (
            SELECT COUNT(*)
            FROM attachments
            WHERE entityType = 'issue_record' AND entityId = issue_records.issueId
          ) AS attachmentCount
        FROM issue_records
      `
    )
    .all();

  const issuesMissingDocuments = issueRows.filter((row) => {
    const attachmentNames = row.attachmentNames
      ? JSON.parse(row.attachmentNames)
      : [];

    return row.attachmentCount === 0 && attachmentNames.length === 0;
  }).length;

  const documentsPendingReview = receiptRows.filter(
    (receipt) => receipt.documentStatus === "Pending Review"
  ).length;
  const missingDocumentItems =
    receiptRows.filter((receipt) => receipt.documentStatus === "Missing").length +
    issuesMissingDocuments;

  return {
    documentExceptions: documentsPendingReview + missingDocumentItems,
    documentsPendingReview,
    missingDocumentItems,
  };
};

const insertStockItem = (db, stockItem) => {
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
    stockItem.stockId,
    stockItem.itemName,
    stockItem.category,
    stockItem.totalQuantity,
    stockItem.serializedUnits,
    stockItem.nonSerializedUnits,
    stockItem.supplierName,
    stockItem.lastArrivalDate,
    stockItem.storageLocation,
    stockItem.status
  );
};

const insertIssueRecord = (db, issueRecord) => {
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
    issueRecord.issueId,
    issueRecord.itemName,
    issueRecord.serialNumber,
    issueRecord.destinationType,
    issueRecord.branchId ?? null,
    issueRecord.issuedTo,
    issueRecord.issuedBy,
    issueRecord.address,
    issueRecord.issueDate,
    JSON.stringify(issueRecord.attachmentNames ?? []),
    issueRecord.notes ?? null,
    issueRecord.acknowledgedBy ?? null,
    issueRecord.acknowledgedAt ?? null,
    issueRecord.acknowledgementNotes ?? null,
    null,
    null,
    null,
    issueRecord.status
  );
};

const insertSerialAsset = (db, serialAsset) => {
  db.prepare(
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    serialAsset.assetId,
    serialAsset.stockId,
    serialAsset.itemName,
    serialAsset.serialNumber,
    serialAsset.supplierName,
    serialAsset.lastArrivalDate,
    serialAsset.storageLocation,
    serialAsset.status,
    serialAsset.issueId ?? null
  );
};

const insertLocationBalance = (db, locationBalance) => {
  db.prepare(
    `
      INSERT INTO hq_stock_location_balances (
        balanceId,
        stockId,
        storageLocation,
        totalQuantity,
        serializedUnits,
        nonSerializedUnits,
        lastMovementDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    locationBalance.balanceId,
    locationBalance.stockId,
    locationBalance.storageLocation,
    locationBalance.totalQuantity,
    locationBalance.serializedUnits,
    locationBalance.nonSerializedUnits,
    locationBalance.lastMovementDate
  );
};

const seedReturnScenarios = (db) => {
  insertStockItem(db, {
    stockId: "STK-001",
    itemName: "Lenovo ThinkPad E14",
    category: "Laptop",
    totalQuantity: 1,
    serializedUnits: 1,
    nonSerializedUnits: 0,
    supplierName: "Zim Office Tech",
    lastArrivalDate: "2026-04-03",
    storageLocation: "HQ Cage A1",
    status: "Low Stock",
  });
  insertStockItem(db, {
    stockId: "STK-002",
    itemName: "MikroTik Router RB4011",
    category: "Network",
    totalQuantity: 1,
    serializedUnits: 1,
    nonSerializedUnits: 0,
    supplierName: "SecureNet Distribution",
    lastArrivalDate: "2026-03-28",
    storageLocation: "HQ Cage B2",
    status: "Low Stock",
  });
  insertStockItem(db, {
    stockId: "STK-003",
    itemName: "Branch Issue Test Device",
    category: "Laptop",
    totalQuantity: 1,
    serializedUnits: 1,
    nonSerializedUnits: 0,
    supplierName: "Zim Office Tech",
    lastArrivalDate: "2026-04-07",
    storageLocation: "HQ Cage C1",
    status: "Low Stock",
  });

  insertIssueRecord(db, {
    issueId: "ISS-001",
    itemName: "Lenovo ThinkPad E14",
    serialNumber: "LNV-E14-TEST-002",
    destinationType: "Person",
    issuedTo: "Regression User",
    issuedBy: "Stores Officer",
    address: "OMDS HQ",
    issueDate: "2026-04-05",
    attachmentNames: [],
    status: "Issued",
  });
  insertIssueRecord(db, {
    issueId: "ISS-002",
    itemName: "MikroTik Router RB4011",
    serialNumber: "MKT-RB4011-TEST-002",
    destinationType: "Branch",
    branchId: "BR-002",
    issuedTo: "Bulawayo Branch",
    issuedBy: "Stores Officer",
    address: "12 Jason Moyo Road, Bulawayo",
    issueDate: "2026-04-06",
    attachmentNames: [],
    status: "Issued",
  });

  insertSerialAsset(db, {
    assetId: "STK-001-SER-001",
    stockId: "STK-001",
    itemName: "Lenovo ThinkPad E14",
    serialNumber: "LNV-E14-TEST-001",
    supplierName: "Zim Office Tech",
    lastArrivalDate: "2026-04-03",
    storageLocation: "HQ Cage A1",
    status: "Available",
  });
  insertSerialAsset(db, {
    assetId: "STK-001-SER-002",
    stockId: "STK-001",
    itemName: "Lenovo ThinkPad E14",
    serialNumber: "LNV-E14-TEST-002",
    supplierName: "Zim Office Tech",
    lastArrivalDate: "2026-04-03",
    storageLocation: "HQ Cage A1",
    status: "Issued",
    issueId: "ISS-001",
  });
  insertSerialAsset(db, {
    assetId: "STK-002-SER-001",
    stockId: "STK-002",
    itemName: "MikroTik Router RB4011",
    serialNumber: "MKT-RB4011-TEST-001",
    supplierName: "SecureNet Distribution",
    lastArrivalDate: "2026-03-28",
    storageLocation: "HQ Cage B2",
    status: "Available",
  });
  insertSerialAsset(db, {
    assetId: "STK-002-SER-002",
    stockId: "STK-002",
    itemName: "MikroTik Router RB4011",
    serialNumber: "MKT-RB4011-TEST-002",
    supplierName: "SecureNet Distribution",
    lastArrivalDate: "2026-03-28",
    storageLocation: "HQ Cage B2",
    status: "Issued",
    issueId: "ISS-002",
  });
  insertSerialAsset(db, {
    assetId: "STK-003-SER-001",
    stockId: "STK-003",
    itemName: "Branch Issue Test Device",
    serialNumber: "BRANCH-ID-TEST-001",
    supplierName: "Zim Office Tech",
    lastArrivalDate: "2026-04-07",
    storageLocation: "HQ Cage C1",
    status: "Available",
  });

  insertLocationBalance(db, {
    balanceId: "STK-001-LOC-001",
    stockId: "STK-001",
    storageLocation: "HQ Cage A1",
    totalQuantity: 1,
    serializedUnits: 1,
    nonSerializedUnits: 0,
    lastMovementDate: "2026-04-03",
  });
  insertLocationBalance(db, {
    balanceId: "STK-002-LOC-001",
    stockId: "STK-002",
    storageLocation: "HQ Cage B2",
    totalQuantity: 1,
    serializedUnits: 1,
    nonSerializedUnits: 0,
    lastMovementDate: "2026-03-28",
  });
  insertLocationBalance(db, {
    balanceId: "STK-003-LOC-001",
    stockId: "STK-003",
    storageLocation: "HQ Cage C1",
    totalQuantity: 1,
    serializedUnits: 1,
    nonSerializedUnits: 0,
    lastMovementDate: "2026-04-07",
  });
};

const main = () => {
  const { tempDirectory, databasePath } = createTempDatabasePath();
  let db;

  process.env.OPERATIONS_DB_PATH = databasePath;

  try {
    const {
      acknowledgeIssueRecordData,
      createIssueRecordData,
      getHqStockData,
      getHqStockDetailData,
      getOperationsOverviewData,
      returnIssueRecordData,
    } = require("../dist/lib/operationsData.js");
    const {
      createReceivingReceiptData,
    } = require("../dist/lib/receivingData.js");
    db = new DatabaseSync(databasePath);
    seedReturnScenarios(db);

    const issuedAssets = [
      { issueId: "ISS-001", serialNumber: "LNV-E14-TEST-002" },
      { issueId: "ISS-002", serialNumber: "MKT-RB4011-TEST-002" },
    ];

    issuedAssets.forEach(({ issueId, serialNumber }) => {
      const serialAsset = readSerialAsset(db, serialNumber);

      assert.ok(serialAsset, `Expected test serial asset ${serialNumber} to exist`);
      assert.equal(serialAsset.status, "Issued");
      assert.equal(serialAsset.issueId, issueId);
    });

    assert.equal(readStockQuantity(db, "Lenovo ThinkPad E14"), 1);
    assert.equal(readStockQuantity(db, "MikroTik Router RB4011"), 1);

    const lenovoQuantityBefore = readStockQuantity(db, "Lenovo ThinkPad E14");

    const returnedIssue = returnIssueRecordData("ISS-001", {
      returnedBy: "Regression Test",
      returnNotes: "Validated atomic return flow",
    });

    assert.ok(returnedIssue, "Expected a returned issue record");
    assert.equal(returnedIssue.status, "Returned");
    assert.equal(readIssueStatus(db, "ISS-001"), "Returned");
    assert.equal(
      readStockQuantity(db, "Lenovo ThinkPad E14"),
      lenovoQuantityBefore + 1
    );
    assert.equal(readReturnMovementCount(db, "ISS-001"), 1);
    assert.deepEqual(readLocationBalances(db, "STK-001"), [
      {
        storageLocation: "HQ Cage A1",
        totalQuantity: 2,
        serializedUnits: 2,
        nonSerializedUnits: 0,
      },
    ]);

    const lenovoSerialAsset = readSerialAsset(db, "LNV-E14-TEST-002");
    assert.ok(lenovoSerialAsset);
    assert.equal(lenovoSerialAsset.status, "Available");
    assert.equal(lenovoSerialAsset.issueId, null);

    const routerQuantityBefore = readStockQuantity(db, "MikroTik Router RB4011");
    const routerIssueStatusBefore = readIssueStatus(db, "ISS-002");

    db.prepare(
      `
        UPDATE hq_serial_assets
        SET issueId = ?
        WHERE serialNumber = ?
      `
    ).run("ISS-999", "MKT-RB4011-TEST-002");

    let returnErrorMessage = "";

    try {
      returnIssueRecordData("ISS-002", {
        returnedBy: "Regression Test",
        returnNotes: "This should fail without mutating state",
      });
    } catch (error) {
      if (error instanceof Error) {
        returnErrorMessage = error.message;
      }
    }

    assert.equal(
      returnErrorMessage,
      "Serial asset is linked to a different issue"
    );
    assert.equal(readIssueStatus(db, "ISS-002"), routerIssueStatusBefore);
    assert.equal(
      readStockQuantity(db, "MikroTik Router RB4011"),
      routerQuantityBefore
    );
    assert.equal(readReturnMovementCount(db, "ISS-002"), 0);

    const corruptedRouterSerialAsset = readSerialAsset(
      db,
      "MKT-RB4011-TEST-002"
    );
    assert.ok(corruptedRouterSerialAsset);
    assert.equal(corruptedRouterSerialAsset.status, "Issued");
    assert.equal(corruptedRouterSerialAsset.issueId, "ISS-999");

    const createdBranchIssue = createIssueRecordData({
      itemName: "Branch Issue Test Device",
      serialNumber: "BRANCH-ID-TEST-001",
      destinationType: "Branch",
      branchId: "BR-002",
      issuedTo: "",
      issuedBy: "Regression Test",
      address: "",
      issueDate: "2026-04-07",
      attachmentNames: [],
      notes: "Validate branchId-driven issue resolution",
    });

    assert.equal(createdBranchIssue.branchId, "BR-002");
    assert.equal(createdBranchIssue.issuedTo, "Bulawayo Branch");
    assert.equal(createdBranchIssue.address, "12 Jason Moyo Road, Bulawayo");

    const persistedBranchIssue = readIssueRecord(db, createdBranchIssue.issueId);
    assert.ok(persistedBranchIssue);
    assert.equal(persistedBranchIssue.branchId, "BR-002");
    assert.equal(persistedBranchIssue.issuedTo, "Bulawayo Branch");
    assert.equal(
      persistedBranchIssue.address,
      "12 Jason Moyo Road, Bulawayo"
    );
    assert.equal(persistedBranchIssue.status, "Issued");
    assert.deepEqual(readLocationBalances(db, "STK-003"), []);

    createReceivingReceiptData({
      receiptType: "Single Item",
      supplierId: "SUP-001",
      arrivalDate: "2026-04-08",
      signedBy: "Regression Test",
      receivedBy: "Stores Officer",
      documentStatus: "Pending Review",
      lines: [
        {
          itemName: "Multi Location Test Device",
          category: "Laptop",
          quantity: 2,
          unitCost: 1200,
          storageLocation: "HQ Cage A1",
          isSerialized: false,
        },
      ],
    });
    createReceivingReceiptData({
      receiptType: "Single Item",
      supplierId: "SUP-001",
      arrivalDate: "2026-04-09",
      signedBy: "Regression Test",
      receivedBy: "Stores Officer",
      documentStatus: "Pending Review",
      lines: [
        {
          itemName: "Multi Location Test Device",
          category: "Laptop",
          quantity: 3,
          unitCost: 1200,
          storageLocation: "HQ Cage B2",
          isSerialized: false,
        },
      ],
    });
    createReceivingReceiptData(
      {
        receiptType: "Single Item",
        supplierId: "SUP-001",
        arrivalDate: "2026-04-10",
        signedBy: "Regression Test",
        receivedBy: "Stores Officer",
        documentStatus: "Missing",
        lines: [
          {
            itemName: "Pending Review Overview Device",
            category: "Laptop",
            quantity: 1,
            unitCost: 900,
            storageLocation: "HQ Cage D3",
            isSerialized: false,
          },
        ],
      },
      [
        {
          originalName: "pending-review-pack.pdf",
          storedName: "pending-review-pack.pdf",
          storagePath: "data/uploads/receipts/pending-review-pack.pdf",
          mimeType: "application/pdf",
          fileSize: 1024,
        },
      ]
    );
    createReceivingReceiptData({
      receiptType: "Single Item",
      supplierId: "SUP-001",
      arrivalDate: "2026-04-11",
      signedBy: "Regression Test",
      receivedBy: "Stores Officer",
      documentStatus: "Missing",
      lines: [
        {
          itemName: "Missing Overview Device",
          category: "Laptop",
          quantity: 1,
          unitCost: 950,
          storageLocation: "HQ Cage D4",
          isSerialized: false,
        },
      ],
    });

    const multiLocationStock = getHqStockData().find(
      (stockItem) => stockItem.itemName === "Multi Location Test Device"
    );

    assert.ok(multiLocationStock);
    assert.equal(multiLocationStock.storageLocation, "Multiple (2)");
    assert.equal(multiLocationStock.locationCount, 2);
    assert.deepEqual(multiLocationStock.storageLocations, [
      "HQ Cage B2",
      "HQ Cage A1",
    ]);

    const multiLocationDetail = getHqStockDetailData(multiLocationStock.stockId);
    assert.ok(multiLocationDetail);
    assert.deepEqual(
      multiLocationDetail.locationBalances.map((balance) => ({
        storageLocation: balance.storageLocation,
        totalQuantity: balance.totalQuantity,
      })),
      [
        { storageLocation: "HQ Cage B2", totalQuantity: 3 },
        { storageLocation: "HQ Cage A1", totalQuantity: 2 },
      ]
    );

    assert.throws(
      () =>
        createIssueRecordData({
          destinationType: "Person",
        }),
      /Missing required issue-out fields/
    );

    assert.throws(
      () =>
        acknowledgeIssueRecordData("ISS-002", {
          acknowledgedAt: "2026-04-13",
        }),
      /Missing acknowledgement fields/
    );

    assert.throws(
      () =>
        returnIssueRecordData("ISS-002", {
          returnedAt: "2026-04-13",
        }),
      /Missing return fields/
    );

    const overview = getOperationsOverviewData();
    const expectedDocumentCounts = readDocumentOverviewCounts(db);

    assert.equal(
      overview.documentExceptions,
      expectedDocumentCounts.documentExceptions
    );
    assert.equal(
      overview.documentsPendingReview,
      expectedDocumentCounts.documentsPendingReview
    );
    assert.equal(
      overview.missingDocumentItems,
      expectedDocumentCounts.missingDocumentItems
    );
    assert.equal(overview.documentQueueTotal, expectedDocumentCounts.documentExceptions);
    assert.equal(
      overview.documentQueue.length,
      Math.min(expectedDocumentCounts.documentExceptions, 6)
    );
    assert.ok(
      overview.documentQueue.some((entry) => entry.entityType === "Issue"),
      "Expected document queue preview to include issue records without attachments"
    );

    console.log("Operations regression checks passed.");
  } finally {
    delete process.env.OPERATIONS_DB_PATH;

    if (db && typeof db.close === "function") {
      db.close();
    }

    try {
      fs.rmSync(tempDirectory, { recursive: true, force: true });
    } catch {
      // Cleanup is best-effort because the imported module releases its DB handle on process exit.
    }
  }
};

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
