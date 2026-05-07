const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/student.model");
const Admin = require("../../admin/models/admin.model");

// 🔹 Generate Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// 🟢 Register Student
exports.registerStudent = async (req, res) => {
  try {
    const { fullName, age, email, password, grade } = req.body;

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

    let user = await Student.findOne({ email });
    if (!user) {
      user = await Admin.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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