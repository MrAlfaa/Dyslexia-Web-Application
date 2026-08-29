const editableProfileFields = ["fullName", "grade", "gender", "school"];

export const getProfileChangeState = (profile, savedProfile) => {
  if (!savedProfile) {
    return { hasChanges: false, hasSelectedNewPhoto: false };
  }

  const hasSelectedNewPhoto = profile.profilePhoto !== savedProfile.profilePhoto;
  const hasChanges =
    hasSelectedNewPhoto ||
    editableProfileFields.some((field) => profile[field] !== savedProfile[field]);

  return { hasChanges, hasSelectedNewPhoto };
};

export const buildProfileUpdatePayload = (profile, { includeProfilePhoto = false } = {}) => ({
  fullName: profile.fullName,
  grade: profile.grade,
  gender: profile.gender,
  school: profile.school,
  ...(includeProfilePhoto ? { profilePhoto: profile.profilePhoto } : {}),
});
