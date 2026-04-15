import { Router } from "express";
import {
  acknowledgeIssueRecord,
  addReceivingReceiptAttachments,
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
  getReceivingReceipts,
  returnIssueRecord,
  getSuppliers,
  verifyReceivingReceipt,
} from "../controllers/operationsController";
import { requireRole } from "../middleware/authMiddleware";
import { runIssueAttachmentUpload } from "../lib/issueUploads";
import { runReceiptAttachmentUpload } from "../lib/receiptUploads";

const router = Router();

router.get("/overview", getOperationsOverview);
router.get("/receiving-options", getReceivingOptions);
router.get("/receipts", getReceivingReceipts);
router.post(
  "/receipts",
  requireRole("USER", "ADMIN", "SUPER_ADMIN"),
  runReceiptAttachmentUpload,
  createReceivingReceipt
);
router.post(
  "/receipts/:receiptId/attachments",
  requireRole("USER", "ADMIN", "SUPER_ADMIN"),
  runReceiptAttachmentUpload,
  addReceivingReceiptAttachments
);
router.post(
  "/receipts/:receiptId/verify",
  requireRole("USER", "ADMIN", "SUPER_ADMIN"),
  verifyReceivingReceipt
);
router.get("/stock", getHqStock);
router.get("/stock/:stockId", getHqStockDetail);
router.get("/serial-assets", getAvailableSerialAssets);
router.get("/attachments/:attachmentId/download", downloadOperationAttachment);
router.get("/branches", getBranches);
router.get("/issues", getIssueRecords);
router.post(
  "/issues",
  requireRole("USER", "ADMIN", "SUPER_ADMIN"),
  runIssueAttachmentUpload,
  createIssueRecord
);
router.post(
  "/issues/:issueId/acknowledge",
  requireRole("USER", "ADMIN", "SUPER_ADMIN"),
  acknowledgeIssueRecord
);
router.post(
  "/issues/:issueId/return",
  requireRole("USER", "ADMIN", "SUPER_ADMIN"),
  returnIssueRecord
);
router.get("/suppliers", getSuppliers);

export default router;
