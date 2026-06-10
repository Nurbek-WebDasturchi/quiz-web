const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function normalizeText(rawText = "") {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function cleanQuestion(text = "") {
  return text
    .replace(/^\s*\d+[\.)\:-]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOption(text = "") {
  return text
    .replace(/^\s*#(?!#)\s*/, "")
    .replace(/^\s*[A-Ha-h][\.)\:-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pickFourOptions(options, correctAnswer) {
  const cleaned = options
    .map((option, index) => ({
      letter: option.letter || LETTERS[index],
      text: cleanOption(option.text),
    }))
    .filter((option) => option.text);

  if (cleaned.length < 4) return [];

  const firstFour = cleaned.slice(0, 4);
  if (!correctAnswer || firstFour.some((option) => option.letter === correctAnswer)) {
    return firstFour;
  }

  const correctOption = cleaned.find((option) => option.letter === correctAnswer);
  if (!correctOption) return firstFour;

  return [...firstFour.slice(0, 3), correctOption];
}

function pushQuestion(questions, questionText, options, correctAnswer) {
  const normalizedOptions = pickFourOptions(options, correctAnswer);

  if (questionText && normalizedOptions.length === 4 && correctAnswer) {
    questions.push({
      question: cleanQuestion(questionText),
      options: normalizedOptions,
      correctAnswer,
    });
  }
}

function pushCandidate(questions, questionText, options, correctAnswer = null) {
  const normalizedOptions = pickFourOptions(options, correctAnswer);

  if (questionText && normalizedOptions.length === 4) {
    questions.push({
      question: cleanQuestion(questionText),
      options: normalizedOptions,
      correctAnswer,
      needsReview: !correctAnswer,
    });
  }
}

function parseSeparatorFormat(text) {
  const questions = [];
  const blocks = text
    .split(/\n\s*\+{4,}\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const parts = block
      .split(/\n\s*={3,}\s*\n/g)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 3) continue;

    const questionText = parts[0];
    const options = [];
    let correctAnswer = null;

    parts.slice(1).forEach((part, index) => {
      const letter = LETTERS[index];
      options.push({ letter, text: part });
      if (part.includes("#")) correctAnswer = letter;
    });

    pushQuestion(questions, questionText, options, correctAnswer);
  }

  return questions;
}

function splitNumberedBlocks(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const blocks = [];
  let current = [];

  for (const line of lines) {
    const isQuestionStart = /^\d+[\.)]\s+/.test(line);
    if (isQuestionStart && current.length) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  }

  if (current.length) blocks.push(current);
  return blocks;
}

function parseNumberedFormat(text) {
  const questions = [];
  const blocks = splitNumberedBlocks(text);

  for (const lines of blocks) {
    const questionLines = [];
    const options = [];
    let correctAnswer = null;

    for (const line of lines) {
      const optionMatch = line
        .replace(/^\s*#\s*/, "# ")
        .match(/^#?\s*([A-Ha-h])[\.)\:-]\s*(.+)$/);

      if (!optionMatch) {
        questionLines.push(line);
        continue;
      }

      const letter = optionMatch[1].toUpperCase();
      options.push({ letter, text: optionMatch[2] });
      if (/^\s*#/.test(line) || /^[A-Ha-h][\.)\:-]\s*#/.test(line)) {
        correctAnswer = letter;
      }
    }

    pushQuestion(questions, questionLines.join(" "), options, correctAnswer);
  }

  return questions;
}

function parseLooseNumberedFormat(text) {
  const questions = [];
  const chunks = text
    .split(/\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const lines = chunk
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 3) continue;

    const questionText = lines[0];
    const options = [];
    let correctAnswer = null;

    lines.slice(1).forEach((line, index) => {
      const match = line.match(/^#?\s*([A-Ha-h])?[\.)\:-]?\s*(.+)$/);
      if (!match) return;

      const letter = match[1] ? match[1].toUpperCase() : LETTERS[index];
      options.push({ letter, text: match[2] });
      if (/^\s*#/.test(line) || /^[A-Ha-h]?[\.)\:-]?\s*#/.test(line)) {
        correctAnswer = letter;
      }
    });

    pushQuestion(questions, questionText, options, correctAnswer);
  }

  return questions;
}

function parseCompactNumberedFormat(text) {
  const questions = [];
  const blocks = text
    .split(/(?=^\s*\d+[\.)]\s+)/gm)
    .map((block) => block.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const compact = block.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    const questionMatch = compact.match(/^\d+[\.)]\s*(.*?)(?=\s*#?\s*[A-Da-d][\.)]\s*)/);
    if (!questionMatch) continue;

    const questionText = questionMatch[1].trim();
    const optionText = compact.slice(questionMatch[0].length).trim();
    const optionMatches = [
      ...optionText.matchAll(/(#\s*)?([A-Da-d])[\.)]\s*(.*?)(?=\s*#?\s*[A-Da-d][\.)]\s*|$)/g),
    ];
    const options = [];
    let correctAnswer = null;

    for (const match of optionMatches) {
      const letter = match[2].toUpperCase();
      const text = match[3].trim();
      options.push({ letter, text });
      if (match[1]) correctAnswer = letter;
    }

    pushCandidate(questions, questionText, options, correctAnswer);
  }

  return questions;
}

function dedupeQuestions(questions) {
  const seen = new Set();
  return questions.filter((question) => {
    const key = question.question.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseTestQuestions(rawText) {
  const text = normalizeText(rawText);
  return dedupeQuestions([
    ...parseSeparatorFormat(text),
    ...parseNumberedFormat(text),
    ...parseLooseNumberedFormat(text),
    ...parseCompactNumberedFormat(text).filter((question) => question.correctAnswer),
  ]);
}

function parseQuestionCandidates(rawText) {
  const text = normalizeText(rawText);
  return dedupeQuestions([
    ...parseCompactNumberedFormat(text),
    ...parseSeparatorFormat(text),
    ...parseNumberedFormat(text),
    ...parseLooseNumberedFormat(text),
  ]);
}

function toTemplateText(questions, format = "numbered") {
  if (format === "separator") {
    return questions
      .map((question) => {
        const options = question.options.map((option) => {
          const prefix = option.letter === question.correctAnswer ? "# " : "";
          return `${prefix}${option.text}`;
        });
        return `${question.question}\n\n====\n\n${options.join("\n\n====\n\n")}`;
      })
      .join("\n\n++++\n\n");
  }

  return questions
    .map((question, index) => {
      const options = question.options.map((option) => {
        const prefix = option.letter === question.correctAnswer ? "# " : "";
        return `${prefix}${option.letter}) ${option.text}`;
      });
      return `${index + 1}. ${question.question}\n${options.join("\n")}`;
    })
    .join("\n\n");
}

module.exports = { parseQuestionCandidates, parseTestQuestions, toTemplateText };
