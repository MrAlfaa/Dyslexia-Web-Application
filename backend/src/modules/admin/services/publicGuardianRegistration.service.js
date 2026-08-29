const { getPlanLimit } = require("../../subscription/subscription.service");

const buildPublicGuardianAccount = ({ fullName, email, password }) => ({
  fullName: String(fullName).trim(),
  email: String(email).trim().toLowerCase(),
  password,
  role: "school admin",
  subscriptionPlan: "individual",
  subscriptionStatus: "trial",
  childLimit: getPlanLimit("individual"),
  planStartedAt: new Date(),
});

module.exports = { buildPublicGuardianAccount };
