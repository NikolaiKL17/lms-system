const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Notification = require('../models/Notification');
const { auth, admin } = require('../middleware/auth');

// Multer for submission files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/submissions');
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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат файла'));
    }
  }
});

// GET /api/submissions
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'STUDENT') {
      filter.student = req.user._id;
    }
    if (req.query.assignment) filter.assignment = req.query.assignment;
    if (req.query.student) filter.student = req.query.student;

    const submissions = await Submission.find(filter)
      .populate('student', 'name email')
      .populate({
        path: 'assignment',
        populate: [{ path: 'theme' }, { path: 'group' }, { path: 'category' }]
      })
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/submissions/assignment/:assignmentId
router.get('/assignment/:assignmentId', auth, async (req, res) => {
  try {
    const filter = { assignment: req.params.assignmentId };
    if (req.user.role === 'STUDENT') filter.student = req.user._id;

    const submissions = await Submission.find(filter)
      .populate('student', 'name email')
      .populate('assignment')
      .sort({ submittedAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/submissions/document (student - submit document)
router.post('/document', auth, upload.single('file'), async (req, res) => {
  try {
    const { assignmentId } = req.body;
    if (!assignmentId) return res.status(400).json({ message: 'Укажите задание' });
    if (!req.file) return res.status(400).json({ message: 'Загрузите файл' });

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Задание не найдено' });

    // Check if already submitted (not RETRY)
    let submission = await Submission.findOne({
      student: req.user._id,
      assignment: assignmentId
    });

    if (submission && submission.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Задание уже выполнено' });
    }

    if (submission) {
      submission.file = '/uploads/submissions/' + req.file.filename;
      submission.status = 'COMPLETED';
      submission.submittedAt = new Date();
      await submission.save();
    } else {
      submission = await Submission.create({
        student: req.user._id,
        assignment: assignmentId,
        file: '/uploads/submissions/' + req.file.filename,
        status: 'COMPLETED',
        submittedAt: new Date()
      });
    }

    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/submissions/test (student - submit test)
router.post('/test', auth, async (req, res) => {
  try {
    const { assignmentId, answers } = req.body;
    if (!assignmentId || !answers) {
      return res.status(400).json({ message: 'Заполните все поля' });
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Задание не найдено' });

    // Check existing
    let submission = await Submission.findOne({
      student: req.user._id,
      assignment: assignmentId
    });

    if (submission && submission.status === 'COMPLETED') {
      return res.status(400).json({ message: 'Тест уже пройден' });
    }

    // Calculate score
    const test = await Test.findOne({ assignment: assignmentId });
    const questions = await Question.find({ test: test._id });
    let correct = 0;

    for (const q of questions) {
      const correctAnswers = await Answer.find({ question: q._id, isCorrect: true });
      const correctIds = correctAnswers.map(a => a._id.toString()).sort();
      const studentAnswer = answers.find(a => a.question === q._id.toString());
      if (studentAnswer) {
        const selectedIds = studentAnswer.selected.sort();
        if (JSON.stringify(correctIds) === JSON.stringify(selectedIds)) {
          correct++;
        }
      }
    }

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    if (submission) {
      submission.answers = answers;
      submission.score = score;
      submission.status = 'COMPLETED';
      submission.submittedAt = new Date();
      await submission.save();
    } else {
      submission = await Submission.create({
        student: req.user._id,
        assignment: assignmentId,
        answers,
        score,
        status: 'COMPLETED',
        submittedAt: new Date()
      });
    }

    res.status(201).json({ submission, score, correct, total: questions.length });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// PUT /api/submissions/:id/grade (admin)
router.put('/:id/grade', auth, admin, async (req, res) => {
  try {
    const { score } = req.body;
    if (score === undefined || score === null) {
      return res.status(400).json({ message: 'Укажите оценку' });
    }
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { score, gradedAt: new Date(), gradedBy: req.user._id },
      { new: true }
    ).populate('student', 'name email').populate('assignment');

    if (!submission) return res.status(404).json({ message: 'Работа не найдена' });

    await Notification.create({
      user: submission.student._id,
      title: 'Оценка обновлена',
      message: `Ваша оценка за "${submission.assignment.title}": ${score} баллов`,
      type: 'SUCCESS'
    });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
