const assert = require("node:assert/strict");

const { createMysqlTestHarness } = require("./mysqlTestHarness");

const buildReceiptPayload = (itemName, overrides = {}) => ({
  receiptType: "Single Item",
  supplierId: "SUP-001",
  arrivalDate: "2026-04-13",
  signedBy: "Document Signer",
  receivedBy: "HQ Receiver",
  lines: [
    {
      itemName,
      category: "Stationery",
      quantity: 1,
      unitCost: 12,
      storageLocation: "HQ Rack D1",
      isSerialized: false,
      serialNumbers: [],
    },
  ],
  ...overrides,
});

const buildAttachment = (fileName) => ({
  originalName: fileName,
  storedName: `${Date.now()}-${fileName}`,
  storagePath: `data/uploads/receipts/${fileName}`,
  mimeType: "application/pdf",
  fileSize: 1024,
});

const readStockItemsByName = (db, itemName) =>
  db
    .prepare(
      `
        SELECT
          stockId,
          itemName,
          totalQuantity,
          serializedUnits,
          nonSerializedUnits
        FROM hq_stock_items
        WHERE itemName = ?
      `
    )
    .all(itemName);

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

const readSerialAssetsByStockId = (db, stockId) =>
  db
    .prepare(
      `
        SELECT
          assetId,
          serialNumber,
          storageLocation,
          status
        FROM hq_serial_assets
        WHERE stockId = ?
        ORDER BY assetId ASC
      `
    )
    .all(stockId);

