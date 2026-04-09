import { Router } from "express";
import {
  acknowledgeIssueRecord,
  getBranches,
  getAvailableSerialAssets,
  createReceivingReceipt,
  createIssueRecord,
  downloadOperationAttachment,
  getHqStockDetail,
  getHqStock,
  getIssueRecords,
  getOperationsOverview,
  getReceivingOptions,
  getReceivingReceiptById,
  getReceivingReceipts,
  returnIssueRecord,
  getSuppliers,
} from "../controllers/operationsController";
import { runIssueAttachmentUpload } from "../lib/issueUploads";
import { runReceiptAttachmentUpload } from "../lib/receiptUploads";

const router = Router();

router.get("/overview", getOperationsOverview);
router.get("/receiving-options", getReceivingOptions);
router.get("/receipts", getReceivingReceipts);
router.get("/receipts/:receiptId", getReceivingReceiptById);
router.post("/receipts", runReceiptAttachmentUpload, createReceivingReceipt);
router.get("/stock", getHqStock);
router.get("/stock/:stockId", getHqStockDetail);
router.get("/serial-assets", getAvailableSerialAssets);
router.get("/attachments/:attachmentId/download", downloadOperationAttachment);
router.get("/branches", getBranches);
router.get("/issues", getIssueRecords);
router.post("/issues", runIssueAttachmentUpload, createIssueRecord);
router.post("/issues/:issueId/acknowledge", acknowledgeIssueRecord);
router.post("/issues/:issueId/return", returnIssueRecord);
router.get("/suppliers", getSuppliers);

export default router;
