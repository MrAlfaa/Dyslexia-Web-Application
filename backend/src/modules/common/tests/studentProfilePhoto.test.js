const test = require("node:test");
const assert = require("node:assert/strict");

const Student = require("../models/student.model");
const studentController = require("../controllers/student.controller");
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