const main = async () => {
  const harness = await createMysqlTestHarness("omari_receipt_workflow_regression");

  try {
    require("../dist/lib/operationsData.js");
    const {
      appendReceivingReceiptAttachmentsData,
      createReceivingReceiptData,
      getReceivingReceiptByIdData,
      verifyReceivingReceiptData,
    } = require("../dist/lib/receivingData.js");

    const db = harness.db;

    assert.throws(
      () =>
        createReceivingReceiptData(
          buildReceiptPayload("Blocked Complete Receipt", {
            documentStatus: "Complete",
          }),
          []
        ),
      /Receipts cannot be created as complete/
    );

    const loggedReceipt = createReceivingReceiptData(
      buildReceiptPayload("Missing Documents Receipt"),
      []
    );
    assert.equal(loggedReceipt.documentCount, 0);
    assert.equal(loggedReceipt.documentStatus, "Missing");
    assert.equal(loggedReceipt.status, "Logged");

    const pendingReceipt = createReceivingReceiptData(
      buildReceiptPayload("Pending Review Receipt", {
        documentStatus: "Missing",
      }),
      [buildAttachment("invoice-pack.pdf")]
    );
    assert.equal(pendingReceipt.documentCount, 1);
    assert.equal(pendingReceipt.documentStatus, "Pending Review");
    assert.equal(pendingReceipt.status, "Pending Review");

    assert.throws(
      () => verifyReceivingReceiptData(loggedReceipt.receiptId),
      /Receipt has no attachments to verify/
    );

    const updatedLoggedReceipt = appendReceivingReceiptAttachmentsData(
      loggedReceipt.receiptId,
      [buildAttachment("delivery-note.pdf")]
    );
    assert.equal(updatedLoggedReceipt.documentCount, 1);
    assert.equal(updatedLoggedReceipt.documentStatus, "Pending Review");
    assert.equal(updatedLoggedReceipt.status, "Pending Review");

    const verifiedReceipt = verifyReceivingReceiptData(loggedReceipt.receiptId);
    assert.equal(verifiedReceipt.documentCount, 1);
    assert.equal(verifiedReceipt.documentStatus, "Complete");
    assert.equal(verifiedReceipt.status, "Verified");

    const reopenedReceipt = appendReceivingReceiptAttachmentsData(
      verifiedReceipt.receiptId,
      [buildAttachment("revised-pack.pdf")]
    );
    assert.equal(reopenedReceipt.documentCount, 2);
    assert.equal(reopenedReceipt.documentStatus, "Pending Review");
    assert.equal(reopenedReceipt.status, "Pending Review");

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
      "RCV-2026-999",
      "Single Item",
      "SUP-001",
      "Zim Office Tech",
      "2026-04-13",
      "Legacy Signer",
      "Legacy Receiver",
      1,
      1,
      12,
      0,
      "Complete",
      "Verified"
    );

    const repairedLegacyReceipt = getReceivingReceiptByIdData("RCV-2026-999");
    assert.ok(repairedLegacyReceipt);
    assert.equal(repairedLegacyReceipt.documentCount, 0);
    assert.equal(repairedLegacyReceipt.documentStatus, "Missing");
    assert.equal(repairedLegacyReceipt.status, "Logged");

    const storedLegacyReceipt = db
      .prepare(
        `
          SELECT
            documentCount,
            documentStatus,
            status
          FROM receiving_receipts
          WHERE receiptId = ?
        `
      )
      .get("RCV-2026-999");
    assert.equal(storedLegacyReceipt.documentCount, 0);
    assert.equal(storedLegacyReceipt.documentStatus, "Missing");
    assert.equal(storedLegacyReceipt.status, "Logged");

    const splitLocationReceipt = createReceivingReceiptData({
      receiptType: "Batch",
      supplierId: "SUP-001",
      arrivalDate: "2026-04-14",
      signedBy: "Document Signer",
      receivedBy: "HQ Receiver",
      lines: [
        {
          itemName: "Split Cost Device",
          category: "Laptop",
          quantity: 2,
          unitCost: 1000,
          storageLocation: "HQ Cage A1",
          isSerialized: false,
        },
        {
          itemName: "Split Cost Device",
          category: "Laptop",
          quantity: 3,
          unitCost: 1100,
          storageLocation: "HQ Cage B2",
          isSerialized: false,
        },
      ],
    });

    assert.equal(splitLocationReceipt.itemCount, 1);
    assert.equal(splitLocationReceipt.lines.length, 2);
    assert.equal(splitLocationReceipt.totalQuantity, 5);
    assert.equal(splitLocationReceipt.totalAmount, 5300);

    const splitCostStockRows = readStockItemsByName(db, "Split Cost Device");
    assert.equal(splitCostStockRows.length, 1);
    assert.equal(splitCostStockRows[0].totalQuantity, 5);
    assert.equal(splitCostStockRows[0].serializedUnits, 0);
    assert.equal(splitCostStockRows[0].nonSerializedUnits, 5);
    assert.deepEqual(readLocationBalances(db, splitCostStockRows[0].stockId), [
      {
        storageLocation: "HQ Cage A1",
        totalQuantity: 2,
        serializedUnits: 0,
        nonSerializedUnits: 2,
      },
      {
        storageLocation: "HQ Cage B2",
        totalQuantity: 3,
        serializedUnits: 0,
        nonSerializedUnits: 3,
      },
    ]);

    const splitSerializedReceipt = createReceivingReceiptData({
      receiptType: "Batch",
      supplierId: "SUP-001",
      arrivalDate: "2026-04-15",
      signedBy: "Document Signer",
      receivedBy: "HQ Receiver",
      lines: [
        {
          itemName: "Split Serialized Device",
          category: "Laptop",
          quantity: 1,
          unitCost: 1400,
          storageLocation: "HQ Cage A2",
          isSerialized: true,
          serialNumbers: ["SPLIT-SER-001"],
        },
        {
          itemName: "Split Serialized Device",
          category: "Laptop",
          quantity: 2,
          unitCost: 1400,
          storageLocation: "HQ Rack D1",
          isSerialized: true,
          serialNumbers: ["SPLIT-SER-002", "SPLIT-SER-003"],
        },
      ],
    });

    assert.equal(splitSerializedReceipt.itemCount, 1);
    assert.equal(splitSerializedReceipt.lines.length, 2);
    assert.equal(splitSerializedReceipt.totalQuantity, 3);

    const splitSerializedStockRows = readStockItemsByName(
      db,
      "Split Serialized Device"
    );
    assert.equal(splitSerializedStockRows.length, 1);
    assert.equal(splitSerializedStockRows[0].totalQuantity, 3);
    assert.equal(splitSerializedStockRows[0].serializedUnits, 3);
    assert.equal(splitSerializedStockRows[0].nonSerializedUnits, 0);
    assert.deepEqual(
      readLocationBalances(db, splitSerializedStockRows[0].stockId),
      [
        {
          storageLocation: "HQ Cage A2",
          totalQuantity: 1,
          serializedUnits: 1,
          nonSerializedUnits: 0,
        },
        {
          storageLocation: "HQ Rack D1",
          totalQuantity: 2,
          serializedUnits: 2,
          nonSerializedUnits: 0,
        },
      ]
    );

    const splitSerializedAssets = readSerialAssetsByStockId(
      db,
      splitSerializedStockRows[0].stockId
    );
    assert.equal(splitSerializedAssets.length, 3);
    assert.equal(
      new Set(splitSerializedAssets.map((asset) => asset.assetId)).size,
      3
    );
    assert.deepEqual(
      splitSerializedAssets.map((asset) => asset.serialNumber),
      ["SPLIT-SER-001", "SPLIT-SER-002", "SPLIT-SER-003"]
    );

    assert.throws(
      () =>
        createReceivingReceiptData({
          receiptType: "Batch",
          supplierId: "SUP-001",
          arrivalDate: "2026-04-16",
          signedBy: "Document Signer",
          receivedBy: "HQ Receiver",
          lines: [
            {
              itemName: "Conflicting Category Device",
              category: "Laptop",
              quantity: 1,
              unitCost: 1200,
              storageLocation: "HQ Cage A1",
              isSerialized: false,
            },
            {
              itemName: "Conflicting Category Device",
              category: "Accessory",
              quantity: 1,
              unitCost: 1200,
              storageLocation: "HQ Cage B2",
              isSerialized: false,
            },
          ],
        }),
      /Receipt line 2 must use the same category as line 1/
    );

    assert.throws(
      () =>
        createReceivingReceiptData({
          receiptType: "Batch",
          supplierId: "SUP-001",
          arrivalDate: "2026-04-16",
          signedBy: "Document Signer",
          receivedBy: "HQ Receiver",
          lines: [
            {
              itemName: "Conflicting Serialized Device",
              category: "Laptop",
              quantity: 1,
              unitCost: 1200,
              storageLocation: "HQ Cage A1",
              isSerialized: true,
              serialNumbers: ["MIXED-SER-001"],
            },
            {
              itemName: "Conflicting Serialized Device",
              category: "Laptop",
              quantity: 1,
              unitCost: 1200,
              storageLocation: "HQ Cage B2",
              isSerialized: false,
            },
          ],
        }),
      /Receipt line 2 cannot mix serialized and non-serialized entries/
    );

    console.log("Receipt document workflow regression checks passed.");
  } finally {
    await harness.stop();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
