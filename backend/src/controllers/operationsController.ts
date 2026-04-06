import { Request, Response } from "express";
import {
  createIssueRecordData,
  getHqStockData,
  getIssueRecordsData,
  getOperationsOverviewData,
  getReceivingReceiptsData,
  getSuppliersData,
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

export const getIssueRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(getIssueRecordsData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving issue records" });
  }
};

export const createIssueRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      itemName,
      serialNumber,
      destinationType,
      issuedTo,
      issuedBy,
      address,
      issueDate,
      attachmentNames,
      notes,
    } = req.body;

    const createdRecord = createIssueRecordData({
      itemName,
      serialNumber,
      destinationType,
      issuedTo,
      issuedBy,
      address,
      issueDate,
      attachmentNames,
      notes,
    });

    res.status(201).json(createdRecord);
  } catch (error) {
    res.status(500).json({ message: "Error creating issue record" });
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
