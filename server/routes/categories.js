const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { auth, admin } = require('../middleware/auth');

// GET /api/categories
router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/categories (admin)
router.post('/', auth, admin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Введите название категории' });
    const category = await Category.create({ name });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Категория с таким названием уже существует' });
    }
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// PUT /api/categories/:id (admin)
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const { name } = req.body;
    const category = await Category.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!category) return res.status(404).json({ message: 'Категория не найдена' });
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// DELETE /api/categories/:id (admin)
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Категория не найдена' });
    res.json({ message: 'Категория удалена' });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;
