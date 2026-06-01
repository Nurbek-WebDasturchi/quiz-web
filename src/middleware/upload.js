const multer = require("multer");
const path = require("path");
const fs = require("fs");

// uploads papkasi: root/uploads  (src/middleware dan 2 daraja yuqori = root)
const uploadDir = path.join(__dirname, "../../", process.env.UPLOAD_DIR || "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `test_${Date.now()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueName);
  },
});

// Faqat .docx va .txt qabul qilinadi
const fileFilter = (req, file, cb) => {
  const allowedExts = [".docx", ".txt"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error("Faqat .docx yoki .txt fayllar qabul qilinadi."),
      false
    );
  }
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});
