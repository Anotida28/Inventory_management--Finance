import type {
  HqStockItem,
  IssueRecord,
  ReceivingReceipt,
  Supplier,
} from "@/services/api";

export type GlobalSearchResultType = "receipt" | "stock" | "issue" | "supplier";

export type GlobalSearchResult = {
  description: string;
  href: string;
  id: string;
  label: string;
  matchText: string;
  title: string;
  type: GlobalSearchResultType;
};

type SearchSourceData = {
  issues?: IssueRecord[];
  query: string;
  receipts?: ReceivingReceipt[];
  stock?: HqStockItem[];
  suppliers?: Supplier[];
};

const normalizeSearchText = (value: string) => value.trim().toLowerCase();

const encodeSearchHref = (pathname: string, params: Record<string, string>) => {
  const searchParams = new URLSearchParams(params);
  return `${pathname}?${searchParams.toString()}`;
};

const getSearchScore = (values: string[], query: string) => {
  let score = Number.POSITIVE_INFINITY;

  values.forEach((value) => {
    const normalizedValue = value.toLowerCase();

    if (normalizedValue === query) {
      score = Math.min(score, 0);
      return;
    }

    if (normalizedValue.startsWith(query)) {
      score = Math.min(score, 1);
      return;
    }

    if (normalizedValue.includes(query)) {
      score = Math.min(score, 2);
    }
  });

  return score;
};

export const buildGlobalSearchResults = ({
  query,
  receipts = [],
  stock = [],
  issues = [],
  suppliers = [],
}: SearchSourceData): GlobalSearchResult[] => {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  const results: Array<GlobalSearchResult & { score: number }> = [];

  receipts.forEach((receipt) => {
    const searchValues = [
      receipt.receiptId,
      receipt.supplierName,
      receipt.receivedBy,
      receipt.signedBy,
      receipt.receiptType,
      receipt.documentStatus,
      receipt.status,
    ];
    const score = getSearchScore(searchValues, normalizedQuery);

    if (!Number.isFinite(score)) {
      return;
    }

    results.push({
      id: receipt.receiptId,
      type: "receipt",
      label: "Receipt",
      title: receipt.receiptId,
      description: `${receipt.supplierName} | ${receipt.arrivalDate} | ${receipt.documentStatus}`,
      matchText: `${receipt.receiptType} receipt`,
      href: encodeSearchHref("/receiving", {
        receiptId: receipt.receiptId,
        search: query.trim(),
      }),
      score,
    });
  });

  stock.forEach((item) => {
    const searchValues = [
      item.stockId,
      item.itemName,
      item.category,
      item.supplierName,
      item.storageLocation,
      ...item.storageLocations,
    ];
    const score = getSearchScore(searchValues, normalizedQuery);

    if (!Number.isFinite(score)) {
      return;
    }

    results.push({
      id: item.stockId,
      type: "stock",
      label: "HQ Stock",
      title: item.itemName,
      description: `${item.stockId} | ${item.supplierName} | ${item.totalQuantity} units`,
      matchText: item.storageLocation,
      href: encodeSearchHref("/inventory", {
        stockId: item.stockId,
        search: query.trim(),
      }),
      score,
    });
  });

  issues.forEach((issue) => {
    const searchValues = [
      issue.issueId,
      issue.itemName,
      issue.serialNumber,
      issue.issuedTo,
      issue.issuedBy,
      issue.status,
      issue.address,
      issue.branchId ?? "",
    ];
    const score = getSearchScore(searchValues, normalizedQuery);

    if (!Number.isFinite(score)) {
      return;
    }

    results.push({
      id: issue.issueId,
      type: "issue",
      label: "Issue Out",
      title: issue.issueId,
      description: `${issue.itemName} | ${issue.issuedTo} | ${issue.status}`,
      matchText: issue.serialNumber,
      href: encodeSearchHref("/issue-out", {
        issueId: issue.issueId,
        search: query.trim(),
      }),
      score,
    });
  });

  suppliers.forEach((supplier) => {
    const searchValues = [
      supplier.supplierId,
      supplier.name,
      supplier.categoryFocus,
      supplier.contactPerson,
      supplier.phone,
      supplier.email,
    ];
    const score = getSearchScore(searchValues, normalizedQuery);

    if (!Number.isFinite(score)) {
      return;
    }

    results.push({
      id: supplier.supplierId,
      type: "supplier",
      label: "Supplier",
      title: supplier.name,
      description: `${supplier.categoryFocus} | ${supplier.contactPerson}`,
      matchText: supplier.email,
      href: encodeSearchHref("/suppliers", {
        supplierId: supplier.supplierId,
        search: query.trim(),
      }),
      score,
    });
  });

  return results
    .sort((left, right) => left.score - right.score || left.title.localeCompare(right.title))
    .slice(0, 8)
    .map(({ score: _score, ...result }) => result);
};
