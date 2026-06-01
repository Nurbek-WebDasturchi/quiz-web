const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { assist, normalizeText, uploadTest } = require("../controllers/testController");

// POST /api/tests/upload
router.post("/upload", upload.single("testFile"), uploadTest);
router.post("/normalize", normalizeText);
router.post("/assist", assist);

module.exports = router;
