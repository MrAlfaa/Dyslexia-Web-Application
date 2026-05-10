const Admin = require("../admin/models/admin.model");
const Student = require("../common/models/student.model");

const PLAN_LIMITS = {
  individual: 1,
  plus: 5,
  premium: 100,
};

const getPlanLimit = (plan = "individual") => PLAN_LIMITS[plan] || PLAN_LIMITS.individual;

const getGuardianChildCount = async (guardianId) =>
  Student.countDocuments({
    $or: [{ guardianId }, { createdByAdmin: guardianId }],
    accountStatus: { $ne: "inactive" },
  });

const ensureGuardianPlanDefaults = async (guardian) => {
  if (!guardian) return null;

  const plan = guardian.subscriptionPlan || "individual";
  const limit = guardian.childLimit || getPlanLimit(plan);
  const needsUpdate =
    guardian.subscriptionPlan !== plan ||
    guardian.childLimit !== limit ||
    !guardian.subscriptionStatus ||
    !guardian.planStartedAt;

  if (!needsUpdate) return guardian;

  guardian.subscriptionPlan = plan;
  guardian.childLimit = limit;
  guardian.subscriptionStatus = guardian.subscriptionStatus || "trial";
  guardian.planStartedAt = guardian.planStartedAt || new Date();
  await guardian.save();
  return guardian;
};

const canAddChild = async (guardianId) => {
  const guardian = await ensureGuardianPlanDefaults(await Admin.findById(guardianId));
  if (!guardian) {
    return { allowed: false, limit: 0, used: 0, message: "Guardian account not found" };
  }

  // TODO: Integrate Stripe/payment gateway later.
  if (guardian.role === "super admin") {
    return {
      allowed: true,
      limit: guardian.childLimit || getPlanLimit(guardian.subscriptionPlan),
      used: await getGuardianChildCount(guardianId),
      guardian,
    };
  }

  const limit = guardian.childLimit || getPlanLimit(guardian.subscriptionPlan);
  const used = await getGuardianChildCount(guardianId);
  const allowed = used < limit;

  return {
    allowed,
    limit,
    used,
    guardian,
    message: allowed
      ? ""
      : `Your current plan allows only ${limit} child/children. Upgrade to add more.`,
  };
};

module.exports = {
  PLAN_LIMITS,
  getPlanLimit,
  getGuardianChildCount,
  canAddChild,
  ensureGuardianPlanDefaults,
};
