import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import morgan from "morgan";

// Local Imports
import User from "./models/User.js";
import Task from "./models/Task.js";
import checkAuth from "./middleware/auth.js";

dotenv.config();

const app = express();

// --- PRODUCTION MIDDLEWARE ---
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));
app.use("/uploads", express.static("uploads"));

// --- FILE UPLOAD CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// --- AUTH ROUTES ---

// 1. Register
app.post("/user/register", upload.single("file"), async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res
        .status(400)
        .json({ status: "Fail", message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000);

    const user = new User({
      ...req.body,
      password: hashedPassword,
      activationCode: code,
      image: req.file ? req.file.filename : null,
    });

    await user.save();
    res
      .status(201)
      .json({ status: "Success", message: "User Registered", code });
  } catch (err) {
    res.status(500).json({ status: "Error", message: err.message });
  }
});

// 2. Activate User
app.post("/user/activate-user", async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOneAndUpdate(
      { email, activationCode: code },
      { isVerified: true },
      { new: true }
    );
    if (!user)
      return res.status(400).json({ status: "Fail", message: "Invalid code" });
    res.json({ status: "Success", message: "Account activated" });
  } catch (err) {
    res.status(500).json({ status: "Error", message: err.message });
  }
});

// 3. Login
app.post("/user/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user && (await bcrypt.compare(req.body.password, user.password))) {
      const token = jwt.sign(
        { _id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        status: "Success",
        message: "Successfully logged in",
        data: { user, token },
      });
    } else {
      res.status(401).json({ status: "Fail", message: "Invalid credentials" });
    }
  } catch (err) {
    res.status(500).json({ status: "Error", message: err.message });
  }
});

// 4. Update Profile
app.patch(
  "/user/update-profile",
  checkAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      const updates = { ...req.body };
      if (req.file) updates.image = req.file.filename;
      if (req.body.password)
        updates.password = await bcrypt.hash(req.body.password, 10);

      const updatedUser = await User.findByIdAndUpdate(
        req.userData._id,
        updates,
        { new: true }
      );
      res
        .status(200)
        .json({
          status: "Success",
          message: "Profile update successful",
          data: updatedUser,
        });
    } catch (err) {
      res.status(500).json({ status: "Error", message: err.message });
    }
  }
);

// 5. My Profile
app.get("/user/my-profile", checkAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userData._id);
    res.json({ status: "Success", message: "Found profile", data: user });
  } catch (err) {
    res.status(500).json({ status: "Error", message: err.message });
  }
});

// --- TASK ROUTES ---

// 6. Create Task
app.post("/task/create-task", checkAuth, async (req, res) => {
  try {
    const task = new Task({ ...req.body, creator_email: req.userData.email });
    await task.save();
    res
      .status(201)
      .json({
        status: "Success",
        message: "Task created successful",
        data: task,
      });
  } catch (err) {
    res.status(400).json({ status: "Error", message: err.message });
  }
});

// 7. Get Single Task
app.get("/task/get-task/:id", checkAuth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      creator_email: req.userData.email,
    });
    if (!task)
      return res
        .status(404)
        .json({ status: "Fail", message: "Task not found" });
    res
      .status(200)
      .json({ status: "Success", message: "Task found", data: task });
  } catch (err) {
    res.status(500).json({ status: "Error", message: err.message });
  }
});

// 8. Get All Tasks
app.get("/task/get-all-task", checkAuth, async (req, res) => {
  try {
    const tasks = await Task.find({ creator_email: req.userData.email });
    res.json({
      status: "Success",
      message: "Your Tasks found",
      data: { count: tasks.length, myTasks: tasks },
    });
  } catch (err) {
    res.status(500).json({ status: "Error", message: err.message });
  }
});

// 9. Delete Task
app.delete("/task/delete-task/:id", checkAuth, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      creator_email: req.userData.email,
    });
    if (!task)
      return res
        .status(404)
        .json({ status: "Fail", message: "Task not found or unauthorized" });
    res.json({ status: "Success", message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ status: "Error", message: err.message });
  }
});

// --- DATABASE & SERVER ---
const PORT = process.env.PORT || 8000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error("❌ DB Connection Error:", err));
g