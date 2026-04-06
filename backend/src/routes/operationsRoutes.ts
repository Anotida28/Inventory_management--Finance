import { Router } from "express";
import {
  getHqStock,
  getOperationsOverview,
  getReceivingReceipts,
  getSuppliers,
  getTransfers,
} from "../controllers/operationsController";

const router = Router();

router.get("/overview", getOperationsOverview);
router.get("/receipts", getReceivingReceipts);
router.get("/stock", getHqStock);
router.get("/transfers", getTransfers);
router.get("/suppliers", getSuppliers);

export default router;
