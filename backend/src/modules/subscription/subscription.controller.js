const Admin = require("../admin/models/admin.model");
const {
  getPlanLimit,
  getGuardianChildCount,
  ensureGuardianPlanDefaults,
} = require("./subscription.service");

const PLAN_LABELS = {
  individual: "Individual",
  plus: "Plus",
  premium: "Premium",
};

exports.getMySubscription = async (req, res) => {
  try {
    const guardian = await ensureGuardianPlanDefaults(await Admin.findById(req.user.id).select("-password"));
    if (!guardian) {
      return res.status(404).json({ success: false, message: "Guardian account not found" });
    }

    const childrenUsed = await getGuardianChildCount(req.user.id);

    res.json({
      success: true,
      data: {
        subscriptionPlan: guardian.subscriptionPlan,
        subscriptionLabel: PLAN_LABELS[guardian.subscriptionPlan] || "Individual",
        subscriptionStatus: guardian.subscriptionStatus,
        childLimit: guardian.childLimit || getPlanLimit(guardian.subscriptionPlan),
        childrenUsed,
        planStartedAt: guardian.planStartedAt,
        planExpiresAt: guardian.planExpiresAt,
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.devChangePlan = async (req, res) => {
  try {
    const plan = String(req.body.subscriptionPlan || "").trim().toLowerCase();
    if (!["individual", "plus", "premium"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid subscription plan" });
    }

    const guardian = await Admin.findByIdAndUpdate(
      req.user.id,
      {
        subscriptionPlan: plan,
        subscriptionStatus: "active",
        childLimit: getPlanLimit(plan),
        planStartedAt: new Date(),
      },
      { new: true }
    ).select("-password");

    if (!guardian) {
      return res.status(404).json({ success: false, message: "Guardian account not found" });
    }

    const childrenUsed = await getGuardianChildCount(req.user.id);
    res.json({
      success: true,
      message: "Development plan updated",
      data: {
        subscriptionPlan: guardian.subscriptionPlan,
        subscriptionLabel: PLAN_LABELS[guardian.subscriptionPlan],
        subscriptionStatus: guardian.subscriptionStatus,
        childLimit: guardian.childLimit,
        childrenUsed,
      },
    });
  } catch (error) {
    console.error("Change subscription plan error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
