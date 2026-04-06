import { Request, Response } from "express";
import {
  getHqStockData,
  getOperationsOverviewData,
  getReceivingReceiptsData,
  getSuppliersData,
  getTransfersData,
} from "../lib/operationsData";

export const getOperationsOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(getOperationsOverviewData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving operations overview" });
  }
};

export const getReceivingReceipts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(getReceivingReceiptsData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving receiving receipts" });
  }
};

export const getHqStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(getHqStockData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving HQ stock" });
  }
};

export const getTransfers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(getTransfersData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving transfers" });
  }
};

export const getSuppliers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(getSuppliersData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving suppliers" });
  }
};
