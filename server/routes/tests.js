const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { auth, admin } = require('../middleware/auth');

// Multer for question images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/questions');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат изображения'));
    }
  }
});

// GET /api/tests/assignment/:assignmentId
router.get('/assignment/:assignmentId', auth, async (req, res) => {
  try {
    const test = await Test.findOne({ assignment: req.params.assignmentId });
    if (!test) return res.status(404).json({ message: 'Тест не найден' });

    const questions = await Question.find({ test: test._id }).sort({ createdAt: 1 });
    const questionsWithAnswers = await Promise.all(questions.map(async (q) => {
      const answers = await Answer.find({ question: q._id });
      // For students hide correct answers
      const answerData = answers.map(a => {
        if (req.user.role === 'STUDENT') {
          return { _id: a._id, text: a.text, question: a.question };
        }
        return a;
      });
      return { ...q.toObject(), answers: answerData };
    }));

    res.json({ test, questions: questionsWithAnswers });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/tests/:testId/questions (admin)
router.post('/:testId/questions', auth, admin, upload.single('image'), async (req, res) => {
  try {
    const { text, multiple, answers } = req.body;
    if (!text) return res.status(400).json({ message: 'Введите текст вопроса' });

    const questionData = {
      test: req.params.testId,
      text,
      multiple: multiple === 'true' || multiple === true
    };
    if (req.file) questionData.image = '/uploads/questions/' + req.file.filename;

    const question = await Question.create(questionData);

    // Create answers
    if (answers) {
      const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
      for (const ans of parsedAnswers) {
        await Answer.create({
          question: question._id,
          text: ans.text,
          isCorrect: ans.isCorrect || false
        });
      }
    }

    const questionAnswers = await Answer.find({ question: question._id });
    res.status(201).json({ ...question.toObject(), answers: questionAnswers });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// PUT /api/tests/questions/:id (admin)
router.put('/questions/:id', auth, admin, upload.single('image'), async (req, res) => {
  try {
    const { text, multiple, answers } = req.body;
    const update = {};
    if (text) update.text = text;
    if (multiple !== undefined) update.multiple = multiple === 'true' || multiple === true;
    if (req.file) update.image = '/uploads/questions/' + req.file.filename;

    const question = await Question.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!question) return res.status(404).json({ message: 'Вопрос не найден' });

    // Update answers if provided
    if (answers) {
      const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;
      await Answer.deleteMany({ question: question._id });
      for (const ans of parsedAnswers) {
        await Answer.create({
          question: question._id,
          text: ans.text,
          isCorrect: ans.isCorrect || false
        });
      }
    }

    const questionAnswers = await Answer.find({ question: question._id });
    res.json({ ...question.toObject(), answers: questionAnswers });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/tests/questions/:id (admin)
router.delete('/questions/:id', auth, admin, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Вопрос не найден' });
    await Answer.deleteMany({ question: req.params.id });
    res.json({ message: 'Вопрос удалён' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
