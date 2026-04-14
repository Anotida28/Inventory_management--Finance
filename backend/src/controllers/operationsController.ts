import { Request, Response } from "express";
import {
  mapUploadedIssueFiles,
  removeUploadedIssueFiles,
  resolveStoredIssueAttachmentPath,
} from "../lib/issueUploads";
import {
  mapUploadedReceiptFiles,
  removeUploadedReceiptFiles,
} from "../lib/receiptUploads";
import { backendRuntime } from "../lib/runtimeClient";

type IssueRequest = Request & {
  files?: Express.Multer.File[];
};

type ReceiptRequest = Request & {
  files?: Express.Multer.File[];
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected server error";
};

export const getOperationsOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(await backendRuntime.operations.getOperationsOverview());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving operations overview" });
  }
};

export const getReceivingReceipts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(await backendRuntime.receiving.getReceivingReceipts());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving receiving receipts" });
  }
};

export const getReceivingOptions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(await backendRuntime.receiving.getReceivingOptions());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving receiving options" });
  }
};

export const getReceivingReceiptById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const receipt = await backendRuntime.receiving.getReceivingReceiptById(
      req.params.receiptId
    );

    if (!receipt) {
      res.status(404).json({ message: "Receipt not found" });
      return;
    }

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving receipt detail" });
  }
};

export const createReceivingReceipt = async (
  req: Request,
  res: Response
): Promise<void> => {
  const receiptRequest = req as ReceiptRequest;
  const uploadedFiles = Array.isArray(receiptRequest.files)
    ? receiptRequest.files
    : [];

  try {
    const parsedLines =
      typeof req.body.lines === "string" ? JSON.parse(req.body.lines) : req.body.lines;

    const createdReceipt = await backendRuntime.receiving.createReceipt(
      {
        receiptType: req.body.receiptType,
        supplierId: req.body.supplierId,
        arrivalDate: req.body.arrivalDate,
        signedBy: req.body.signedBy,
        receivedBy: req.body.receivedBy,
        documentStatus: req.body.documentStatus,
        lines: parsedLines,
      },
      mapUploadedReceiptFiles(uploadedFiles)
    );

    res.status(201).json(createdReceipt);
  } catch (error) {
    removeUploadedReceiptFiles(uploadedFiles);

    const message = getErrorMessage(error);

    if (
      message === "Missing required receipt fields" ||
      message === "Invalid receipt type" ||
      message === "Invalid document status" ||
      message ===
        "Receipts cannot be created as complete. Upload documents first, then verify the receipt after review." ||
      message === "Single item receipts can only contain one line" ||
      message === "Each item can only appear once per receipt" ||
      message === "Supplier was not found" ||
      message.includes("Unexpected") ||
      message.includes("Receipt line")
    ) {
      res.status(400).json({ message });
      return;
    }

    if (
      message === "Duplicate serial numbers were supplied in this receipt" ||
      message.includes("already exists in HQ stock")
    ) {
      res.status(409).json({ message });
      return;
    }

    res.status(500).json({ message: "Error creating receipt" });
  }
};

export const addReceivingReceiptAttachments = async (
  req: Request,
  res: Response
): Promise<void> => {
  const receiptRequest = req as ReceiptRequest;
  const uploadedFiles = Array.isArray(receiptRequest.files)
    ? receiptRequest.files
    : [];

  try {
    const updatedReceipt = await backendRuntime.receiving.addReceiptAttachments(
      req.params.receiptId,
      mapUploadedReceiptFiles(uploadedFiles)
    );

    res.json(updatedReceipt);
  } catch (error) {
    removeUploadedReceiptFiles(uploadedFiles);

    const message = getErrorMessage(error);

    if (message === "Receipt not found") {
      res.status(404).json({ message });
      return;
    }

    if (message === "At least one attachment is required") {
      res.status(400).json({ message });
      return;
    }

    res.status(500).json({ message: "Error uploading receipt attachments" });
  }
};

export const verifyReceivingReceipt = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const updatedReceipt = await backendRuntime.receiving.verifyReceipt(
      req.params.receiptId
    );

    res.json(updatedReceipt);
  } catch (error) {
    const message = getErrorMessage(error);

    if (message === "Receipt not found") {
      res.status(404).json({ message });
      return;
    }

    if (message === "Receipt has no attachments to verify") {
      res.status(400).json({ message });
      return;
    }

    if (message === "Receipt is already verified") {
      res.status(409).json({ message });
      return;
    }

    res.status(500).json({ message: "Error verifying receipt documents" });
  }
};

