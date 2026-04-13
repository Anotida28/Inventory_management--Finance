"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustStockLocationBalance = exports.refreshStockItemLocationSummary = exports.getPrimaryStorageLocation = exports.getStorageLocationSummary = exports.getStockLocationBalancesByStockId = exports.getStockLocationBalancesByStockIds = exports.ensureStockLocationBalanceSchema = void 0;
const mapStockLocationBalance = (row) => ({
    balanceId: row.balanceId,
    stockId: row.stockId,
    storageLocation: row.storageLocation,
    totalQuantity: row.totalQuantity,
    serializedUnits: row.serializedUnits,
    nonSerializedUnits: row.nonSerializedUnits,
    lastMovementDate: row.lastMovementDate,
});
const getNextStockLocationBalanceId = (db, stockId) => {
    const existingCount = db
        .prepare(`
            SELECT COUNT(*) AS count
            FROM hq_stock_location_balances
            WHERE stockId = ?
          `)
        .get(stockId).count || 0;
    return `${stockId}-LOC-${String(existingCount + 1).padStart(3, "0")}`;
};
const ensureStockLocationBalanceSchema = (db) => {
    if (db.dialect === "sqlserver") {
        return;
    }
    db.exec(`
    CREATE TABLE IF NOT EXISTS hq_stock_location_balances (
      balanceId VARCHAR(64) PRIMARY KEY,
      stockId VARCHAR(64) NOT NULL,
      storageLocation VARCHAR(255) NOT NULL,
      totalQuantity INT NOT NULL,
      serializedUnits INT NOT NULL DEFAULT 0,
      nonSerializedUnits INT NOT NULL DEFAULT 0,
      lastMovementDate VARCHAR(32) NOT NULL,
      UNIQUE KEY idx_hq_stock_location_balances_unique (stockId, storageLocation),
      KEY idx_hq_stock_location_balances_stock (stockId, totalQuantity, storageLocation)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};
exports.ensureStockLocationBalanceSchema = ensureStockLocationBalanceSchema;
const getStockLocationBalancesByStockIds = (db, stockIds) => {
    const balancesByStockId = new Map();
    if (stockIds.length === 0) {
        return balancesByStockId;
    }
    const placeholders = stockIds.map(() => "?").join(", ");
    const rows = db
        .prepare(`
        SELECT
          balanceId,
          stockId,
          storageLocation,
          totalQuantity,
          serializedUnits,
          nonSerializedUnits,
          lastMovementDate
        FROM hq_stock_location_balances
        WHERE stockId IN (${placeholders})
        ORDER BY stockId ASC, totalQuantity DESC, storageLocation ASC
      `)
        .all(...stockIds);
    rows.forEach((row) => {
        var _a;
        const mappedBalance = mapStockLocationBalance(row);
        const stockBalances = (_a = balancesByStockId.get(mappedBalance.stockId)) !== null && _a !== void 0 ? _a : [];
        stockBalances.push(mappedBalance);
        balancesByStockId.set(mappedBalance.stockId, stockBalances);
    });
    return balancesByStockId;
};
exports.getStockLocationBalancesByStockIds = getStockLocationBalancesByStockIds;
const getStockLocationBalancesByStockId = (db, stockId) => { var _a; return (_a = (0, exports.getStockLocationBalancesByStockIds)(db, [stockId]).get(stockId)) !== null && _a !== void 0 ? _a : []; };
exports.getStockLocationBalancesByStockId = getStockLocationBalancesByStockId;
const getStorageLocationSummary = (balances) => {
    if (balances.length === 0) {
        return "Unassigned";
    }
    if (balances.length === 1) {
        return balances[0].storageLocation;
    }
    return `Multiple (${balances.length})`;
};
exports.getStorageLocationSummary = getStorageLocationSummary;
const getPrimaryStorageLocation = (balances) => {
    var _a;
    if (balances.length === 0) {
        return undefined;
    }
    const sortedBalances = [...balances].sort((left, right) => {
        if (right.totalQuantity !== left.totalQuantity) {
            return right.totalQuantity - left.totalQuantity;
        }
        if (right.serializedUnits !== left.serializedUnits) {
            return right.serializedUnits - left.serializedUnits;
        }
        if (right.lastMovementDate !== left.lastMovementDate) {
            return right.lastMovementDate.localeCompare(left.lastMovementDate);
        }
        return left.storageLocation.localeCompare(right.storageLocation);
    });
    return (_a = sortedBalances[0]) === null || _a === void 0 ? void 0 : _a.storageLocation;
};
exports.getPrimaryStorageLocation = getPrimaryStorageLocation;
const refreshStockItemLocationSummary = (db, stockId) => {
    const balances = (0, exports.getStockLocationBalancesByStockId)(db, stockId);
    const nextSummary = (0, exports.getStorageLocationSummary)(balances);
    db.prepare(`
      UPDATE hq_stock_items
      SET storageLocation = ?
      WHERE stockId = ?
    `).run(nextSummary, stockId);
};
exports.refreshStockItemLocationSummary = refreshStockItemLocationSummary;
const adjustStockLocationBalance = (db, args) => {
    var _a, _b, _c;
    const existingBalance = db
        .prepare(`
        SELECT
          balanceId,
          stockId,
          storageLocation,
          totalQuantity,
          serializedUnits,
          nonSerializedUnits,
          lastMovementDate
        FROM hq_stock_location_balances
        WHERE stockId = ? AND storageLocation = ?
      `)
        .get(args.stockId, args.storageLocation);
    const nextSerializedUnits = ((_a = existingBalance === null || existingBalance === void 0 ? void 0 : existingBalance.serializedUnits) !== null && _a !== void 0 ? _a : 0) + args.serializedDelta;
    const nextNonSerializedUnits = ((_b = existingBalance === null || existingBalance === void 0 ? void 0 : existingBalance.nonSerializedUnits) !== null && _b !== void 0 ? _b : 0) + args.nonSerializedDelta;
    const nextTotalQuantity = ((_c = existingBalance === null || existingBalance === void 0 ? void 0 : existingBalance.totalQuantity) !== null && _c !== void 0 ? _c : 0) + args.quantityDelta;
    if (nextSerializedUnits < 0 ||
        nextNonSerializedUnits < 0 ||
        nextTotalQuantity < 0) {
        throw new Error(`Storage location balance would become negative for ${args.storageLocation}`);
    }
    if (nextSerializedUnits + nextNonSerializedUnits !== nextTotalQuantity) {
        throw new Error(`Storage location balance became inconsistent for ${args.storageLocation}`);
    }
    if (nextTotalQuantity === 0) {
        if (existingBalance) {
            db.prepare(`
          DELETE FROM hq_stock_location_balances
          WHERE balanceId = ?
        `).run(existingBalance.balanceId);
        }
        (0, exports.refreshStockItemLocationSummary)(db, args.stockId);
        return;
    }
    if (existingBalance) {
        db.prepare(`
        UPDATE hq_stock_location_balances
        SET
          totalQuantity = ?,
          serializedUnits = ?,
          nonSerializedUnits = ?,
          lastMovementDate = ?
        WHERE balanceId = ?
      `).run(nextTotalQuantity, nextSerializedUnits, nextNonSerializedUnits, args.movementDate, existingBalance.balanceId);
    }
    else {
        if (args.quantityDelta < 0 ||
            args.serializedDelta < 0 ||
            args.nonSerializedDelta < 0) {
            throw new Error(`Storage location balance was not found for ${args.storageLocation}`);
        }
        db.prepare(`
        INSERT INTO hq_stock_location_balances (
          balanceId,
          stockId,
          storageLocation,
          totalQuantity,
          serializedUnits,
          nonSerializedUnits,
          lastMovementDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(getNextStockLocationBalanceId(db, args.stockId), args.stockId, args.storageLocation, nextTotalQuantity, nextSerializedUnits, nextNonSerializedUnits, args.movementDate);
    }
    (0, exports.refreshStockItemLocationSummary)(db, args.stockId);
};
exports.adjustStockLocationBalance = adjustStockLocationBalance;
