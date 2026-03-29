const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Group = require('../models/Group');
const Theme = require('../models/Theme');
const { auth, admin } = require('../middleware/auth');

// GET /api/courses
router.get('/', auth, async (req, res) => {
  try {
    let courses;
    if (req.user.role === 'ADMIN') {
      courses = await Course.find().sort({ createdAt: -1 });
    } else {
      const groups = await Group.find({ _id: { $in: req.user.groups } });
      const courseIds = [...new Set(groups.map(g => g.course.toString()))];
      courses = await Course.find({ _id: { $in: courseIds } }).sort({ createdAt: -1 });
    }
    // Add counts
    const result = await Promise.all(courses.map(async (course) => {
      const groupCount = await Group.countDocuments({ course: course._id });
      const themeCount = await Theme.countDocuments({ course: course._id });
      return { ...course.toObject(), groupCount, themeCount };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/courses/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Курс не найден' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/courses (admin)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: 'Введите название курса' });
    const course = await Course.create({ title, description });
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// PUT /api/courses/:id (admin)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { title, description } = req.body;
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { title, description },
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Курс не найден' });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/courses/:id (admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: 'Курс не найден' });
    await Theme.deleteMany({ course: req.params.id });
    await Group.deleteMany({ course: req.params.id });
    res.json({ message: 'Курс удалён' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
