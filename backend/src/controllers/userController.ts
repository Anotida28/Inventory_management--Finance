import { Request, Response } from "express";
import { createUserData, getUsersData } from "../lib/usersData";
import { AuthenticatedRequest } from "../middleware/authMiddleware";

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json(getUsersData());
  } catch (error) {
    res.status(500).json({ message: "Error retrieving users" });
  }
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected server error";
};

export const createUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const createdUser = createUserData(
      {
        username: req.body.username,
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        role: req.body.role,
      },
      req.user
    );

    res.status(201).json(createdUser);
  } catch (error) {
    const message = getErrorMessage(error);

    if (
      message === "Missing required user fields" ||
      message === "A valid email address is required" ||
      message === "Password must be at least 8 characters long" ||
      message.includes("Username must be")
    ) {
      res.status(400).json({ message });
      return;
    }

    if (
      message === "Username is already in use" ||
      message === "Email is already in use"
    ) {
      res.status(409).json({ message });
      return;
    }

    if (
      message === "Only administrators can create users" ||
      message === "Only super administrators can create super administrators"
    ) {
      res.status(403).json({ message });
      return;
    }

    res.status(500).json({ message: "Error creating user" });
  }
};
