"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStoredIssueAttachmentPath = exports.removeUploadedIssueFiles = exports.mapUploadedIssueFiles = exports.runIssueAttachmentUpload = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const multer_1 = __importDefault(require("multer"));
const allowedExtensions = new Set([
    ".pdf",
    ".jpg",
    ".jpeg",
    ".png",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
]);
const uploadErrorMessage = "Only PDF, image, Word, and Excel attachments are allowed";
const maxAttachmentFiles = 5;
const maxAttachmentFileSizeBytes = 10 * 1024 * 1024;
const configuredUploadPath = process.env.OPERATIONS_UPLOAD_PATH || "./data/uploads/issues";
const resolvedUploadRoot = path_1.default.isAbsolute(configuredUploadPath)
    ? configuredUploadPath
    : path_1.default.join(process.cwd(), configuredUploadPath);
const configuredReceiptUploadPath = process.env.RECEIPT_UPLOAD_PATH || "./data/uploads/receipts";
const resolvedReceiptUploadRoot = path_1.default.isAbsolute(configuredReceiptUploadPath)
    ? configuredReceiptUploadPath
    : path_1.default.join(process.cwd(), configuredReceiptUploadPath);
fs_1.default.mkdirSync(resolvedUploadRoot, { recursive: true });
const sanitizeFileName = (fileName) => {
    const fileBaseName = path_1.default.basename(fileName);
    const sanitizedName = fileBaseName
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    return sanitizedName || "attachment";
};
const isAllowedUpload = (file) => {
    const extension = path_1.default.extname(file.originalname).toLowerCase();
    return allowedExtensions.has(extension);
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, callback) => {
        callback(null, resolvedUploadRoot);
    },
    filename: (_req, file, callback) => {
        callback(null, `${Date.now()}-${(0, crypto_1.randomUUID)()}-${sanitizeFileName(file.originalname)}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        files: maxAttachmentFiles,
        fileSize: maxAttachmentFileSizeBytes,
    },
    fileFilter: (_req, file, callback) => {
        if (!isAllowedUpload(file)) {
            callback(new Error(uploadErrorMessage));
            return;
        }
        callback(null, true);
    },
});
const issueAttachmentUpload = upload.array("attachments", maxAttachmentFiles);
const runIssueAttachmentUpload = (req, res, next) => {
    if (!req.is("multipart/form-data")) {
        next();
        return;
    }
    issueAttachmentUpload(req, res, (error) => {
        if (!error) {
            next();
            return;
        }
        if (error instanceof multer_1.default.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                res.status(400).json({
                    message: "Each attachment must be 10 MB or smaller",
                });
                return;
            }
            res.status(400).json({
                message: "Too many attachments were uploaded",
            });
            return;
        }
        res.status(400).json({
            message: error instanceof Error ? error.message : "Attachment upload failed",
        });
    });
};
exports.runIssueAttachmentUpload = runIssueAttachmentUpload;
const mapUploadedIssueFiles = (files) => {
    return files.map((file) => ({
        originalName: file.originalname,
        storedName: path_1.default.basename(file.path),
        storagePath: path_1.default.relative(process.cwd(), file.path).replace(/\\/g, "/"),
        mimeType: file.mimetype || "application/octet-stream",
        fileSize: file.size,
    }));
};
exports.mapUploadedIssueFiles = mapUploadedIssueFiles;
const removeUploadedIssueFiles = (files) => {
    files.forEach((file) => {
        if (fs_1.default.existsSync(file.path)) {
            fs_1.default.unlinkSync(file.path);
        }
    });
};
exports.removeUploadedIssueFiles = removeUploadedIssueFiles;
const resolveStoredIssueAttachmentPath = (storagePath) => {
    const resolvedTargetPath = path_1.default.isAbsolute(storagePath)
        ? storagePath
        : path_1.default.join(process.cwd(), storagePath);
    const normalizedTargetPath = path_1.default.resolve(resolvedTargetPath);
    const normalizedAllowedRoots = [resolvedUploadRoot, resolvedReceiptUploadRoot].map((uploadRoot) => path_1.default.resolve(uploadRoot));
    const isWithinAllowedRoot = normalizedAllowedRoots.some((uploadRoot) => normalizedTargetPath === uploadRoot ||
        normalizedTargetPath.startsWith(`${uploadRoot}${path_1.default.sep}`));
    if (!isWithinAllowedRoot) {
        throw new Error("Attachment path is outside the upload directory");
    }
    return normalizedTargetPath;
};
exports.resolveStoredIssueAttachmentPath = resolveStoredIssueAttachmentPath;
