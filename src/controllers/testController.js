const mammoth = require("mammoth");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const {
  parseQuestionCandidates,
  parseTestQuestions,
  toTemplateText,
} = require("../utils/parser");

async function extractTextFromFile(filePath, originalName) {
  const ext = originalName.toLowerCase().split(".").pop();
  if (ext === "txt") {
    return fs.readFileSync(filePath, "utf8");
  }

  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

function buildParseResponse({ questions, fileName }) {
  return {
    success: true,
    testId: `test_${uuidv4()}`,
    fileName,
    totalQuestions: questions.length,
    questions,
    templateText: toTemplateText(questions),
  };
}

exports.uploadTest = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Fayl yuklanmadi" });
    }

    const filePath = req.file.path;

    const rawText = await extractTextFromFile(filePath, req.file.originalname);

    const isConvertMode = req.body?.mode === "convert";
    const questions = isConvertMode
      ? parseQuestionCandidates(rawText)
      : parseTestQuestions(rawText);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (questions.length === 0) {
      return res.status(422).json({
        success: false,
        message:
          "Savollar topilmadi. # bilan belgilangan to'g'ri javob va kamida 2 ta variant kerak.",
        formatExample:
          "1. Savol?\nA) Variant\n# B) To'g'ri\nC) Variant\n\nYoki:\nSavol\n====\n# To'g'ri\n====\nVariant\n++++",
      });
    }

    res.json({
      ...buildParseResponse({ questions, fileName: req.file.originalname }),
      templateText: toTemplateText(
        questions.filter((question) => question.correctAnswer),
        "separator"
      ),
      needsReview: questions.some((question) => question.needsReview),
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("❌ Upload/Parsing error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server xatosi: " + error.message });
  }
};

exports.normalizeText = (req, res) => {
  const rawText = req.body?.text || "";
  const questions = parseQuestionCandidates(rawText);

  if (questions.length === 0) {
    return res.status(422).json({
      success: false,
      message:
        "Matndan savol topilmadi. To'g'ri javobni # bilan belgilang yoki variantlarni A), B), C) ko'rinishida yozing.",
    });
  }

  res.json({
    ...buildParseResponse({ questions, fileName: "AI tahlil qilingan matn" }),
    templateText: toTemplateText(
      questions.filter((question) => question.correctAnswer),
      "separator"
    ),
    needsReview: questions.some((question) => question.needsReview),
  });
};

exports.assist = (req, res) => {
  const message = (req.body?.message || "").trim();
  const lower = message.toLowerCase();

  if (!message) {
    return res.json({
      success: true,
      reply: "Savolingizni yozing yoki tartibsiz test matnini yuboring.",
    });
  }

  const questions = parseTestQuestions(message);
  if (questions.length > 0) {
    return res.json({
      success: true,
      reply: `${questions.length} ta savol topdim. Shablon ko'rinishi:\n\n${toTemplateText(questions)}`,
      questions,
    });
  }

  let reply =
    "Men test fayllarini tahlil qilish, # belgili to'g'ri javoblarni tekshirish va ustozlarga yuklash jarayonida yordam beraman.";

  if (lower.includes("shablon") || lower.includes("format")) {
    reply =
      "Shablon: savol matni, keyin variantlar. To'g'ri javob oldiga # qo'ying. Masalan:\n1. Savol?\nA) Variant\n# B) To'g'ri javob\nC) Variant";
  } else if (lower.includes("ustoz") || lower.includes("teacher")) {
    reply =
      "Ustoz akkauntida test yuklash, fan nomini kiritish va AI orqali tartibli matnni shablonga aylantirish mumkin.";
  } else if (lower.includes("yukla") || lower.includes("upload")) {
    reply =
      "Test yuklash sahifasida .docx yoki .txt fayl tanlang. Platforma ==== / ++++ shablonini ham, 1. A) B) C) tartibidagi savollarni ham o'qiydi.";
  }

  res.json({ success: true, reply });
};
