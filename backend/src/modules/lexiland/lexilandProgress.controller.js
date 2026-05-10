const Student = require("../common/models/student.model");

const isSuperAdmin = (req) => req.user?.type === "admin" && req.user?.role === "super admin";

const canAccessChild = (req, child) => {
  if (!child) return false;
  if (req.user?.type === "student") return String(child._id) === String(req.user.id);
  if (isSuperAdmin(req)) return true;
  return (
    String(child.guardianId || "") === String(req.user.id) ||
    String(child.createdByAdmin || "") === String(req.user.id)
  );
};

const getChildOr403 = async (req, childId) => {
  const child = await Student.findById(childId).select("-password");
  if (!child) return { status: 404, message: "Child not found" };
  if (!canAccessChild(req, child)) return { status: 403, message: "Access denied" };
  return { child };
};

exports.getProgress = async (req, res) => {
  try {
    const result = await getChildOr403(req, req.params.childId);
    if (!result.child) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      data: {
        childId: result.child._id,
        fullName: result.child.fullName,
        username: result.child.username,
        grade: result.child.grade,
        lexilandProgress: result.child.lexilandProgress,
      },
    });
  } catch (error) {
    console.error("Get LexiLand progress error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.recalculateProgress = async (req, res) => {
  try {
    const result = await getChildOr403(req, req.params.childId);
    if (!result.child) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    const child = result.child;
    const progress = child.lexilandProgress || {};
    const speechStatus = progress.speech?.identificationStatus || "not_started";

    // TODO: Combine Working Memory, Phonological Awareness, Reading Processing, and Speech outputs.
    const knownStatuses = [speechStatus].filter(Boolean);
    const anyStarted = knownStatuses.some((status) => status !== "not_started");
    const allKnownCompleted =
      knownStatuses.length > 0 && knownStatuses.every((status) => status === "completed");

    child.lexilandProgress = {
      ...progress,
      overallIdentificationStatus: allKnownCompleted
        ? "completed"
        : anyStarted
          ? "in_progress"
          : "not_started",
      improvementUnlocked: allKnownCompleted,
      speech: {
        ...(progress.speech || {}),
        improvementUnlocked: allKnownCompleted,
      },
    };

    await child.save();

    res.json({
      success: true,
      message: "LexiLand progress recalculated",
      data: child.lexilandProgress,
    });
  } catch (error) {
    console.error("Recalculate LexiLand progress error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
