const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/User');
const { dbState, readJSON, writeJSON, USERS_FILE } = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'renteasy_secret_key_12345';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['student', 'owner'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be student or owner' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (dbState.isMongoConnected) {
      const existingUser = await UserModel.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'Email already registered' });

      const newUser = await UserModel.create({ name, email, password: hashedPassword, role });
      const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
      
      return res.status(201).json({
        token,
        user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
      });
    } else {
      const users = readJSON(USERS_FILE);
      const existingUser = users.find(u => u.email === email);
      if (existingUser) return res.status(400).json({ message: 'Email already registered' });

      const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password: hashedPassword,
        role
      };
      users.push(newUser);
      writeJSON(USERS_FILE, users);

      const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({
        token,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (dbState.isMongoConnected) {
      const user = await UserModel.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid email or password' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

      const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } else {
      const users = readJSON(USERS_FILE);
      const user = users.find(u => u.email === email);
      if (!user) return res.status(400).json({ message: 'Invalid email or password' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid email or password' });

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get profile
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
