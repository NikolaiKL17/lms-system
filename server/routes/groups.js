const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const { auth, admin } = require('../middleware/auth');

// GET /api/groups
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.course) filter.course = req.query.course;
    const groups = await Group.find(filter).populate('course').sort({ name: 1 });
    const result = await Promise.all(groups.map(async (group) => {
      const studentCount = await User.countDocuments({ groups: group._id, role: 'STUDENT' });
      return { ...group.toObject(), studentCount };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/groups/:id/students
router.get('/:id/students', auth, async (req, res) => {
  try {
    const students = await User.find({ groups: req.params.id, role: 'STUDENT' }).select('-password').sort({ name: 1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/groups (admin)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name, course } = req.body;
    if (!name || !course) return res.status(400).json({ message: 'Заполните обязательные поля' });
    const group = await Group.create({ name, course });
    const populated = await Group.findById(group._id).populate('course');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// PUT /api/groups/:id (admin)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { name, course } = req.body;
    const group = await Group.findByIdAndUpdate(req.params.id, { name, course }, { new: true }).populate('course');
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/groups/:id (admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) return res.status(404).json({ message: 'Группа не найдена' });
    await User.updateMany({ groups: req.params.id }, { $pull: { groups: req.params.id } });
    res.json({ message: 'Группа удалена' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/groups/:id/students (admin - add student)
router.post('/:id/students', auth, admin, async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'Укажите ID студента' });
    const user = await User.findById(studentId);
    if (!user) return res.status(404).json({ message: 'Студент не найден' });
    if (!user.groups.includes(req.params.id)) {
      user.groups.push(req.params.id);
      await user.save();
    }
    res.json({ message: 'Студент добавлен в группу' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/groups/:id/students/:studentId (admin)
router.delete('/:id/students/:studentId', auth, admin, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.studentId, { $pull: { groups: req.params.id } });
    res.json({ message: 'Студент удалён из группы' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
