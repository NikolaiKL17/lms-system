const mongoose = require('mongoose');
const dns = require('dns');

// Использовать Google DNS для резолва SRV-записей MongoDB Atlas
dns.setServers(['8.8.8.8', '8.8.4.4']);


const connectDB = async () => {
  console.log('MONGODB_URI:', process.env.MONGODB_URI);
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB подключена успешно');
  } catch (err) {
    console.error('Ошибка подключения к MongoDB:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
