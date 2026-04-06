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
exports.getSuppliers = exports.getTransfers = exports.getHqStock = exports.getReceivingReceipts = exports.getOperationsOverview = void 0;
const operationsData_1 = require("../lib/operationsData");
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
        res.json((0, operationsData_1.getReceivingReceiptsData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving receiving receipts" });
    }
});
exports.getReceivingReceipts = getReceivingReceipts;
const getHqStock = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, operationsData_1.getHqStockData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving HQ stock" });
    }
});
exports.getHqStock = getHqStock;
const getTransfers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, operationsData_1.getTransfersData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving transfers" });
    }
});
exports.getTransfers = getTransfers;
const getSuppliers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, operationsData_1.getSuppliersData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving suppliers" });
    }
});
exports.getSuppliers = getSuppliers;
