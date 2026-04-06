import { Request, Response } from "express";
import { getExpensesByCategoryData } from "../lib/fileData";

export const getExpensesByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    res.json(getExpensesByCategoryData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving expenses by category" });
  }
};
