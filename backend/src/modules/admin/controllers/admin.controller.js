const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const Student = require("../../common/models/student.model");
const WMIdentifyResult = require("../../workingMemory/models/workingMemoryIdentify.model");
const PAIdentifyResult = require("../../phonologicalAwareness/models/phonologicalIdentify.model");
const {
  canAddChild,
  ensureGuardianPlanDefaults,
} = require("../../subscription/subscription.service");
const {
  buildPublicGuardianAccount,
} = require("../services/publicGuardianRegistration.service");

const isSuperAdminRequest = (req) => req.user?.role === "super admin";

const getChildScope = (req) =>
  isSuperAdminRequest(req)
    ? {}
    : { $or: [{ guardianId: req.user.id }, { createdByAdmin: req.user.id }] };

// Register Admin
exports.registerAdmin = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: "Admin with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin(buildPublicGuardianAccount({
      fullName,
      email,
      password: hashedPassword,
    }));

    await admin.save();

    res.status(201).json({ success: true, message: "Guardian registered successfully" });
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

    let admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    admin = await ensureGuardianPlanDefaults(admin);

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
        subscriptionPlan: admin.subscriptionPlan,
        subscriptionStatus: admin.subscriptionStatus,
        childLimit: admin.childLimit,
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
    const students = await Student.find(getChildScope(req))
      .select("-password")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.createStudentByAdmin = async (req, res) => {
  try {
    const { fullName, username, age, grade, gender, school, notes } = req.body;
    const normalizedUsername = String(username || "").trim().toLowerCase();
    const normalizedGrade = String(grade || "").trim();

    if (!fullName || !normalizedUsername || !age || !normalizedGrade) {
      return res.status(400).json({
        success: false,
        message: "Full name, username, age, and grade are required",
      });
    }

    if (!["2", "3", "4", "5"].includes(normalizedGrade)) {
      return res.status(400).json({ success: false, message: "Invalid grade" });
    }

    const existingStudent = await Student.findOne({ username: normalizedUsername });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Student username already exists",
      });
    }

    const planCheck = await canAddChild(req.user.id);
    if (!planCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: planCheck.message,
        data: { childLimit: planCheck.limit, childrenUsed: planCheck.used },
      });
    }

    const student = await Student.create({
      fullName: String(fullName).trim(),
      username: normalizedUsername,
      age,
      grade: normalizedGrade,
      gender: gender || "",
      school: school ? String(school).trim() : "",
      createdByAdmin: req.user.id,
      guardianId: req.user.id,
      notes: notes ? String(notes).trim() : "",
      accountStatus: "active",
    });

    const studentData = student.toObject();
    delete studentData.password;

    res.status(201).json({
      success: true,
      message: "Student account created",
      data: studentData,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Student username already exists",
      });
    }

    console.error("Create student by admin error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateStudentScoped = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.username) {
      updateData.username = String(updateData.username).trim().toLowerCase();
      const existingStudent = await Student.findOne({
        username: updateData.username,
        _id: { $ne: id },
      });

      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: "Student username already exists",
        });
      }
    }

    if (updateData.email === "") {
      delete updateData.email;
    }

    if (updateData.grade && !["2", "3", "4", "5"].includes(String(updateData.grade))) {
      return res.status(400).json({ success: false, message: "Invalid grade" });
    }

    const existing = await Student.findOne({ _id: id, ...getChildScope(req) });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Child not found" });
    }

    // Prevent password update through this endpoint unless explicitly handled
    if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    const allowedFields = [
      "fullName",
      "username",
      "age",
      "grade",
      "gender",
      "school",
      "notes",
      "email",
      "accountStatus",
      "profilePhoto",
    ];
    const safeUpdate = {};
    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updateData, field)) {
        safeUpdate[field] = updateData[field];
      }
    });

    const updatedStudent = await Student.findByIdAndUpdate(id, safeUpdate, {
      new: true,
      runValidators: true,
    }).select("-password");
    
    if (!updatedStudent) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.status(200).json({ success: true, data: updatedStudent, message: "Student updated successfully" });
  } catch (error) {
    console.error("Update student error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deactivateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedStudent = await Student.findOneAndUpdate(
      { _id: id, ...getChildScope(req) },
      { accountStatus: "inactive" },
      { new: true }
    ).select("-password");
    
    if (!deletedStudent) {
      return res.status(404).json({ success: false, message: "Child not found" });
    }

    res.status(200).json({ success: true, message: "Child deactivated successfully", data: deletedStudent });
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
