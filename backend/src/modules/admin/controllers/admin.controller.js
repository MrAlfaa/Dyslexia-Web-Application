const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const Student = require("../../common/models/student.model");
const WMIdentifyResult = require("../../workingMemory/models/workingMemoryIdentify.model");
const PAIdentifyResult = require("../../phonologicalAwareness/models/phonologicalIdentify.model");

// Register Admin
exports.registerAdmin = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    if (!["school admin", "super admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: "Admin with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      fullName,
      email,
      password: hashedPassword,
      role,
    });

    await admin.save();

    res.status(201).json({ success: true, message: "Admin registered successfully" });
  } catch (error) {
    console.error("Admin register error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Login Admin
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get All Students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().select("-password");
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Student (Super Admin only)
exports.superAdminUpdateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prevent password update through this endpoint unless explicitly handled
    if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const updatedStudent = await Student.findByIdAndUpdate(id, updateData, { new: true }).select("-password");
    
    if (!updatedStudent) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.status(200).json({ success: true, data: updatedStudent, message: "Student updated successfully" });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete Student (Super Admin only)
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Student.findByIdAndDelete(id);
    
    if (!deletedStudent) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.status(200).json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all Working Memory Identify Results
exports.getWMIdentifyResults = async (req, res) => {
  try {
    const results = await WMIdentifyResult.find()
      .populate({
        path: "studentId",
        select: "fullName email",
        model: "Student"
      })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Get WM identify results error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get all Phonological Awareness Identify Results
exports.getPAIdentifyResults = async (req, res) => {
  try {
    const results = await PAIdentifyResult.find()
      .populate({
        path: "studentId",
        select: "fullName email",
        model: "Student"
      })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Get PA identify results error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
