const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const header = req.header('Authorization');
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Нет токена авторизации' });
    }
    const token = header.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Токен недействителен' });
  }
};

const admin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Доступ запрещён. Требуется роль администратора.' });
  }
  next();
};

module.exports = { auth, admin };
