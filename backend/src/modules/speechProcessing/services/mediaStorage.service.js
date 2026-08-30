const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");

const backendRoot = path.resolve(__dirname, "../../../../");

const isTruthy = (value) => value === true || String(value || "").toLowerCase() === "true";

const getConfiguredProvider = () =>
  String(process.env.MEDIA_STORAGE_PROVIDER || "local").trim().toLowerCase();

const resolvePath = (filePath) => {
  if (!filePath) return "";
  if (path.isAbsolute(filePath)) return filePath;
  return path.resolve(backendRoot, filePath);
};

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET)
  );

const configureCloudinary = () => {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
    return;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

const getCloudinaryFolder = () =>
  String(process.env.CLOUDINARY_FOLDER || "lexiland/speech").replace(/^\/+|\/+$/g, "");

const buildPublicId = ({ attemptId, kind, filePath }) => {
  const ext = path.extname(filePath || "");
  const base = path
    .basename(filePath || `speech-${Date.now()}`, ext)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 110);
  return `${getCloudinaryFolder()}/${attemptId || "attempt"}/${kind}_${base}`;
};

const localFallback = (reason = "cloudinary_not_configured") => ({
  provider: "local",
  uploadStatus: "skipped",
  uploadError: reason,
});

const uploadFile = async ({ filePath, attemptId, kind }) => {
  const absolutePath = resolvePath(filePath);
  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return null;
  }

  const result = await cloudinary.uploader.upload(absolutePath, {
    resource_type: "video",
    public_id: buildPublicId({ attemptId, kind, filePath: absolutePath }),
    overwrite: true,
  });

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    bytes: result.bytes,
    format: result.format,
  };
};

const syncSpeechAttemptMedia = async ({
  attemptId,
  originalAudioPath,
  normalizedAudioPath,
} = {}) => {
  const provider = getConfiguredProvider();
  if (provider !== "cloudinary") {
    return localFallback("media_storage_provider_local");
  }

  if (!hasCloudinaryConfig()) {
    return localFallback("cloudinary_config_missing");
  }

  configureCloudinary();

  try {
    const [original, normalized] = await Promise.all([
      uploadFile({ filePath: originalAudioPath, attemptId, kind: "original" }),
      uploadFile({ filePath: normalizedAudioPath, attemptId, kind: "normalized" }),
    ]);

    if (!original && !normalized) {
      return {
        provider: "cloudinary",
        uploadStatus: "failed",
        uploadError: "no_media_files_found",
      };
    }

    return {
      provider: "cloudinary",
      uploadStatus: "completed",
      originalPublicId: original?.publicId || "",
      originalSecureUrl: original?.secureUrl || "",
      normalizedPublicId: normalized?.publicId || "",
      normalizedSecureUrl: normalized?.secureUrl || "",
      bytes: Number(original?.bytes || 0) + Number(normalized?.bytes || 0),
      format: original?.format || normalized?.format || "",
      uploadError: "",
      syncedAt: new Date(),
    };
  } catch (error) {
    return {
      provider: "cloudinary",
      uploadStatus: "failed",
      uploadError: error.message || "cloudinary_upload_failed",
    };
  }
};

module.exports = {
  syncSpeechAttemptMedia,
  hasCloudinaryConfig,
  getConfiguredProvider,
  isTruthy,
};
