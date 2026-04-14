const { parentPort } = require("node:worker_threads");

const authData = require("../dist/lib/authData.js");
const operationsData = require("../dist/lib/operationsData.js");
const receivingData = require("../dist/lib/receivingData.js");

if (!parentPort) {
  throw new Error("runtimeWorker.js must be started as a worker thread");
}

const methods = {
  "system.ping": () => ({ ok: true }),
  "auth.authenticateToken": (token) => {
    const payload = authData.verifyAccessToken(token);
    const user = authData.getUserByIdData(payload.sub);

    if (!user || user.status !== "Active") {
      throw new Error("Invalid or expired token");
    }

    return user;
  },
  "auth.getAuthBootstrapStatus": () => authData.getAuthBootstrapStatusData(),
  "auth.getUserById": (userId) => authData.getUserByIdData(userId),
  "auth.loginUser": (payload) => authData.loginUserData(payload),
  "auth.registerInitialUser": (payload) => authData.registerInitialUserData(payload),
  "auth.syncExternalUser": (payload) => authData.syncExternalUserData(payload),
  "operations.acknowledgeIssueRecord": (issueId, payload) =>
    operationsData.acknowledgeIssueRecordData(issueId, payload),
  "operations.createIssueRecord": (payload, uploadedAttachments) =>
    operationsData.createIssueRecordData(payload, uploadedAttachments),
  "operations.getAvailableSerialAssets": (itemName) =>
    operationsData.getAvailableSerialAssetsData(itemName),
  "operations.getBranches": () => operationsData.getBranchesData(),
  "operations.getHqStock": () => operationsData.getHqStockData(),
  "operations.getHqStockDetail": (stockId) =>
    operationsData.getHqStockDetailData(stockId),
  "operations.getIssueRecords": () => operationsData.getIssueRecordsData(),
  "operations.getOperationsOverview": () =>
    operationsData.getOperationsOverviewData(),
  "operations.getSuppliers": () => operationsData.getSuppliersData(),
  "operations.returnIssueRecord": (issueId, payload) =>
    operationsData.returnIssueRecordData(issueId, payload),
  "receiving.addReceiptAttachments": (receiptId, uploadedAttachments) =>
    receivingData.appendReceivingReceiptAttachmentsData(
      receiptId,
      uploadedAttachments
    ),
  "receiving.createReceipt": (payload, uploadedAttachments) =>
    receivingData.createReceivingReceiptData(payload, uploadedAttachments),
  "receiving.getOperationAttachmentById": (attachmentId) =>
    receivingData.getOperationAttachmentByIdData(attachmentId),
  "receiving.getReceivingOptions": () => receivingData.getReceivingOptionsData(),
  "receiving.getReceivingReceiptById": (receiptId) =>
    receivingData.getReceivingReceiptByIdData(receiptId),
  "receiving.getReceivingReceipts": () =>
    receivingData.getReceivingReceiptsWithAttachmentsData(),
  "receiving.verifyReceipt": (receiptId) =>
    receivingData.verifyReceivingReceiptData(receiptId),
  "users.createUser": (payload, actor) => authData.createUserData(payload, actor),
  "users.getUsers": () => authData.listUsersData(),
};

parentPort.on("message", async (message) => {
  const method = methods[message.method];

  if (!method) {
    parentPort.postMessage({
      id: message.id,
      error: {
        message: `Unknown runtime method: ${message.method}`,
      },
    });
    return;
  }

  try {
    const result = await Promise.resolve(method(...message.args));
    parentPort.postMessage({
      id: message.id,
      result,
    });
  } catch (error) {
    parentPort.postMessage({
      id: message.id,
      error: {
        message:
          error instanceof Error ? error.message : "Unexpected worker error",
        stack: error instanceof Error ? error.stack : undefined,
      },
    });
  }
});
