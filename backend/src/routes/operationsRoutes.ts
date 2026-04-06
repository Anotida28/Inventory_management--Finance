import { Router } from "express";
import {
  createIssueRecord,
  getHqStock,
  getIssueRecords,
  getOperationsOverview,
  getReceivingReceipts,
  getSuppliers,
} from "../controllers/operationsController";

const router = Router();

router.get("/overview", getOperationsOverview);
router.get("/receipts", getReceivingReceipts);
router.get("/stock", getHqStock);
router.get("/issues", getIssueRecords);
router.post("/issues", createIssueRecord);
router.get("/suppliers", getSuppliers);

export default router;
