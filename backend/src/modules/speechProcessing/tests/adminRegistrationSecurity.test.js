const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPublicGuardianAccount,
} = require("../../admin/services/publicGuardianRegistration.service");
const subscriptionRouter = require("../../subscription/subscription.routes");

test("public registration ignores privileged role and paid plan input", () => {
  const account = buildPublicGuardianAccount({
    fullName: "Guardian One",
    email: "guardian@example.com",
    password: "hash",
    role: "super admin",
    subscriptionPlan: "premium",
  });

  assert.equal(account.role, "school admin");
  assert.equal(account.subscriptionPlan, "individual");
  assert.equal(account.childLimit, 1);
});

test("development plan route ends with isSuperAdmin middleware", () => {
  const route = subscriptionRouter.stack.find(
    (layer) => layer.route?.path === "/me/dev-change-plan"
  );

  assert.equal(route.route.stack.at(-2).handle.name, "isSuperAdmin");
});
