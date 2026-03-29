const express = require('express');
const router = express.Router();
const Theme = require('../models/Theme');
const Assignment = require('../models/Assignment');
const { auth, admin } = require('../middleware/auth');

// GET /api/themes/course/:courseId
router.get('/course/:courseId', auth, async (req, res) => {
  try {
    const themes = await Theme.find({ course: req.params.courseId }).sort({ createdAt: 1 });
    const result = await Promise.all(themes.map(async (theme) => {
      const assignmentCount = await Assignment.countDocuments({ theme: theme._id });
      return { ...theme.toObject(), assignmentCount };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/themes (admin)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { course, title, description } = req.body;
    if (!course || !title) return res.status(400).json({ message: 'Заполните обязательные поля' });
    const theme = await Theme.create({ course, title, description });
    res.status(201).json(theme);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// PUT /api/themes/:id (admin)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { title, description } = req.body;
    const theme = await Theme.findByIdAndUpdate(req.params.id, { title, description }, { new: true });
    if (!theme) return res.status(404).json({ message: 'Тема не найдена' });
    res.json(theme);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/themes/:id (admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const theme = await Theme.findByIdAndDelete(req.params.id);
    if (!theme) return res.status(404).json({ message: 'Тема не найдена' });
    await Assignment.deleteMany({ theme: req.params.id });
    res.json({ message: 'Тема удалена' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
