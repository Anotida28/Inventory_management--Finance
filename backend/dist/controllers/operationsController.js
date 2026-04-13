"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuppliers = exports.downloadOperationAttachment = exports.returnIssueRecord = exports.acknowledgeIssueRecord = exports.createIssueRecord = exports.getIssueRecords = exports.getBranches = exports.getAvailableSerialAssets = exports.getHqStockDetail = exports.getHqStock = exports.verifyReceivingReceipt = exports.addReceivingReceiptAttachments = exports.createReceivingReceipt = exports.getReceivingReceiptById = exports.getReceivingOptions = exports.getReceivingReceipts = exports.getOperationsOverview = void 0;
const operationsData_1 = require("../lib/operationsData");
const receivingData_1 = require("../lib/receivingData");
const issueUploads_1 = require("../lib/issueUploads");
const receiptUploads_1 = require("../lib/receiptUploads");
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unexpected server error";
};
const getOperationsOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, operationsData_1.getOperationsOverviewData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving operations overview" });
    }
});
exports.getOperationsOverview = getOperationsOverview;
const getReceivingReceipts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, receivingData_1.getReceivingReceiptsWithAttachmentsData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving receiving receipts" });
    }
});
exports.getReceivingReceipts = getReceivingReceipts;
const getReceivingOptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, receivingData_1.getReceivingOptionsData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving receiving options" });
    }
});
exports.getReceivingOptions = getReceivingOptions;
const getReceivingReceiptById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const receipt = (0, receivingData_1.getReceivingReceiptByIdData)(req.params.receiptId);
        if (!receipt) {
            res.status(404).json({ message: "Receipt not found" });
            return;
        }
        res.json(receipt);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving receipt detail" });
    }
});
exports.getReceivingReceiptById = getReceivingReceiptById;
const createReceivingReceipt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const receiptRequest = req;
    const uploadedFiles = Array.isArray(receiptRequest.files)
        ? receiptRequest.files
        : [];
    try {
        const parsedLines = typeof req.body.lines === "string" ? JSON.parse(req.body.lines) : req.body.lines;
        const createdReceipt = (0, receivingData_1.createReceivingReceiptData)({
            receiptType: req.body.receiptType,
            supplierId: req.body.supplierId,
            arrivalDate: req.body.arrivalDate,
            signedBy: req.body.signedBy,
            receivedBy: req.body.receivedBy,
            documentStatus: req.body.documentStatus,
            lines: parsedLines,
        }, (0, receiptUploads_1.mapUploadedReceiptFiles)(uploadedFiles));
        res.status(201).json(createdReceipt);
    }
    catch (error) {
        (0, receiptUploads_1.removeUploadedReceiptFiles)(uploadedFiles);
        const message = getErrorMessage(error);
        if (message === "Missing required receipt fields" ||
            message === "Invalid receipt type" ||
            message === "Invalid document status" ||
            message ===
                "Receipts cannot be created as complete. Upload documents first, then verify the receipt after review." ||
            message === "Single item receipts can only contain one line" ||
            message === "Each item can only appear once per receipt" ||
            message === "Supplier was not found" ||
            message.includes("Unexpected") ||
            message.includes("Receipt line")) {
            res.status(400).json({ message });
            return;
        }
        if (message === "Duplicate serial numbers were supplied in this receipt" ||
            message.includes("already exists in HQ stock")) {
            res.status(409).json({ message });
            return;
        }
        res.status(500).json({ message: "Error creating receipt" });
    }
});
exports.createReceivingReceipt = createReceivingReceipt;
const addReceivingReceiptAttachments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const receiptRequest = req;
    const uploadedFiles = Array.isArray(receiptRequest.files)
        ? receiptRequest.files
        : [];
    try {
        const updatedReceipt = (0, receivingData_1.appendReceivingReceiptAttachmentsData)(req.params.receiptId, (0, receiptUploads_1.mapUploadedReceiptFiles)(uploadedFiles));
        res.json(updatedReceipt);
    }
    catch (error) {
        (0, receiptUploads_1.removeUploadedReceiptFiles)(uploadedFiles);
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
});
exports.addReceivingReceiptAttachments = addReceivingReceiptAttachments;
const verifyReceivingReceipt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedReceipt = (0, receivingData_1.verifyReceivingReceiptData)(req.params.receiptId);
        res.json(updatedReceipt);
    }
    catch (error) {
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
});
exports.verifyReceivingReceipt = verifyReceivingReceipt;
const getHqStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, operationsData_1.getHqStockData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving HQ stock" });
    }
});
exports.getHqStock = getHqStock;
const getHqStockDetail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stockItem = (0, operationsData_1.getHqStockDetailData)(req.params.stockId);
        if (!stockItem) {
            res.status(404).json({ message: "HQ stock item not found" });
            return;
        }
        res.json(stockItem);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving HQ stock detail" });
    }
});
exports.getHqStockDetail = getHqStockDetail;
const getAvailableSerialAssets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const itemName = typeof req.query.itemName === "string" ? req.query.itemName : undefined;
        res.json((0, operationsData_1.getAvailableSerialAssetsData)(itemName));
    }
    catch (error) {
        res
            .status(500)
            .json({ message: "Error retrieving available serial assets" });
    }
});
exports.getAvailableSerialAssets = getAvailableSerialAssets;
const getBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, operationsData_1.getBranchesData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving branches" });
    }
});
exports.getBranches = getBranches;
const getIssueRecords = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, operationsData_1.getIssueRecordsData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving issue records" });
    }
});
exports.getIssueRecords = getIssueRecords;
const createIssueRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const issueRequest = req;
    const uploadedFiles = Array.isArray(issueRequest.files) ? issueRequest.files : [];
    try {
        const { itemName, serialNumber, destinationType, branchId, issuedTo, issuedBy, address, issueDate, attachmentNames, notes, } = req.body;
        const createdRecord = (0, operationsData_1.createIssueRecordData)({
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
        }, (0, issueUploads_1.mapUploadedIssueFiles)(uploadedFiles));
        res.status(201).json(createdRecord);
    }
    catch (error) {
        (0, issueUploads_1.removeUploadedIssueFiles)(uploadedFiles);
        const message = getErrorMessage(error);
        if (message === "Missing required issue-out fields" ||
            message === "Invalid issue destination type" ||
            message === "Selected branch was not found" ||
            message === "Item was not found in HQ stock" ||
            message === "No stock remains for this item" ||
            message === "Selected serial number is not available in HQ stock") {
            res.status(400).json({ message });
            return;
        }
        if (message === "This serial number has already been issued") {
            res.status(409).json({ message });
            return;
        }
        res.status(500).json({ message: "Error creating issue record" });
    }
});
exports.createIssueRecord = createIssueRecord;
const acknowledgeIssueRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedIssueRecord = (0, operationsData_1.acknowledgeIssueRecordData)(req.params.issueId, {
            acknowledgedBy: req.body.acknowledgedBy,
            acknowledgedAt: req.body.acknowledgedAt,
            acknowledgementNotes: req.body.acknowledgementNotes,
        });
        res.json(updatedIssueRecord);
    }
    catch (error) {
        const message = getErrorMessage(error);
        if (message === "Issue record was not found") {
            res.status(404).json({ message });
            return;
        }
        if (message === "Missing acknowledgement fields" ||
            message === "Returned issue records cannot be acknowledged") {
            res.status(400).json({ message });
            return;
        }
        if (message === "Issue record has already been acknowledged") {
            res.status(409).json({ message });
            return;
        }
        res.status(500).json({ message: "Error acknowledging issue record" });
    }
});
exports.acknowledgeIssueRecord = acknowledgeIssueRecord;
const returnIssueRecord = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedIssueRecord = (0, operationsData_1.returnIssueRecordData)(req.params.issueId, {
            returnedBy: req.body.returnedBy,
            returnedAt: req.body.returnedAt,
            returnNotes: req.body.returnNotes,
        });
        res.json(updatedIssueRecord);
    }
    catch (error) {
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
        if (message === "HQ stock item was not found for this return" ||
            message === "Serial asset was not found for this issue" ||
            message === "Serial asset is not currently issued" ||
            message === "Serial asset is linked to a different issue" ||
            message === "Serial asset is linked to the wrong HQ stock item") {
            res.status(409).json({ message });
            return;
        }
        res.status(500).json({ message: "Error returning issue record" });
    }
});
exports.returnIssueRecord = returnIssueRecord;
const downloadOperationAttachment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attachment = (0, receivingData_1.getOperationAttachmentByIdData)(req.params.attachmentId);
        if (!attachment) {
            res.status(404).json({ message: "Attachment not found" });
            return;
        }
        res.download((0, issueUploads_1.resolveStoredIssueAttachmentPath)(attachment.storagePath), attachment.originalName);
    }
    catch (error) {
        res.status(404).json({ message: "Attachment file not found" });
    }
});
exports.downloadOperationAttachment = downloadOperationAttachment;
const getSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, operationsData_1.getSuppliersData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving suppliers" });
    }
});
exports.getSuppliers = getSuppliers;
