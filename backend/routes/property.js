const express = require('express');
const router = express.Router();
const PropertyModel = require('../models/Property');
const { dbState, readJSON, writeJSON, PROPERTIES_FILE } = require('../config/db');
const { authMiddleware, ownerOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Get all properties (with location search and filter by type & maxRent)
router.get('/', async (req, res) => {
  try {
    const { location, type, maxRent } = req.query;

    if (dbState.isMongoConnected) {
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (dbState.isMongoConnected) {
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
router.post('/', authMiddleware, ownerOnly, upload.single('image'), async (req, res) => {
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

    if (dbState.isMongoConnected) {
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
router.put('/:id', authMiddleware, ownerOnly, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, rent, location, description, contact } = req.body;
    const ownerId = (req.user.id || req.user._id).toString();

    if (dbState.isMongoConnected) {
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
router.delete('/:id', authMiddleware, ownerOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = (req.user.id || req.user._id).toString();

    if (dbState.isMongoConnected) {
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

module.exports = router;