export const getHqStock = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(await backendRuntime.operations.getHqStock());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving HQ stock" });
  }
};

export const getHqStockDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stockItem = await backendRuntime.operations.getHqStockDetail(
      req.params.stockId
    );

    if (!stockItem) {
      res.status(404).json({ message: "HQ stock item not found" });
      return;
    }

    res.json(stockItem);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving HQ stock detail" });
  }
};

export const getAvailableSerialAssets = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const itemName =
      typeof req.query.itemName === "string" ? req.query.itemName : undefined;
    res.json(await backendRuntime.operations.getAvailableSerialAssets(itemName));
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving available serial assets" });
  }
};

export const getBranches = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(await backendRuntime.operations.getBranches());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving branches" });
  }
};

export const getIssueRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(await backendRuntime.operations.getIssueRecords());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving issue records" });
  }
};

export const createIssueRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  const issueRequest = req as IssueRequest;
  const uploadedFiles = Array.isArray(issueRequest.files) ? issueRequest.files : [];

  try {
    const {
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
    } = req.body;

    const createdRecord = await backendRuntime.operations.createIssueRecord(
      {
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
      },
      mapUploadedIssueFiles(uploadedFiles)
    );

    res.status(201).json(createdRecord);
  } catch (error) {
    removeUploadedIssueFiles(uploadedFiles);

    const message = getErrorMessage(error);

    if (
      message === "Missing required issue-out fields" ||
      message === "Invalid issue destination type" ||
      message === "Selected branch was not found" ||
      message === "Item was not found in HQ stock" ||
      message === "No stock remains for this item" ||
      message === "Selected serial number is not available in HQ stock"
    ) {
      res.status(400).json({ message });
      return;
    }

    if (message === "This serial number has already been issued") {
      res.status(409).json({ message });
      return;
    }

    res.status(500).json({ message: "Error creating issue record" });
  }
};

export const acknowledgeIssueRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const updatedIssueRecord =
      await backendRuntime.operations.acknowledgeIssueRecord(
        req.params.issueId,
        {
          acknowledgedBy: req.body.acknowledgedBy,
          acknowledgedAt: req.body.acknowledgedAt,
          acknowledgementNotes: req.body.acknowledgementNotes,
        }
      );

    res.json(updatedIssueRecord);
  } catch (error) {
    const message = getErrorMessage(error);

    if (message === "Issue record was not found") {
      res.status(404).json({ message });
      return;
    }

    if (
      message === "Missing acknowledgement fields" ||
      message === "Returned issue records cannot be acknowledged"
    ) {
      res.status(400).json({ message });
      return;
    }

    if (message === "Issue record has already been acknowledged") {
      res.status(409).json({ message });
      return;
    }

    res.status(500).json({ message: "Error acknowledging issue record" });
  }
};

export const returnIssueRecord = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const updatedIssueRecord = await backendRuntime.operations.returnIssueRecord(
      req.params.issueId,
      {
        returnedBy: req.body.returnedBy,
        returnedAt: req.body.returnedAt,
        returnNotes: req.body.returnNotes,
      }
    );

    res.json(updatedIssueRecord);
  } catch (error) {
    const message = getErrorMessage(error);

    if (message === "Issue record was not found") {
      res.status(404).json({ message });
      return;
    }

    if (message === "Missing return fields") {
      res.status(400).json({ message });
      return;
    }

    if (message === "Issue record has already been returned") {
      res.status(409).json({ message });
      return;
    }

    if (
      message === "HQ stock item was not found for this return" ||
      message === "Serial asset was not found for this issue" ||
      message === "Serial asset is not currently issued" ||
      message === "Serial asset is linked to a different issue" ||
      message === "Serial asset is linked to the wrong HQ stock item"
    ) {
      res.status(409).json({ message });
      return;
    }

    res.status(500).json({ message: "Error returning issue record" });
  }
};

export const downloadOperationAttachment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const attachment = await backendRuntime.receiving.getOperationAttachmentById(
      req.params.attachmentId
    );

    if (!attachment) {
      res.status(404).json({ message: "Attachment not found" });
      return;
    }

    res.download(
      resolveStoredIssueAttachmentPath(attachment.storagePath),
      attachment.originalName
    );
  } catch (error) {
    res.status(404).json({ message: "Attachment file not found" });
  }
};

export const getSuppliers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(await backendRuntime.operations.getSuppliers());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving suppliers" });
  }
};
