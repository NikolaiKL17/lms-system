require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const connectDB = require('./server/config/db');
const User = require('./server/models/User');

const app = express();

// Create uploads directories
['uploads/assignments', 'uploads/submissions', 'uploads/questions'].forEach(dir => {
  fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/courses', require('./server/routes/courses'));
app.use('/api/themes', require('./server/routes/themes'));
app.use('/api/groups', require('./server/routes/groups'));
app.use('/api/categories', require('./server/routes/categories'));
app.use('/api/assignments', require('./server/routes/assignments'));
app.use('/api/tests', require('./server/routes/tests'));
app.use('/api/submissions', require('./server/routes/submissions'));
app.use('/api/dashboard', require('./server/routes/dashboard'));
app.use('/api/notifications', require('./server/routes/notifications'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Seed admin
async function seedAdmin() {
  try {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('admin123', salt);
      await User.create({
        name: 'Администратор',
        email: 'admin@lms.com',
        password: hash,
        role: 'ADMIN'
      });
      console.log('Создан администратор по умолчанию: admin@lms.com / admin123');
    }
  } catch (err) {
    console.error('Ошибка при создании администратора:', err.message);
  }
}

// Start
const PORT = process.env.PORT || 3000;

connectDB().then(async () => {
  await seedAdmin();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Сервер запущен на порту ${PORT}`);
  });
});
