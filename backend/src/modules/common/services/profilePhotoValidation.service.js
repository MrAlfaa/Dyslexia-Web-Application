const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_PROFILE_PHOTO_BYTES / 3) * 4;
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

const hasBytes = (buffer, expected, offset = 0) =>
  expected.every((value, index) => buffer[offset + index] === value);

const matchesMimeSignature = (mimeType, buffer) => {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && hasBytes(buffer, [0xff, 0xd8, 0xff]);
  }

  if (mimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      hasBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }

  return (
    mimeType === "image/webp" &&
    buffer.length >= 12 &&
    hasBytes(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    hasBytes(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  );
};

const invalidResult = (reason) => ({ valid: false, reason });

const validateProfilePhotoDataUrl = (profilePhoto) => {
  if (profilePhoto === undefined || profilePhoto === "") {
    return { valid: true, mimeType: null, decodedBytes: 0 };
  }

  if (typeof profilePhoto !== "string") {
    return invalidResult("Profile photo must be an image data URL.");
  }

  const match = profilePhoto.match(DATA_URL_PATTERN);
  if (!match) {
    return invalidResult("Profile photo must be a JPEG, PNG, or WebP data URL.");
  }

  const [, mimeType, payload] = match;
  if (payload.length > MAX_BASE64_LENGTH || payload.length % 4 !== 0) {
    return invalidResult("Profile photo exceeds the 5 MB limit.");
  }

  const decoded = Buffer.from(payload, "base64");
  if (decoded.length === 0 || decoded.toString("base64") !== payload) {
    return invalidResult("Profile photo contains invalid base64 data.");
  }

  if (decoded.length > MAX_PROFILE_PHOTO_BYTES) {
    return invalidResult("Profile photo exceeds the 5 MB limit.");
  }

  if (!matchesMimeSignature(mimeType, decoded)) {
    return invalidResult("Profile photo content does not match its image type.");
  }

  return { valid: true, mimeType, decodedBytes: decoded.length };
};

module.exports = {
  MAX_PROFILE_PHOTO_BYTES,
  validateProfilePhotoDataUrl,
};
