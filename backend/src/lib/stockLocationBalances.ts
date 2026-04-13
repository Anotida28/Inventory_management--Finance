import type { DatabaseLike } from "./database";

export type StockLocationBalance = {
  balanceId: string;
  stockId: string;
  storageLocation: string;
  totalQuantity: number;
  serializedUnits: number;
  nonSerializedUnits: number;
  lastMovementDate: string;
};

type AdjustStockLocationBalanceArgs = {
  stockId: string;
  storageLocation: string;
  quantityDelta: number;
  serializedDelta: number;
  nonSerializedDelta: number;
  movementDate: string;
};

const mapStockLocationBalance = (row: any): StockLocationBalance => ({
  balanceId: row.balanceId,
  stockId: row.stockId,
  storageLocation: row.storageLocation,
  totalQuantity: row.totalQuantity,
  serializedUnits: row.serializedUnits,
  nonSerializedUnits: row.nonSerializedUnits,
  lastMovementDate: row.lastMovementDate,
});

const getNextStockLocationBalanceId = (db: DatabaseLike, stockId: string) => {
  const existingCount =
    (
      db
        .prepare(
          `
            SELECT COUNT(*) AS count
            FROM hq_stock_location_balances
            WHERE stockId = ?
          `
        )
        .get(stockId) as { count: number }
    ).count || 0;

  return `${stockId}-LOC-${String(existingCount + 1).padStart(3, "0")}`;
};

export const ensureStockLocationBalanceSchema = (db: DatabaseLike) => {
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

export const getStockLocationBalancesByStockIds = (
  db: DatabaseLike,
  stockIds: string[]
) => {
  const balancesByStockId = new Map<string, StockLocationBalance[]>();

  if (stockIds.length === 0) {
    return balancesByStockId;
  }

  const placeholders = stockIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `
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
      `
    )
    .all(...stockIds);

  rows.forEach((row) => {
    const mappedBalance = mapStockLocationBalance(row);
    const stockBalances = balancesByStockId.get(mappedBalance.stockId) ?? [];

    stockBalances.push(mappedBalance);
    balancesByStockId.set(mappedBalance.stockId, stockBalances);
  });

  return balancesByStockId;
};

export const getStockLocationBalancesByStockId = (
  db: DatabaseLike,
  stockId: string
) => getStockLocationBalancesByStockIds(db, [stockId]).get(stockId) ?? [];

export const getStorageLocationSummary = (
  balances: Pick<StockLocationBalance, "storageLocation">[]
) => {
  if (balances.length === 0) {
    return "Unassigned";
  }

  if (balances.length === 1) {
    return balances[0].storageLocation;
  }

  return `Multiple (${balances.length})`;
};

export const getPrimaryStorageLocation = (
  balances: StockLocationBalance[]
) => {
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

  return sortedBalances[0]?.storageLocation;
};

export const refreshStockItemLocationSummary = (
  db: DatabaseLike,
  stockId: string
) => {
  const balances = getStockLocationBalancesByStockId(db, stockId);
  const nextSummary = getStorageLocationSummary(balances);

  db.prepare(
    `
      UPDATE hq_stock_items
      SET storageLocation = ?
      WHERE stockId = ?
    `
  ).run(nextSummary, stockId);
};

export const adjustStockLocationBalance = (
  db: DatabaseLike,
  args: AdjustStockLocationBalanceArgs
) => {
  const existingBalance = db
    .prepare(
      `
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
      `
    )
    .get(args.stockId, args.storageLocation) as StockLocationBalance | undefined;

  const nextSerializedUnits =
    (existingBalance?.serializedUnits ?? 0) + args.serializedDelta;
  const nextNonSerializedUnits =
    (existingBalance?.nonSerializedUnits ?? 0) + args.nonSerializedDelta;
  const nextTotalQuantity =
    (existingBalance?.totalQuantity ?? 0) + args.quantityDelta;

  if (
    nextSerializedUnits < 0 ||
    nextNonSerializedUnits < 0 ||
    nextTotalQuantity < 0
  ) {
    throw new Error(
      `Storage location balance would become negative for ${args.storageLocation}`
    );
  }

  if (nextSerializedUnits + nextNonSerializedUnits !== nextTotalQuantity) {
    throw new Error(
      `Storage location balance became inconsistent for ${args.storageLocation}`
    );
  }

  if (nextTotalQuantity === 0) {
    if (existingBalance) {
      db.prepare(
        `
          DELETE FROM hq_stock_location_balances
          WHERE balanceId = ?
        `
      ).run(existingBalance.balanceId);
    }

    refreshStockItemLocationSummary(db, args.stockId);
    return;
  }

  if (existingBalance) {
    db.prepare(
      `
        UPDATE hq_stock_location_balances
        SET
          totalQuantity = ?,
          serializedUnits = ?,
          nonSerializedUnits = ?,
          lastMovementDate = ?
        WHERE balanceId = ?
      `
    ).run(
      nextTotalQuantity,
      nextSerializedUnits,
      nextNonSerializedUnits,
      args.movementDate,
      existingBalance.balanceId
    );
  } else {
    if (
      args.quantityDelta < 0 ||
      args.serializedDelta < 0 ||
      args.nonSerializedDelta < 0
    ) {
      throw new Error(
        `Storage location balance was not found for ${args.storageLocation}`
      );
    }

    db.prepare(
      `
        INSERT INTO hq_stock_location_balances (
          balanceId,
          stockId,
          storageLocation,
          totalQuantity,
          serializedUnits,
          nonSerializedUnits,
          lastMovementDate
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      getNextStockLocationBalanceId(db, args.stockId),
      args.stockId,
      args.storageLocation,
      nextTotalQuantity,
      nextSerializedUnits,
      nextNonSerializedUnits,
      args.movementDate
    );
  }

  refreshStockItemLocationSummary(db, args.stockId);
};
