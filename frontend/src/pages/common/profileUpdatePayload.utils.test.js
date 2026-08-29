import test from "node:test";
import assert from "node:assert/strict";

import { buildProfileUpdatePayload } from "./profileUpdatePayload.utils.js";

const profileWithLegacyPhoto = {
  fullName: "Student One",
  grade: "4",
  gender: "female",
  school: "New School",
  profilePhoto: "https://legacy.example/photo.jpg",
};

test("ordinary profile edits omit a loaded legacy profile photo", () => {
  const payload = buildProfileUpdatePayload(profileWithLegacyPhoto, {
    includeProfilePhoto: false,
  });

  assert.deepEqual(payload, {
    fullName: "Student One",
    grade: "4",
    gender: "female",
    school: "New School",
  });
  assert.equal(Object.hasOwn(payload, "profilePhoto"), false);
});

test("a newly selected valid photo is included explicitly", () => {
  const payload = buildProfileUpdatePayload(
    { ...profileWithLegacyPhoto, profilePhoto: "data:image/png;base64,iVBORw0KGgo=" },
    { includeProfilePhoto: true },
  );

  assert.equal(payload.profilePhoto, "data:image/png;base64,iVBORw0KGgo=");
});
