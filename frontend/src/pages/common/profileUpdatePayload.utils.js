export const buildProfileUpdatePayload = (profile, { includeProfilePhoto = false } = {}) => ({
  fullName: profile.fullName,
  grade: profile.grade,
  gender: profile.gender,
  school: profile.school,
  ...(includeProfilePhoto ? { profilePhoto: profile.profilePhoto } : {}),
});
