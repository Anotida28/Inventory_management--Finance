"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = exports.getUsers = void 0;
const usersData_1 = require("../lib/usersData");
const getUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json((0, usersData_1.getUsersData)());
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving users" });
    }
});
exports.getUsers = getUsers;
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unexpected server error";
};
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const createdUser = (0, usersData_1.createUserData)({
            username: req.body.username,
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            role: req.body.role,
        }, req.user);
        res.status(201).json(createdUser);
    }
    catch (error) {
        const message = getErrorMessage(error);
        if (message === "Missing required user fields" ||
            message === "A valid email address is required" ||
            message === "Password must be at least 8 characters long" ||
            message.includes("Username must be")) {
            res.status(400).json({ message });
            return;
        }
        if (message === "Username is already in use" ||
            message === "Email is already in use") {
            res.status(409).json({ message });
            return;
        }
        if (message === "Only administrators can create users" ||
            message === "Only super administrators can create super administrators") {
            res.status(403).json({ message });
            return;
        }
        res.status(500).json({ message: "Error creating user" });
    }
});
exports.createUser = createUser;
