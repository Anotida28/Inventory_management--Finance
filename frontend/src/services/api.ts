import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Product {
  productId: string;
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
}

export interface NewProduct {
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
}

export interface SalesSummary {
  salesSummaryId: string;
  totalValue: number;
  changePercentage?: number;
  date: string;
}

export interface PurchaseSummary {
  purchaseSummaryId: string;
  totalPurchased: number;
  changePercentage?: number;
  date: string;
}

export interface ExpenseSummary {
  expenseSummaryId: string;
  totalExpenses: number;
  date: string;
}

export interface ExpenseByCategorySummary {
  expenseByCategoryId: string;
  category: string;
  amount: string;
  date: string;
}

export interface DashboardMetrics {
  popularProducts: Product[];
  salesSummary: SalesSummary[];
  purchaseSummary: PurchaseSummary[];
  expenseSummary: ExpenseSummary[];
  expenseByCategorySummary: ExpenseByCategorySummary[];
}

export interface User {
  userId: string;
  name: string;
  email: string;
}

export interface OperationsOverview {
  receiptsThisMonth: number;
  totalReceivedValue: number;
  hqUnitsOnHand: number;
  serializedUnits: number;
  pendingIssues: number;
  activeSuppliers: number;
  documentsPendingReview: number;
  recentReceipts: ReceivingReceipt[];
  issueOutQueue: IssueRecord[];
  supplierHighlights: Supplier[];
}

export interface ReceivingReceipt {
  receiptId: string;
  receiptType: "Batch" | "Single Item";
  supplierId: string;
  supplierName: string;
  arrivalDate: string;
  signedBy: string;
  receivedBy: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
  documentCount: number;
  documentStatus: "Complete" | "Pending Review" | "Missing";
  status: "Verified" | "Pending Review" | "Logged";
}

export interface HqStockItem {
  stockId: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  serializedUnits: number;
  nonSerializedUnits: number;
  supplierName: string;
  lastArrivalDate: string;
  storageLocation: string;
  status: "Available" | "Reserved" | "Low Stock";
}

export interface IssueRecord {
  issueId: string;
  itemName: string;
  serialNumber: string;
  destinationType: "Branch" | "Person";
  issuedTo: string;
  issuedBy: string;
  address: string;
  issueDate: string;
  attachmentNames: string[];
  notes?: string;
  status: "Issued";
}

export interface NewIssueRecord {
  itemName: string;
  serialNumber: string;
  destinationType: "Branch" | "Person";
  issuedTo: string;
  issuedBy: string;
  address: string;
  issueDate: string;
  attachmentNames?: string[];
  notes?: string;
}

export interface Supplier {
  supplierId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  categoryFocus: string;
  lastDeliveryDate: string;
  activeContracts: number;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL }),
  reducerPath: "api",
  tagTypes: [
    "DashboardMetrics",
    "Products",
    "Users",
    "Expenses",
    "OperationsOverview",
    "ReceivingReceipts",
    "HqStock",
    "Transfers",
    "Suppliers",
  ],
  endpoints: (build) => ({
    getOperationsOverview: build.query<OperationsOverview, void>({
      query: () => "/operations/overview",
      providesTags: ["OperationsOverview"],
    }),
    getReceivingReceipts: build.query<ReceivingReceipt[], void>({
      query: () => "/operations/receipts",
      providesTags: ["ReceivingReceipts"],
    }),
    getHqStock: build.query<HqStockItem[], void>({
      query: () => "/operations/stock",
      providesTags: ["HqStock"],
    }),
    getIssueRecords: build.query<IssueRecord[], void>({
      query: () => "/operations/issues",
      providesTags: ["Transfers"],
    }),
    createIssueRecord: build.mutation<IssueRecord, NewIssueRecord>({
      query: (newIssueRecord) => ({
        url: "/operations/issues",
        method: "POST",
        body: newIssueRecord,
      }),
      invalidatesTags: ["Transfers", "HqStock", "OperationsOverview"],
    }),
    getSuppliers: build.query<Supplier[], void>({
      query: () => "/operations/suppliers",
      providesTags: ["Suppliers"],
    }),
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
      providesTags: ["DashboardMetrics"],
    }),
    getProducts: build.query<Product[], string | void>({
      query: (search) => ({
        url: "/products",
        params: search ? { search } : {},
      }),
      providesTags: ["Products"],
    }),
    createProduct: build.mutation<Product, NewProduct>({
      query: (newProduct) => ({
        url: "/products",
        method: "POST",
        body: newProduct,
      }),
      invalidatesTags: ["Products"],
    }),
    getUsers: build.query<User[], void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),
    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["Expenses"],
    }),
  }),
});

export const {
  useGetOperationsOverviewQuery,
  useGetReceivingReceiptsQuery,
  useGetHqStockQuery,
  useGetIssueRecordsQuery,
  useCreateIssueRecordMutation,
  useGetSuppliersQuery,
  useGetDashboardMetricsQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useGetUsersQuery,
  useGetExpensesByCategoryQuery,
} = api;
