const Student = require("../models/student.model");
const {
  validateProfilePhotoDataUrl,
} = require("../services/profilePhotoValidation.service");

// GET /api/students/profile
exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id).select("-password");
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/students/profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, grade, profilePhoto, gender, school } = req.body;
    const hasProfilePhoto = Object.prototype.hasOwnProperty.call(req.body, "profilePhoto");

    if (hasProfilePhoto) {
      const photoValidation = validateProfilePhotoDataUrl(profilePhoto);
      if (!photoValidation.valid) {
        return res.status(400).json({
          code: "invalid_profile_photo",
          message: photoValidation.reason,
        });
      }
    }

    const profileUpdate = { fullName, grade, gender, school };
    if (hasProfilePhoto && profilePhoto !== undefined) {
      profileUpdate.profilePhoto = profilePhoto;
    }

    const student = await Student.findByIdAndUpdate(
      req.user.id,
      profileUpdate,
      { returnDocument: "after", runValidators: true }
    ).select("-password");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      message: "Profile updated successfully",
      student,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
