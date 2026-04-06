import { Request, Response } from "express";
import { getUsersData } from "../lib/fileData";

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(getUsersData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users" });
  }
};
