const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const Admin = require("../../admin/models/admin.model");
const Student = require("../../common/models/student.model");
const adminController = require("../../admin/controllers/admin.controller");
const adminRouter = require("../../admin/routes/admin.routes");
const { verifyToken, isSuperAdmin } = require("../../../middleware/auth.middleware");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

const objectId = () => new mongoose.Types.ObjectId().toString();

const loadService = () =>
  require("../../admin/services/childOwnership.service");

test("ownership routes require super-admin middleware", () => {
  const guardianRoute = adminRouter.stack.find(
    (layer) => layer.route?.path === "/guardians" && layer.route?.methods?.get,
  );
  const repairRoute = adminRouter.stack.find(
    (layer) => layer.route?.path === "/students/:id/owner" && layer.route?.methods?.put,
  );

  assert.ok(guardianRoute);
  assert.ok(repairRoute);
  assert.deepEqual(
    guardianRoute.route.stack.slice(-3, -1).map((layer) => layer.handle),
    [verifyToken, isSuperAdmin],
  );
  assert.deepEqual(
    repairRoute.route.stack.slice(-3, -1).map((layer) => layer.handle),
    [verifyToken, isSuperAdmin],
  );
});

test("normal guardians receive 403 from the ownership authorization gate", () => {
  const response = createResponse();
  let nextCalled = false;

  isSuperAdmin(
    { user: { id: objectId(), type: "admin", role: "school admin" } },
    response,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(response.statusCode, 403);
  assert.equal(nextCalled, false);
});

test("student listing preserves its data array and denies repair capability to guardians", async () => {
  const originalFind = Student.find;
  let capturedScope;
  Student.find = (scope) => {
    capturedScope = scope;
    return {
      select() {
        return this;
      },
      sort: async () => [{ _id: objectId(), fullName: "Child One" }],
    };
  };

  try {
    const response = createResponse();
    await adminController.getAllStudents(
      { user: { id: objectId(), type: "admin", role: "school admin" } },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(Array.isArray(response.body.data), true);
    assert.deepEqual(response.body.viewer, { canRepairChildOwnership: false });
    assert.equal(Array.isArray(capturedScope.$or), true);
  } finally {
    Student.find = originalFind;
  }
});

test("student listing grants repair capability only from the authenticated super-admin role", async () => {
  const originalFind = Student.find;
  let capturedScope;
  Student.find = (scope) => {
    capturedScope = scope;
    return {
      select() {
        return this;
      },
      sort: async () => [],
    };
  };

  try {
    const response = createResponse();
    await adminController.getAllStudents(
      { user: { id: objectId(), type: "admin", role: "super admin" } },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.data, []);
    assert.deepEqual(response.body.viewer, { canRepairChildOwnership: true });
    assert.deepEqual(capturedScope, {});
  } finally {
    Student.find = originalFind;
  }
});

test("ownership repair rejects invalid Mongo IDs before database access", async () => {
  const { repairChildOwnership } = loadService();
  const originalFindById = Student.findById;
  let databaseCalled = false;
  Student.findById = () => {
    databaseCalled = true;
    throw new Error("database should not be called");
  };

  try {
    await assert.rejects(
      repairChildOwnership({ childId: "not-an-id", destinationGuardianId: objectId() }),
      (error) => error.code === "invalid_child_id" && error.statusCode === 400,
    );
    assert.equal(databaseCalled, false);
  } finally {
    Student.findById = originalFindById;
  }
});

test("ownership repair rejects inactive destination accounts", async () => {
  const { repairChildOwnership } = loadService();
  const childId = objectId();
  const guardianId = objectId();
  const originalStudentFindById = Student.findById;
  const originalAdminFindById = Admin.findById;

  Student.findById = () => ({
    select: async () => ({ _id: childId, fullName: "Child One", accountStatus: "active" }),
  });
  Admin.findById = () => ({
    select: async () => ({
      _id: guardianId,
      role: "school admin",
      subscriptionStatus: "inactive",
      childLimit: 1,
    }),
  });

  try {
    await assert.rejects(
      repairChildOwnership({ childId, destinationGuardianId: guardianId }),
      (error) => error.code === "destination_inactive" && error.statusCode === 409,
    );
  } finally {
    Student.findById = originalStudentFindById;
    Admin.findById = originalAdminFindById;
  }
});

test("ownership repair rejects an active child when destination plan capacity is full", async () => {
  const { repairChildOwnership } = loadService();
  const childId = objectId();
  const guardianId = objectId();
  const originalStudentFindById = Student.findById;
  const originalAdminFindById = Admin.findById;
  const originalCountDocuments = Student.countDocuments;

  Student.findById = () => ({
    select: async () => ({ _id: childId, accountStatus: "active" }),
  });
  Admin.findById = () => ({
    select: async () => ({
      _id: guardianId,
      role: "school admin",
      subscriptionPlan: "individual",
      subscriptionStatus: "active",
      childLimit: 1,
    }),
  });
  Student.countDocuments = async () => 1;

  try {
    await assert.rejects(
      repairChildOwnership({ childId, destinationGuardianId: guardianId }),
      (error) =>
        error.code === "destination_child_limit_reached" &&
        error.statusCode === 409 &&
        error.details?.childLimit === 1,
    );
  } finally {
    Student.findById = originalStudentFindById;
    Admin.findById = originalAdminFindById;
    Student.countDocuments = originalCountDocuments;
  }
});

test("ownership repair treats an already consistent owner as a no-op without using capacity", async () => {
  const { repairChildOwnership } = loadService();
  const childId = objectId();
  const guardianId = objectId();
  const originals = {
    studentFindById: Student.findById,
    adminFindById: Admin.findById,
    countDocuments: Student.countDocuments,
    findOneAndUpdate: Student.findOneAndUpdate,
  };
  let writeCalled = false;
  let countCalled = false;

  Student.findById = () => ({
    select: async () => ({
      _id: childId,
      accountStatus: "active",
      guardianId,
      createdByAdmin: guardianId,
    }),
  });
  Admin.findById = () => ({
    select: async () => ({
      _id: guardianId,
      fullName: "Guardian One",
      role: "school admin",
      subscriptionPlan: "individual",
      subscriptionStatus: "active",
      childLimit: 1,
    }),
  });
  Student.countDocuments = async () => {
    countCalled = true;
    return 1;
  };
  Student.findOneAndUpdate = () => {
    writeCalled = true;
    throw new Error("no-op must not write");
  };

  try {
    const result = await repairChildOwnership({ childId, destinationGuardianId: guardianId });
    assert.equal(result.changed, false);
    assert.equal(countCalled, false);
    assert.equal(writeCalled, false);
  } finally {
    Student.findById = originals.studentFindById;
    Admin.findById = originals.adminFindById;
    Student.countDocuments = originals.countDocuments;
    Student.findOneAndUpdate = originals.findOneAndUpdate;
  }
});

test("ownership repair updates both ownership fields atomically and omits password data", async () => {
  const { repairChildOwnership } = loadService();
  const childId = objectId();
  const guardianId = objectId();
  const originals = {
    studentFindById: Student.findById,
    adminFindById: Admin.findById,
    countDocuments: Student.countDocuments,
    findOneAndUpdate: Student.findOneAndUpdate,
  };
  let capturedWrite;

  Student.findById = () => ({
    select: async () => ({
      _id: childId,
      fullName: "Child One",
      accountStatus: "active",
      guardianId: objectId(),
      createdByAdmin: objectId(),
    }),
  });
  Admin.findById = () => ({
    select: async () => ({
      _id: guardianId,
      fullName: "Guardian Two",
      role: "school admin",
      subscriptionPlan: "plus",
      subscriptionStatus: "active",
      childLimit: 5,
    }),
  });
  Student.countDocuments = async (filter) => {
    assert.deepEqual(filter._id, { $ne: childId });
    return 0;
  };
  Student.findOneAndUpdate = (filter, update, options) => {
    capturedWrite = { filter, update, options };
    return {
      select: async (selection) => {
        assert.equal(selection, "-password");
        return {
          _id: childId,
          fullName: "Child One",
          guardianId,
          createdByAdmin: guardianId,
        };
      },
    };
  };

  try {
    const result = await repairChildOwnership({ childId, destinationGuardianId: guardianId });

    assert.deepEqual(capturedWrite, {
      filter: { _id: childId },
      update: { $set: { guardianId, createdByAdmin: guardianId } },
      options: { new: true, runValidators: true },
    });
    assert.equal(Object.hasOwn(result.child, "password"), false);
    assert.equal(result.destination.email, undefined);
  } finally {
    Student.findById = originals.studentFindById;
    Admin.findById = originals.adminFindById;
    Student.countDocuments = originals.countDocuments;
    Student.findOneAndUpdate = originals.findOneAndUpdate;
  }
});

test("guardian directory returns only non-inactive public account fields", async () => {
  const { listAssignableGuardians } = loadService();
  const originalFind = Admin.find;
  let capturedFilter;
  let capturedSelection;

  Admin.find = (filter) => {
    capturedFilter = filter;
    return {
      select(selection) {
        capturedSelection = selection;
        return this;
      },
      sort: async () => [
        {
          _id: objectId(),
          fullName: "Guardian One",
          email: "guardian@example.com",
          role: "school admin",
          subscriptionStatus: "active",
          password: "must-not-leak",
          planStartedAt: new Date(),
        },
      ],
    };
  };

  try {
    const guardians = await listAssignableGuardians();

    assert.deepEqual(capturedFilter, {
      role: { $in: ["school admin", "super admin"] },
      subscriptionStatus: { $ne: "inactive" },
    });
    assert.equal(capturedSelection, "_id fullName email role subscriptionStatus");
    assert.deepEqual(Object.keys(guardians[0]).sort(), [
      "email",
      "fullName",
      "id",
      "role",
      "subscriptionStatus",
    ]);
    assert.equal(Object.hasOwn(guardians[0], "password"), false);
  } finally {
    Admin.find = originalFind;
  }
});
