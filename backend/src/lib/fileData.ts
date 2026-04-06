import fs from "fs";
import path from "path";

type Product = {
  productId: string;
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
};

type SalesSummary = {
  salesSummaryId: string;
  totalValue: number;
  changePercentage?: number;
  date: string;
};

type PurchaseSummary = {
  purchaseSummaryId: string;
  totalPurchased: number;
  changePercentage?: number;
  date: string;
};

type ExpenseSummary = {
  expenseSummaryId: string;
  totalExpenses: number;
  date: string;
};

type ExpenseByCategory = {
  expenseByCategoryId: string;
  expenseSummaryId: string;
  category: string;
  amount: number;
  date: string;
};

type User = {
  userId: string;
  name: string;
  email: string;
};

const seedDataDirectory = path.join(process.cwd(), "prisma", "seedData");

const readJsonFile = <T>(fileName: string): T => {
  const filePath = path.join(seedDataDirectory, fileName);
  const fileContents = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContents) as T;
};

let productsCache: Product[] | null = null;

const getProductsCache = () => {
  if (!productsCache) {
    productsCache = readJsonFile<Product[]>("products.json");
  }

  return productsCache;
};

const sortByDateDescending = <T extends { date: string }>(items: T[]) => {
  return [...items].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

export const getProductsData = (search?: string) => {
  const normalizedSearch = search?.trim().toLowerCase();

  return getProductsCache().filter((product) => {
    if (!normalizedSearch) return true;
    return product.name.toLowerCase().includes(normalizedSearch);
  });
};

export const createProductData = (product: Product) => {
  const newProduct = {
    ...product,
    rating: product.rating ?? 0,
  };

  getProductsCache().push(newProduct);
  return newProduct;
};

export const getUsersData = () => {
  return readJsonFile<User[]>("users.json");
};

export const getExpensesByCategoryData = () => {
  return sortByDateDescending(
    readJsonFile<ExpenseByCategory[]>("expenseByCategory.json")
  ).map((item) => ({
    ...item,
    amount: item.amount.toString(),
  }));
};

export const getDashboardMetricsData = () => {
  const popularProducts = [...getProductsCache()]
    .sort((a, b) => b.stockQuantity - a.stockQuantity)
    .slice(0, 15);
  const salesSummary = sortByDateDescending(
    readJsonFile<SalesSummary[]>("salesSummary.json")
  ).slice(0, 5);
  const purchaseSummary = sortByDateDescending(
    readJsonFile<PurchaseSummary[]>("purchaseSummary.json")
  ).slice(0, 5);
  const expenseSummary = sortByDateDescending(
    readJsonFile<ExpenseSummary[]>("expenseSummary.json")
  ).slice(0, 5);
  const expenseByCategorySummary = sortByDateDescending(
    readJsonFile<ExpenseByCategory[]>("expenseByCategory.json")
  )
    .slice(0, 5)
    .map((item) => ({
      ...item,
      amount: item.amount.toString(),
    }));

  return {
    popularProducts,
    salesSummary,
    purchaseSummary,
    expenseSummary,
    expenseByCategorySummary,
  };
};
