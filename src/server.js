require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const testRoutes = require("./routes/testRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging (dev uchun)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ─── Static frontend fayllarini serve qilish ─────────────────
// HTML, CSS, JS fayllar root'da turadi (Render uchun)
app.use(express.static(path.join(__dirname, "..")));

// ─── API Routes ───────────────────────────────────────────────
app.use("/api/tests", testRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is ready!", mammoth: "✅" });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.message);
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📂 Upload dir: ${process.env.UPLOAD_DIR || "./uploads"}\n`);
});
