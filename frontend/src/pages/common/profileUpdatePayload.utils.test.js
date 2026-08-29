import test from "node:test";
import assert from "node:assert/strict";

import {
  buildProfileUpdatePayload,
  getProfileChangeState,
} from "./profileUpdatePayload.utils.js";

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

test("a field edited during a save remains dirty when the old response completes", () => {
  const submittedProfile = { ...profileWithLegacyPhoto, school: "Submitted School" };
  const currentProfile = { ...submittedProfile, school: "Edited During Save" };

  assert.deepEqual(getProfileChangeState(currentProfile, submittedProfile), {
    hasChanges: true,
    hasSelectedNewPhoto: false,
  });
});

test("a photo selected during a save remains dirty when the old response completes", () => {
  const submittedProfile = {
    ...profileWithLegacyPhoto,
    profilePhoto: "data:image/png;base64,c3VibWl0dGVk",
  };
  const currentProfile = {
    ...submittedProfile,
    profilePhoto: "data:image/webp;base64,bmV3ZXI=",
  };

  const changeState = getProfileChangeState(currentProfile, submittedProfile);

  assert.deepEqual(changeState, {
    hasChanges: true,
    hasSelectedNewPhoto: true,
  });
  assert.equal(
    buildProfileUpdatePayload(currentProfile, {
      includeProfilePhoto: changeState.hasSelectedNewPhoto,
    }).profilePhoto,
    currentProfile.profilePhoto,
  );
});
