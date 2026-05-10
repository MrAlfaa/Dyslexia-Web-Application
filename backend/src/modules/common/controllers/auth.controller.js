const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/student.model");
const Admin = require("../../admin/models/admin.model");

// 🔹 Generate Token
const generateToken = (user) => {
  const type = user.role === "student" ? "student" : "admin";
  return jwt.sign(
    { id: user._id, role: user.role, type },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// 🟢 Register Student
exports.registerStudent = async (req, res) => {
  try {
    const { fullName, age, email, password, grade } = req.body;

    if (!fullName || !age || !email || !password || !grade) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await Student.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Student already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      fullName,
      age,
      email,
      password: hashedPassword,
      grade,
    });

    res.status(201).json({
      message: "Student registered",
      token: generateToken(student),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Register Admin
exports.registerAdmin = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      fullName,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Admin registered",
      token: generateToken(admin),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔵 Login (Both Student & Admin)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    let user = await Student.findOne({ email });
    if (!user) {
      user = await Admin.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      token: generateToken(user),
      role: user.role,
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.loginStudentByUsername = async (req, res) => {
  try {
    const normalizedUsername = String(req.body.username || "")
      .trim()
      .toLowerCase();

    if (!normalizedUsername) {
      return res.status(400).json({ message: "Student username is required" });
    }

    const student = await Student.findOne({ username: normalizedUsername });
    if (!student || student.accountStatus !== "active") {
      return res.status(401).json({ message: "Student account not found or inactive" });
    }

    const token = jwt.sign(
      { id: student._id, role: "student", type: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      role: "student",
      userId: student._id,
      student: {
        id: student._id,
        fullName: student.fullName,
        username: student.username,
        grade: student.grade,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
