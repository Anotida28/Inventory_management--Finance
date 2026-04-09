import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";
import multer from "multer";

export type UploadedReceiptAttachment = {
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
};

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
const uploadErrorMessage =
  "Only PDF, image, Word, and Excel attachments are allowed";
const maxAttachmentFiles = 5;
const maxAttachmentFileSizeBytes = 10 * 1024 * 1024;

const configuredUploadPath =
  process.env.RECEIPT_UPLOAD_PATH || "./data/uploads/receipts";
const resolvedUploadRoot = path.isAbsolute(configuredUploadPath)
  ? configuredUploadPath
  : path.join(process.cwd(), configuredUploadPath);

fs.mkdirSync(resolvedUploadRoot, { recursive: true });

const sanitizeFileName = (fileName: string) => {
  const fileBaseName = path.basename(fileName);
  const sanitizedName = fileBaseName
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitizedName || "attachment";
};

const isAllowedUpload = (file: { originalname: string }) => {
  const extension = path.extname(file.originalname).toLowerCase();
  return allowedExtensions.has(extension);
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, resolvedUploadRoot);
  },
  filename: (_req, file, callback) => {
    callback(
      null,
      `${Date.now()}-${randomUUID()}-${sanitizeFileName(file.originalname)}`
    );
  },
});

const upload = multer({
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

const receiptAttachmentUpload = upload.array("attachments", maxAttachmentFiles);

export const runReceiptAttachmentUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.is("multipart/form-data")) {
    next();
    return;
  }

  receiptAttachmentUpload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
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
      message:
        error instanceof Error ? error.message : "Attachment upload failed",
    });
  });
};

export const mapUploadedReceiptFiles = (
  files: Express.Multer.File[]
): UploadedReceiptAttachment[] => {
  return files.map((file) => ({
    originalName: file.originalname,
    storedName: path.basename(file.path),
    storagePath: path.relative(process.cwd(), file.path).replace(/\\/g, "/"),
    mimeType: file.mimetype || "application/octet-stream",
    fileSize: file.size,
  }));
};

export const removeUploadedReceiptFiles = (files: Express.Multer.File[]) => {
  files.forEach((file) => {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
};
