const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../../../uploads/speech");

const allowedMimeTypes = new Set([
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
]);

const extensionByMimeType = {
  "audio/webm": ".webm",
  "audio/mp3": ".mp3",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
  "audio/x-m4a": ".m4a",
};

const sanitize = (value) =>
  String(value || "unknown")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 80) || "unknown";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        new Error(
          "Invalid audio file type. Allowed types are webm, mp3, wav, ogg, and m4a."
        )
      );
    }

    cb(null, true);
  },
});

const buildAudioFilename = ({ studentId, sessionId, promptId, attemptNo, mimetype }) => {
  const ext = extensionByMimeType[mimetype] || ".webm";
  const safeAttemptNo = String(attemptNo || 1).padStart(2, "0");
  return `${sanitize(studentId)}_${sanitize(sessionId)}_${sanitize(promptId)}_A${safeAttemptNo}_${Date.now()}${ext}`;
};

const saveUploadedAudio = ({ file, studentId, sessionId, promptId, attemptNo }) => {
  if (!file) return null;

  fs.mkdirSync(uploadDir, { recursive: true });
  const filename = buildAudioFilename({
    studentId,
    sessionId,
    promptId,
    attemptNo,
    mimetype: file.mimetype,
  });
  const destinationPath = path.join(uploadDir, filename);
  fs.writeFileSync(destinationPath, file.buffer);

  return {
    ...file,
    filename,
    path: destinationPath,
  };
};

const uploadSpeechAudio = (req, res, next) => {
  upload.single("audio")(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Audio file is too large. Maximum size is 15 MB."
            : error.message,
      });
    }

    next();
  });
};

module.exports = {
  uploadSpeechAudio,
  saveUploadedAudio,
  uploadDir,
};
