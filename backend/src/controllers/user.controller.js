import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const normalizeUsername = (value = "") => String(value).trim().toLowerCase();

const register = async (req, res) => {
  try {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Name, username/email and password are required."
      });
    }

    if (String(password).length < 6) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Password must be at least 6 characters."
      });
    }

    const normalizedUsername = normalizeUsername(username);

    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return res.status(httpStatus.CONFLICT).json({
        message: "This username/email already exists. Please login."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      username: normalizedUsername,
      password: hashedPassword
    });

    return res.status(httpStatus.CREATED).json({
      message: "Account created successfully. Please login.",
      user: {
        name: user.name,
        username: user.username
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Unable to register user right now."
    });
  }
};

const login = async (req, res) => {
  try {
    const usernameInput = req.body.username || req.body.identifier;
    const { password } = req.body;

    if (!usernameInput || !password) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Username/email and password are required."
      });
    }

    const normalizedUsername = normalizeUsername(usernameInput);

    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: "User not found. Please register first."
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid password."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.token = token;
    await user.save();

    return res.status(httpStatus.OK).json({
      message: "Login successful.",
      token,
      user: {
        name: user.name,
        username: user.username
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Unable to login right now."
    });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Token is required."
      });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid token."
      });
    }

    return res.status(httpStatus.OK).json({
      user: {
        name: user.name,
        username: user.username
      }
    });
  } catch (error) {
    console.error("Current user error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Unable to get user."
    });
  }
};

const addToHistory = async (req, res) => {
  try {
    const token = req.body.token || req.query.token;
    const meetingCode = req.body.meeting_code || req.body.meetingCode || req.body.meetingId;

    if (!token || !meetingCode) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Token and meeting code are required."
      });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid token."
      });
    }

    const meeting = await Meeting.create({
      user_id: user.username,
      meetingCode: String(meetingCode).trim(),
      date: new Date()
    });

    return res.status(httpStatus.CREATED).json({
      message: "Meeting history saved successfully.",
      meeting
    });
  } catch (error) {
    console.error("Add history error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Unable to save meeting history."
    });
  }
};

const getUserHistory = async (req, res) => {
  try {
    const token = req.query.token || req.body.token;

    if (!token) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Token is required."
      });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid token."
      });
    }

    const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });

    return res.status(httpStatus.OK).json(meetings);
  } catch (error) {
    console.error("Get history error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Unable to get meeting history."
    });
  }
};

export {
  register,
  login,
  getCurrentUser,
  addToHistory,
  getUserHistory
};
