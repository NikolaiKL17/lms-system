const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Assignment = require('../models/Assignment');
const Test = require('../models/Test');
const Submission = require('../models/Submission');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth, admin } = require('../middleware/auth');

// Multer config for assignment files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/assignments');
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

// GET /api/assignments
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.theme) filter.theme = req.query.theme;
    if (req.query.group) filter.group = req.query.group;
    if (req.query.type) filter.type = req.query.type;

    if (req.user.role === 'STUDENT') {
      filter.group = { $in: req.user.groups };
    }

    const assignments = await Assignment.find(filter)
      .populate('theme')
      .populate('group')
      .populate('category')
      .sort({ deadline: 1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/assignments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('theme')
      .populate('group')
      .populate('category');
    if (!assignment) return res.status(404).json({ message: 'Задание не найдено' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/assignments (admin)
router.post('/', auth, admin, upload.single('file'), async (req, res) => {
  try {
    const { theme, group, title, description, type, category, startDate, deadline, maxScore } = req.body;
    if (!theme || !group || !title || !type || !deadline) {
      return res.status(400).json({ message: 'Заполните обязательные поля' });
    }
    const data = { theme, group, title, description, type, category, deadline, maxScore: maxScore || 100 };
    if (startDate) data.startDate = startDate;
    if (req.file) data.file = '/uploads/assignments/' + req.file.filename;

    const assignment = await Assignment.create(data);

    // If TEST, create Test document
    if (type === 'TEST') {
      await Test.create({ assignment: assignment._id });
    }

    // Notify students in the group
    const students = await User.find({ groups: group, role: 'STUDENT' });
    const notifications = students.map(s => ({
      user: s._id,
      title: 'Новое задание',
      message: `Добавлено новое задание: "${title}"`,
      type: 'INFO'
    }));
    if (notifications.length) await Notification.insertMany(notifications);

    const populated = await Assignment.findById(assignment._id)
      .populate('theme').populate('group').populate('category');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// PUT /api/assignments/:id (admin)
router.put('/:id', auth, admin, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, startDate, deadline, maxScore } = req.body;
    const update = {};
    if (title) update.title = title;
    if (description !== undefined) update.description = description;
    if (category) update.category = category;
    if (startDate) update.startDate = startDate;
    if (deadline) update.deadline = deadline;
    if (maxScore) update.maxScore = maxScore;
    if (req.file) update.file = '/uploads/assignments/' + req.file.filename;

    const assignment = await Assignment.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('theme').populate('group').populate('category');
    if (!assignment) return res.status(404).json({ message: 'Задание не найдено' });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/assignments/:id (admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Задание не найдено' });
    await Test.deleteMany({ assignment: req.params.id });
    await Submission.deleteMany({ assignment: req.params.id });
    res.json({ message: 'Задание удалено' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/assignments/:id/retry/:studentId (admin)
router.post('/:id/retry/:studentId', auth, admin, async (req, res) => {
  try {
    let submission = await Submission.findOne({
      assignment: req.params.id,
      student: req.params.studentId
    });
    if (submission) {
      submission.status = 'RETRY';
      submission.score = null;
      submission.submittedAt = null;
      submission.file = null;
      submission.answers = [];
      await submission.save();
    } else {
      submission = await Submission.create({
        student: req.params.studentId,
        assignment: req.params.id,
        status: 'RETRY'
      });
    }

    await Notification.create({
      user: req.params.studentId,
      title: 'Повторное выполнение',
      message: 'Вам назначено повторное выполнение задания',
      type: 'WARNING'
    });

    res.json(submission);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
