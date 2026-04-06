import { Request, Response } from "express";
import { getDashboardMetricsData } from "../lib/fileData";

export const getDashboardMetrics = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(getDashboardMetricsData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving dashboard metrics" });
  }
};
