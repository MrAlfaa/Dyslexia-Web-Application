const mongoose = require("mongoose");

const Admin = require("../models/admin.model");
const Student = require("../../common/models/student.model");
const { getPlanLimit } = require("../../subscription/subscription.service");

const ASSIGNABLE_ROLES = ["school admin", "super admin"];

class ChildOwnershipError extends Error {
  constructor(message, { code, statusCode = 400, details } = {}) {
    super(message);
    this.name = "ChildOwnershipError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const assertObjectId = (value, field) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new ChildOwnershipError(`Invalid ${field.replaceAll("_", " ")}.`, {
      code: `invalid_${field}`,
      statusCode: 400,
    });
  }
};

const getDestinationLimit = (guardian) => {
  const configuredLimit = Number(guardian.childLimit);
  if (Number.isInteger(configuredLimit) && configuredLimit >= 0) {
    return configuredLimit;
  }
  return getPlanLimit(guardian.subscriptionPlan);
};

const toPublicGuardian = (guardian) => ({
  id: String(guardian._id),
  fullName: guardian.fullName,
  email: guardian.email,
  role: guardian.role,
  subscriptionStatus: guardian.subscriptionStatus,
});

const toPublicDestination = (guardian) => ({
  id: String(guardian._id),
  fullName: guardian.fullName,
  role: guardian.role,
  subscriptionStatus: guardian.subscriptionStatus,
  childLimit: getDestinationLimit(guardian),
});

const toPublicChild = (child) => {
  const value = typeof child?.toObject === "function" ? child.toObject() : { ...child };
  delete value.password;
  return value;
};

const listAssignableGuardians = async () => {
  const guardians = await Admin.find({
    role: { $in: ASSIGNABLE_ROLES },
    subscriptionStatus: { $ne: "inactive" },
  })
    .select("_id fullName email role subscriptionStatus")
    .sort({ fullName: 1, email: 1 });

  return guardians.map(toPublicGuardian);
};

const repairChildOwnership = async ({ childId, destinationGuardianId }) => {
  assertObjectId(childId, "child_id");
  assertObjectId(destinationGuardianId, "destination_guardian_id");

  const child = await Student.findById(childId).select(
    "_id fullName username accountStatus guardianId createdByAdmin",
  );
  if (!child) {
    throw new ChildOwnershipError("Child not found.", {
      code: "child_not_found",
      statusCode: 404,
    });
  }

  const destination = await Admin.findById(destinationGuardianId).select(
    "_id fullName role subscriptionPlan subscriptionStatus childLimit",
  );
  if (!destination || !ASSIGNABLE_ROLES.includes(destination.role)) {
    throw new ChildOwnershipError("Destination guardian account not found.", {
      code: "destination_not_found",
      statusCode: 404,
    });
  }
  if (destination.subscriptionStatus === "inactive") {
    throw new ChildOwnershipError("Destination guardian account is inactive.", {
      code: "destination_inactive",
      statusCode: 409,
    });
  }

  const destinationId = String(destination._id);
  const isNoOp =
    String(child.guardianId || "") === destinationId &&
    String(child.createdByAdmin || "") === destinationId;

  if (isNoOp) {
    return {
      child: toPublicChild(child),
      destination: toPublicDestination(destination),
      changed: false,
    };
  }

  const childLimit = getDestinationLimit(destination);
  if (child.accountStatus !== "inactive") {
    const activeChildrenUsed = await Student.countDocuments({
      _id: { $ne: childId },
      $or: [
        { guardianId: destinationGuardianId },
        { createdByAdmin: destinationGuardianId },
      ],
      accountStatus: { $ne: "inactive" },
    });

    if (activeChildrenUsed >= childLimit) {
      throw new ChildOwnershipError(
        `Destination guardian has reached the ${childLimit}-child plan limit.`,
        {
          code: "destination_child_limit_reached",
          statusCode: 409,
          details: { childLimit, activeChildrenUsed },
        },
      );
    }
  }

  const updatedChild = await Student.findOneAndUpdate(
    { _id: childId },
    { $set: { guardianId: destinationGuardianId, createdByAdmin: destinationGuardianId } },
    { new: true, runValidators: true },
  ).select("-password");

  if (!updatedChild) {
    throw new ChildOwnershipError("Child not found.", {
      code: "child_not_found",
      statusCode: 404,
    });
  }

  return {
    child: toPublicChild(updatedChild),
    destination: toPublicDestination(destination),
    changed: true,
  };
};

module.exports = {
  ASSIGNABLE_ROLES,
  ChildOwnershipError,
  listAssignableGuardians,
  repairChildOwnership,
};
