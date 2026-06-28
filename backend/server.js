const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'renteasy_secret_key_12345';

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ==========================================
// DATABASE CONFIGURATION (MONGO / MOCK JSON)
// ==========================================
let isMongoConnected = false;

// 1. Mongoose Schemas (Used if MongoDB is connected)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'owner'], required: true }
}, { timestamps: true });

const PropertySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Hostel', 'PG', 'House'], required: true },
  rent: { type: Number, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  contact: { type: String, required: true },
  image: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

let UserModel;
let PropertyModel;

// 2. Local JSON Files Path (Fallback Database)
const USERS_FILE = path.join(__dirname, 'users.json');
const PROPERTIES_FILE = path.join(__dirname, 'properties.json');

// Initialize JSON files if they don't exist
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(PROPERTIES_FILE)) fs.writeFileSync(PROPERTIES_FILE, JSON.stringify([], null, 2));

// Helper functions for Local JSON operations
const readJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// 3. Connect to MongoDB
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('>>> Connected to MongoDB database successfully.');
      isMongoConnected = true;
      UserModel = mongoose.model('User', UserSchema);
      PropertyModel = mongoose.model('Property', PropertySchema);
    })
    .catch((err) => {
      console.error('>>> MongoDB connection error, falling back to local JSON database:', err.message);
      setupMockDb();
    });
} else {
  console.log('>>> No MONGODB_URI provided in environmental variables. Using local JSON database fallback.');
  setupMockDb();
}

function setupMockDb() {
  isMongoConnected = false;
  console.log(`>>> JSON Database configured. USERS: ${USERS_FILE}, PROPERTIES: ${PROPERTIES_FILE}`);
}

// ==========================================
// IMAGE UPLOAD VIA MULTER
// ==========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (isMongoConnected) {
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

// ==========================================
// AUTH ROUTES
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!['student', 'owner'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be student or owner' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (isMongoConnected) {
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
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (isMongoConnected) {
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
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});


// ==========================================
// PROPERTY ROUTES
// ==========================================

// Get all properties (with location search and filter by type & maxRent)
app.get('/api/properties', async (req, res) => {
  try {
    const { location, type, maxRent } = req.query;

    if (isMongoConnected) {
      let query = {};
      if (location) {
        query.location = { $regex: location, $options: 'i' };
      }
      if (type) {
        query.type = type;
      }
      if (maxRent) {
        query.rent = { $lte: Number(maxRent) };
      }

      const properties = await PropertyModel.find(query).populate('ownerId', 'name email contact');
      return res.json(properties);
    } else {
      let properties = readJSON(PROPERTIES_FILE);

      if (location) {
        const searchLoc = location.toLowerCase();
        properties = properties.filter(p => p.location.toLowerCase().includes(searchLoc));
      }
      if (type) {
        properties = properties.filter(p => p.type === type);
      }
      if (maxRent) {
        properties = properties.filter(p => p.rent <= Number(maxRent));
      }

      return res.json(properties);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Get property details
app.get('/api/properties/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      const property = await PropertyModel.findById(id).populate('ownerId', 'name email');
      if (!property) return res.status(404).json({ message: 'Property not found' });
      return res.json(property);
    } else {
      const properties = readJSON(PROPERTIES_FILE);
      const property = properties.find(p => p.id === id);
      if (!property) return res.status(404).json({ message: 'Property not found' });
      return res.json(property);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Add new property (Owner only)
app.post('/api/properties', authMiddleware, ownerOnly, upload.single('image'), async (req, res) => {
  try {
    const { name, type, rent, location, description, contact } = req.body;
    
    if (!name || !type || !rent || !location || !description || !contact) {
      return res.status(400).json({ message: 'All listing fields are required' });
    }

    if (!['Hostel', 'PG', 'House'].includes(type)) {
      return res.status(400).json({ message: 'Invalid property type' });
    }

    // Handle uploaded image
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const ownerId = req.user.id || req.user._id;

    if (isMongoConnected) {
      const newProperty = await PropertyModel.create({
        name,
        type,
        rent: Number(rent),
        location,
        description,
        contact,
        image: imageUrl,
        ownerId
      });
      return res.status(201).json(newProperty);
    } else {
      const properties = readJSON(PROPERTIES_FILE);
      const newProperty = {
        id: Date.now().toString(),
        name,
        type,
        rent: Number(rent),
        location,
        description,
        contact,
        image: imageUrl,
        ownerId: ownerId.toString()
      };
      properties.push(newProperty);
      writeJSON(PROPERTIES_FILE, properties);
      return res.status(201).json(newProperty);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Edit property (Owner only)
app.put('/api/properties/:id', authMiddleware, ownerOnly, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, rent, location, description, contact } = req.body;
    const ownerId = (req.user.id || req.user._id).toString();

    if (isMongoConnected) {
      const property = await PropertyModel.findById(id);
      if (!property) return res.status(404).json({ message: 'Property not found' });
      if (property.ownerId.toString() !== ownerId) {
        return res.status(403).json({ message: 'Unauthorized to edit this listing' });
      }

      property.name = name || property.name;
      property.type = type || property.type;
      property.rent = rent ? Number(rent) : property.rent;
      property.location = location || property.location;
      property.description = description || property.description;
      property.contact = contact || property.contact;

      if (req.file) {
        property.image = `/uploads/${req.file.filename}`;
      }

      await property.save();
      return res.json(property);
    } else {
      const properties = readJSON(PROPERTIES_FILE);
      const index = properties.findIndex(p => p.id === id);
      if (index === -1) return res.status(404).json({ message: 'Property not found' });

      if (properties[index].ownerId !== ownerId) {
        return res.status(403).json({ message: 'Unauthorized to edit this listing' });
      }

      const updatedProperty = {
        ...properties[index],
        name: name || properties[index].name,
        type: type || properties[index].type,
        rent: rent ? Number(rent) : properties[index].rent,
        location: location || properties[index].location,
        description: description || properties[index].description,
        contact: contact || properties[index].contact
      };

      if (req.file) {
        updatedProperty.image = `/uploads/${req.file.filename}`;
      }

      properties[index] = updatedProperty;
      writeJSON(PROPERTIES_FILE, properties);
      return res.json(updatedProperty);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Delete property (Owner only)
app.delete('/api/properties/:id', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = (req.user.id || req.user._id).toString();

    if (isMongoConnected) {
      const property = await PropertyModel.findById(id);
      if (!property) return res.status(404).json({ message: 'Property not found' });
      if (property.ownerId.toString() !== ownerId) {
        return res.status(403).json({ message: 'Unauthorized to delete this listing' });
      }

      await PropertyModel.findByIdAndDelete(id);
      return res.json({ message: 'Property deleted successfully' });
    } else {
      const properties = readJSON(PROPERTIES_FILE);
      const index = properties.findIndex(p => p.id === id);
      if (index === -1) return res.status(404).json({ message: 'Property not found' });

      if (properties[index].ownerId !== ownerId) {
        return res.status(403).json({ message: 'Unauthorized to delete this listing' });
      }

      properties.splice(index, 1);
      writeJSON(PROPERTIES_FILE, properties);
      return res.json({ message: 'Property deleted successfully' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// Global default route
app.get('/', (req, res) => {
  res.send('RentEasy Student Rental API is Running.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`>>> Server is running on port ${PORT}`);
});
