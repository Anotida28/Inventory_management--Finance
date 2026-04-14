"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
/* ROUTE IMPORTS */
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const operationsRoutes_1 = __importDefault(require("./routes/operationsRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const database_1 = require("./lib/database");
const getRequiredEnv = (name) => {
    var _a;
    const value = (_a = process.env[name]) === null || _a === void 0 ? void 0 : _a.trim();
    if (!value) {
        throw new Error(`${name} must be set before the server starts`);
    }
    return value;
};
const resolveAllowedOrigins = () => {
    const configuredOrigins = (process.env.CORS_ORIGIN || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    if (configuredOrigins.length > 0) {
        return configuredOrigins;
    }
    return ["http://localhost:3000", "http://127.0.0.1:3000"];
};
getRequiredEnv("JWT_SECRET");
const allowedOrigins = resolveAllowedOrigins();
const corsOptions = {
    credentials: true,
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Origin not allowed by CORS"));
    },
};
/* CONFIGURATIONS */
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, helmet_1.default)());
app.use(helmet_1.default.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use((0, morgan_1.default)("common"));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)(corsOptions));
/* ROUTES */
app.use("/api/auth", authRoutes_1.default);
app.use("/api/operations", authMiddleware_1.requireAuth, operationsRoutes_1.default);
app.use("/api/users", authMiddleware_1.requireAuth, userRoutes_1.default);
app.use("/operations", authMiddleware_1.requireAuth, operationsRoutes_1.default);
app.use("/users", authMiddleware_1.requireAuth, userRoutes_1.default);
/* SERVER */
const port = Number(process.env.PORT) || 3001;
app.listen(port, "0.0.0.0", () => {
    const dbInfo = (0, database_1.getDatabaseRuntimeInfo)();
    const schemaSegment = dbInfo.schema ? `, schema=${dbInfo.schema}` : "";
    const hostSegment = dbInfo.host ? dbInfo.host : "unknown-host";
    const portSegment = dbInfo.port ? dbInfo.port : "unknown-port";
    const databaseSegment = dbInfo.database ? dbInfo.database : "unknown-database";
    console.log(`Database runtime: dialect=${dbInfo.dialect}, host=${hostSegment}, port=${portSegment}, database=${databaseSegment}${schemaSegment}`);
    console.log(`Server running on port ${port}`);
});
