"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardMetricsData = exports.getExpensesByCategoryData = exports.getUsersData = exports.createProductData = exports.getProductsData = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const seedDataDirectory = path_1.default.join(process.cwd(), "prisma", "seedData");
const readJsonFile = (fileName) => {
    const filePath = path_1.default.join(seedDataDirectory, fileName);
    const fileContents = fs_1.default.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContents);
};
let productsCache = null;
const getProductsCache = () => {
    if (!productsCache) {
        productsCache = readJsonFile("products.json");
    }
    return productsCache;
};
const sortByDateDescending = (items) => {
    return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
const getProductsData = (search) => {
    const normalizedSearch = search === null || search === void 0 ? void 0 : search.trim().toLowerCase();
    return getProductsCache().filter((product) => {
        if (!normalizedSearch)
            return true;
        return product.name.toLowerCase().includes(normalizedSearch);
    });
};
exports.getProductsData = getProductsData;
const createProductData = (product) => {
    var _a;
    const newProduct = Object.assign(Object.assign({}, product), { rating: (_a = product.rating) !== null && _a !== void 0 ? _a : 0 });
    getProductsCache().push(newProduct);
    return newProduct;
};
exports.createProductData = createProductData;
const getUsersData = () => {
    return readJsonFile("users.json");
};
exports.getUsersData = getUsersData;
const getExpensesByCategoryData = () => {
    return sortByDateDescending(readJsonFile("expenseByCategory.json")).map((item) => (Object.assign(Object.assign({}, item), { amount: item.amount.toString() })));
};
exports.getExpensesByCategoryData = getExpensesByCategoryData;
const getDashboardMetricsData = () => {
    const popularProducts = [...getProductsCache()]
        .sort((a, b) => b.stockQuantity - a.stockQuantity)
        .slice(0, 15);
    const salesSummary = sortByDateDescending(readJsonFile("salesSummary.json")).slice(0, 5);
    const purchaseSummary = sortByDateDescending(readJsonFile("purchaseSummary.json")).slice(0, 5);
    const expenseSummary = sortByDateDescending(readJsonFile("expenseSummary.json")).slice(0, 5);
    const expenseByCategorySummary = sortByDateDescending(readJsonFile("expenseByCategory.json"))
        .slice(0, 5)
        .map((item) => (Object.assign(Object.assign({}, item), { amount: item.amount.toString() })));
    return {
        popularProducts,
        salesSummary,
        purchaseSummary,
        expenseSummary,
        expenseByCategorySummary,
    };
};
exports.getDashboardMetricsData = getDashboardMetricsData;
