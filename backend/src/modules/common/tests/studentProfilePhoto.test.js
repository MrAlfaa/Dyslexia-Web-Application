const test = require("node:test");
const assert = require("node:assert/strict");

const Student = require("../models/student.model");
const studentController = require("../controllers/student.controller");
const adminController = require("../../admin/controllers/admin.controller");
const {
  MAX_PROFILE_PHOTO_BYTES,
  validateProfilePhotoDataUrl,
} = require("../services/profilePhotoValidation.service");

const createDataUrl = (mimeType, bytes) =>
  `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;

const validSamples = {
  "image/jpeg": Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]),
  "image/png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/webp": Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x04, 0x00, 0x00, 0x00,
    0x57, 0x45, 0x42, 0x50,
  ]),
};

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

test("profile photo validation accepts omitted, empty, JPEG, PNG, and WebP values", () => {
  assert.equal(validateProfilePhotoDataUrl(undefined).valid, true);
  assert.equal(validateProfilePhotoDataUrl("").valid, true);

  for (const [mimeType, bytes] of Object.entries(validSamples)) {
    const result = validateProfilePhotoDataUrl(createDataUrl(mimeType, bytes));
    assert.equal(result.valid, true, mimeType);
    assert.equal(result.mimeType, mimeType);
    assert.equal(result.decodedBytes, bytes.length);
  }
});

test("profile photo validation rejects remote URLs, unsupported MIME types, malformed base64, and signature mismatches", () => {
  assert.equal(validateProfilePhotoDataUrl("https://example.com/photo.png").valid, false);
  assert.equal(
    validateProfilePhotoDataUrl(createDataUrl("image/gif", Buffer.from("GIF89a"))).valid,
    false,
  );
  assert.equal(validateProfilePhotoDataUrl("data:image/png;base64,not*base64").valid, false);
  assert.equal(
    validateProfilePhotoDataUrl(createDataUrl("image/png", validSamples["image/jpeg"])).valid,
    false,
  );
});

test("profile photo validation enforces the decoded five-megabyte limit", () => {
  const oversizedPng = Buffer.concat([
    validSamples["image/png"],
    Buffer.alloc(MAX_PROFILE_PHOTO_BYTES + 1 - validSamples["image/png"].length),
  ]);

  assert.equal(
    validateProfilePhotoDataUrl(createDataUrl("image/png", oversizedPng)).valid,
    false,
  );
});

test("updateProfile rejects an invalid profile photo before writing to MongoDB", async () => {
  const originalFindByIdAndUpdate = Student.findByIdAndUpdate;
  let updateCalled = false;
  Student.findByIdAndUpdate = async () => {
    updateCalled = true;
    return null;
  };

  try {
    const response = createResponse();
    await studentController.updateProfile(
      {
        user: { id: "student-1" },
        body: {
          fullName: "Student One",
          profilePhoto: "data:image/png;base64,not*base64",
        },
      },
      response,
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.code, "invalid_profile_photo");
    assert.equal(updateCalled, false);
  } finally {
    Student.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test("updateProfile omits profilePhoto from MongoDB updates when the field is absent", async () => {
  const originalFindByIdAndUpdate = Student.findByIdAndUpdate;
  let capturedUpdate;
  Student.findByIdAndUpdate = (_id, update) => {
    capturedUpdate = update;
    return {
      select: async () => ({ _id: "student-1", ...update }),
    };
  };

  try {
    const response = createResponse();
    await studentController.updateProfile(
      {
        user: { id: "student-1" },
        body: { fullName: "Updated Name", grade: "4", school: "New School" },
      },
      response,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(Object.hasOwn(capturedUpdate, "profilePhoto"), false);
  } finally {
    Student.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test("admin scoped update rejects an invalid profile photo before child lookup or update", async () => {
  const originalFindOne = Student.findOne;
  const originalFindByIdAndUpdate = Student.findByIdAndUpdate;
  let databaseCalled = false;
  Student.findOne = async () => {
    databaseCalled = true;
    return {};
  };
  Student.findByIdAndUpdate = () => {
    databaseCalled = true;
    return { select: async () => ({}) };
  };

  try {
    const response = createResponse();
    await adminController.updateStudentScoped(
      {
        user: { id: "guardian-1", role: "school admin" },
        params: { id: "student-1" },
        body: { profilePhoto: "https://example.com/legacy-photo.png" },
      },
      response,
    );

    assert.equal(response.statusCode, 400);
    assert.deepEqual(response.body, {
      success: false,
      code: "invalid_profile_photo",
      message: "Profile photo must be a JPEG, PNG, or WebP data URL.",
    });
    assert.equal(databaseCalled, false);
  } finally {
    Student.findOne = originalFindOne;
    Student.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});
