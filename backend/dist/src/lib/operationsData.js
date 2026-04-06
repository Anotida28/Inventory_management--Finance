"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationsOverviewData = exports.createIssueRecordData = exports.getIssueRecordsData = exports.getHqStockData = exports.getSuppliersData = exports.getReceivingReceiptsData = void 0;
const suppliers = [
    {
        supplierId: "SUP-001",
        name: "Zim Office Tech",
        contactPerson: "Tariro Moyo",
        phone: "+263 77 120 4481",
        email: "deliveries@zimofficetech.co.zw",
        categoryFocus: "Computers and Peripherals",
        lastDeliveryDate: "2026-04-03",
        activeContracts: 3,
    },
    {
        supplierId: "SUP-002",
        name: "SecureNet Distribution",
        contactPerson: "Brian Chikore",
        phone: "+263 77 344 2109",
        email: "ops@securenetdistribution.co.zw",
        categoryFocus: "Networking and Security",
        lastDeliveryDate: "2026-03-28",
        activeContracts: 2,
    },
    {
        supplierId: "SUP-003",
        name: "Office Source Wholesale",
        contactPerson: "Rudo Dube",
        phone: "+263 71 889 3410",
        email: "support@officesource.africa",
        categoryFocus: "Furniture and Consumables",
        lastDeliveryDate: "2026-03-19",
        activeContracts: 1,
    },
    {
        supplierId: "SUP-004",
        name: "Prime Devices Africa",
        contactPerson: "Elton Ncube",
        phone: "+263 78 445 6612",
        email: "hq@primedevices.africa",
        categoryFocus: "Mobile and Field Devices",
        lastDeliveryDate: "2026-04-01",
        activeContracts: 4,
    },
];
const receivingReceipts = [
    {
        receiptId: "RCV-2026-004",
        receiptType: "Batch",
        supplierId: "SUP-001",
        supplierName: "Zim Office Tech",
        arrivalDate: "2026-04-03",
        signedBy: "L. Dlamini",
        receivedBy: "Procurement Desk",
        itemCount: 4,
        totalQuantity: 26,
        totalAmount: 18450,
        documentCount: 3,
        documentStatus: "Complete",
        status: "Verified",
    },
    {
        receiptId: "RCV-2026-003",
        receiptType: "Single Item",
        supplierId: "SUP-004",
        supplierName: "Prime Devices Africa",
        arrivalDate: "2026-04-01",
        signedBy: "S. Mupfumi",
        receivedBy: "Stores Officer",
        itemCount: 1,
        totalQuantity: 1,
        totalAmount: 920,
        documentCount: 2,
        documentStatus: "Pending Review",
        status: "Pending Review",
    },
    {
        receiptId: "RCV-2026-002",
        receiptType: "Batch",
        supplierId: "SUP-002",
        supplierName: "SecureNet Distribution",
        arrivalDate: "2026-03-28",
        signedBy: "P. Chuma",
        receivedBy: "Procurement Desk",
        itemCount: 3,
        totalQuantity: 18,
        totalAmount: 12680,
        documentCount: 1,
        documentStatus: "Pending Review",
        status: "Logged",
    },
    {
        receiptId: "RCV-2026-001",
        receiptType: "Single Item",
        supplierId: "SUP-003",
        supplierName: "Office Source Wholesale",
        arrivalDate: "2026-03-19",
        signedBy: "T. Moyo",
        receivedBy: "Stores Officer",
        itemCount: 1,
        totalQuantity: 1,
        totalAmount: 640,
        documentCount: 0,
        documentStatus: "Missing",
        status: "Pending Review",
    },
];
const hqStockItems = [
    {
        stockId: "STK-001",
        itemName: "Lenovo ThinkPad E14",
        category: "Laptop",
        totalQuantity: 12,
        serializedUnits: 12,
        nonSerializedUnits: 0,
        supplierName: "Zim Office Tech",
        lastArrivalDate: "2026-04-03",
        storageLocation: "HQ Cage A1",
        status: "Available",
    },
    {
        stockId: "STK-002",
        itemName: "MikroTik Router RB4011",
        category: "Network",
        totalQuantity: 6,
        serializedUnits: 6,
        nonSerializedUnits: 0,
        supplierName: "SecureNet Distribution",
        lastArrivalDate: "2026-03-28",
        storageLocation: "HQ Cage B2",
        status: "Available",
    },
    {
        stockId: "STK-003",
        itemName: 'HP 24" Monitor',
        category: "Monitor",
        totalQuantity: 20,
        serializedUnits: 0,
        nonSerializedUnits: 20,
        supplierName: "Zim Office Tech",
        lastArrivalDate: "2026-04-03",
        storageLocation: "HQ Rack C4",
        status: "Reserved",
    },
    {
        stockId: "STK-004",
        itemName: "Visitor Access Tablets",
        category: "Tablet",
        totalQuantity: 3,
        serializedUnits: 3,
        nonSerializedUnits: 0,
        supplierName: "Prime Devices Africa",
        lastArrivalDate: "2026-04-01",
        storageLocation: "HQ Cage A3",
        status: "Available",
    },
    {
        stockId: "STK-005",
        itemName: "Receipt Folders",
        category: "Stationery",
        totalQuantity: 40,
        serializedUnits: 0,
        nonSerializedUnits: 40,
        supplierName: "Office Source Wholesale",
        lastArrivalDate: "2026-03-19",
        storageLocation: "HQ Rack D1",
        status: "Low Stock",
    },
];
const issueRecords = [
    {
        issueId: "ISS-2026-007",
        itemName: "Lenovo ThinkPad E14",
        serialNumber: "LNV-E14-240041",
        destinationType: "Branch",
        issuedTo: "Bulawayo Branch",
        issuedBy: "L. Dlamini",
        address: "12 Jason Moyo Road, Bulawayo",
        issueDate: "2026-04-05",
        attachmentNames: ["signed-dispatch-note.pdf", "vehicle-log.jpg"],
        notes: "Issued for new branch onboarding team.",
        status: "Issued",
    },
    {
        issueId: "ISS-2026-006",
        itemName: "MikroTik Router RB4011",
        serialNumber: "MKT-RB4011-7782",
        destinationType: "Branch",
        issuedTo: "Mutare Branch",
        issuedBy: "P. Chuma",
        address: "16 Herbert Chitepo Street, Mutare",
        issueDate: "2026-04-04",
        attachmentNames: ["router-issue-form.pdf"],
        notes: "Replacement router for branch connectivity upgrade.",
        status: "Issued",
    },
    {
        issueId: "ISS-2026-005",
        itemName: "Visitor Access Tablets",
        serialNumber: "VAT-TAB-1020",
        destinationType: "Person",
        issuedTo: "K. Mpofu",
        issuedBy: "S. Mupfumi",
        address: "OMDS Gweru Branch, Main Reception",
        issueDate: "2026-04-02",
        attachmentNames: [],
        notes: "Assigned to branch receptionist for visitor sign-in.",
        status: "Issued",
    },
    {
        issueId: "ISS-2026-004",
        itemName: 'HP 24" Monitor',
        serialNumber: "MON-HP24-3308",
        destinationType: "Person",
        issuedTo: "R. Dube",
        issuedBy: "L. Dlamini",
        address: "OMDS HQ Finance Office",
        issueDate: "2026-04-06",
        attachmentNames: ["desk-allocation-note.pdf"],
        notes: "Temporary workstation allocation at HQ.",
        status: "Issued",
    },
];
const getReceivingReceiptsData = () => receivingReceipts;
exports.getReceivingReceiptsData = getReceivingReceiptsData;
const getSuppliersData = () => suppliers;
exports.getSuppliersData = getSuppliersData;
const getHqStockData = () => hqStockItems;
exports.getHqStockData = getHqStockData;
const getIssueRecordsData = () => issueRecords;
exports.getIssueRecordsData = getIssueRecordsData;
const createIssueRecordData = (newIssueRecord) => {
    var _a;
    const highestIssueSequence = issueRecords.reduce((highest, record) => {
        var _a;
        const sequence = Number((_a = record.issueId.split("-").at(-1)) !== null && _a !== void 0 ? _a : 0);
        return Math.max(highest, sequence);
    }, 0);
    const issueId = `ISS-${new Date().getFullYear()}-${String(highestIssueSequence + 1).padStart(3, "0")}`;
    const createdRecord = {
        issueId,
        itemName: newIssueRecord.itemName,
        serialNumber: newIssueRecord.serialNumber,
        destinationType: newIssueRecord.destinationType,
        issuedTo: newIssueRecord.issuedTo,
        issuedBy: newIssueRecord.issuedBy,
        address: newIssueRecord.address,
        issueDate: newIssueRecord.issueDate,
        attachmentNames: (_a = newIssueRecord.attachmentNames) !== null && _a !== void 0 ? _a : [],
        notes: newIssueRecord.notes,
        status: "Issued",
    };
    issueRecords.unshift(createdRecord);
    const matchingStockItem = hqStockItems.find((item) => item.itemName === newIssueRecord.itemName);
    if (matchingStockItem && matchingStockItem.totalQuantity > 0) {
        matchingStockItem.totalQuantity -= 1;
        if (matchingStockItem.serializedUnits > 0) {
            matchingStockItem.serializedUnits -= 1;
        }
        else if (matchingStockItem.nonSerializedUnits > 0) {
            matchingStockItem.nonSerializedUnits -= 1;
        }
        if (matchingStockItem.totalQuantity <= 5) {
            matchingStockItem.status = "Low Stock";
        }
    }
    return createdRecord;
};
exports.createIssueRecordData = createIssueRecordData;
const getOperationsOverviewData = () => {
    const receiptsThisMonth = receivingReceipts.filter((receipt) => receipt.arrivalDate.startsWith("2026-04")).length;
    const totalReceivedValue = receivingReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
    const hqUnitsOnHand = hqStockItems.reduce((sum, item) => sum + item.totalQuantity, 0);
    const serializedUnits = hqStockItems.reduce((sum, item) => sum + item.serializedUnits, 0);
    const pendingIssues = issueRecords.length;
    const documentsPendingReview = receivingReceipts.filter((receipt) => receipt.documentStatus !== "Complete").length;
    return {
        receiptsThisMonth,
        totalReceivedValue,
        hqUnitsOnHand,
        serializedUnits,
        pendingIssues,
        activeSuppliers: suppliers.length,
        documentsPendingReview,
        recentReceipts: receivingReceipts.slice(0, 4),
        issueOutQueue: issueRecords.slice(0, 4),
        supplierHighlights: suppliers.slice(0, 3),
    };
};
exports.getOperationsOverviewData = getOperationsOverviewData;
