const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const { dbState, readJSON, USERS_FILE } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'renteasy_secret_key_12345';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (dbState.isMongoConnected) {
      const user = await UserModel.findById(decoded.id).select('-password');
      if (!user) return res.status(401).json({ message: 'User not found' });
      req.user = user;
    } else {
      const users = readJSON(USERS_FILE);
      const user = users.find(u => u.id === decoded.id);
      if (!user) return res.status(401).json({ message: 'User not found' });
      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Access denied: Owners only' });
  }
  next();
};

module.exports = {
  authMiddleware,
  ownerOnly
};
