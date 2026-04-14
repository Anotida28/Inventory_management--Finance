import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
/* ROUTE IMPORTS */
import authRoutes from "./routes/authRoutes";
import operationsRoutes from "./routes/operationsRoutes";
import userRoutes from "./routes/userRoutes";
import { requireAuth } from "./middleware/authMiddleware";
import { getDatabaseRuntimeInfo } from "./lib/database";

/* CONFIGURATIONS */
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

/* ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/operations", requireAuth, operationsRoutes);
app.use("/api/users", requireAuth, userRoutes);

app.use("/operations", requireAuth, operationsRoutes);
app.use("/users", requireAuth, userRoutes);

/* SERVER */
const port = Number(process.env.PORT) || 3001;
app.listen(port, "0.0.0.0", () => {
  const dbInfo = getDatabaseRuntimeInfo();
  const schemaSegment = dbInfo.schema ? `, schema=${dbInfo.schema}` : "";
  const hostSegment = dbInfo.host ? dbInfo.host : "unknown-host";
  const portSegment = dbInfo.port ? dbInfo.port : "unknown-port";
  const databaseSegment = dbInfo.database ? dbInfo.database : "unknown-database";

  console.log(
    `Database runtime: dialect=${dbInfo.dialect}, host=${hostSegment}, port=${portSegment}, database=${databaseSegment}${schemaSegment}`
  );
  console.log(`Server running on port ${port}`);
});
