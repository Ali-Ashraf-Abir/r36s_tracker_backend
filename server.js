const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/r36s-tracker';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create upload directory
const UPLOAD_DIR = path.join(__dirname, 'uploads', 'saves');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ==================== MONGODB SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  displayName: {
    type: String,
    default: ''
  },
  profilePublic: {
    type: Boolean,
    default: false
  },
  apiKey: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

// Device Schema
const deviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    default: 'R36S Device'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

deviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

const Device = mongoose.model('Device', deviceSchema);

// Gameplay Session Schema
const gameplaySessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true
  },
  gameName: {
    type: String,
    required: true,
    index: true
  },
  platform: {
    type: String,
    default: ''
  },
  core: {
    type: String,
    default: ''
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  lastPing: {
    type: Date
  }
});

const GameplaySession = mongoose.model('GameplaySession', gameplaySessionSchema);

// Save Backup Schema
const saveBackupSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true
  },
  backupDate: {
    type: Date,
    required: true,
    index: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SaveBackup = mongoose.model('SaveBackup', saveBackupSchema);

// ==================== MONGODB CONNECTION ====================

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ==================== MULTER CONFIGURATION ====================

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userDir = path.join(UPLOAD_DIR, req.user.id);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString('hex');
    cb(null, `backup_${timestamp}_${hash}.tar.gz`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// ==================== AUTHENTICATION MIDDLEWARE ====================

// JWT Token Authentication (for web app)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// API Key Authentication (for R36S device)
const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  try {
    const user = await User.findOne({ apiKey }).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ==================== AUTH ENDPOINTS ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      displayName: displayName || username
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        apiKey: user.apiKey,
        profilePublic: user.profilePublic
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user (allow login with username or email)
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        apiKey: user.apiKey,
        profilePublic: user.profilePublic
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      displayName: req.user.displayName,
      apiKey: req.user.apiKey,
      profilePublic: req.user.profilePublic
    }
  });
});

// Update profile settings
app.patch('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { displayName, profilePublic } = req.body;

    if (displayName !== undefined) {
      req.user.displayName = displayName;
    }
    if (profilePublic !== undefined) {
      req.user.profilePublic = profilePublic;
    }

    await req.user.save();

    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        displayName: req.user.displayName,
        profilePublic: req.user.profilePublic
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Regenerate API key
app.post('/api/auth/regenerate-api-key', authenticateToken, async (req, res) => {
  try {
    req.user.apiKey = crypto.randomBytes(32).toString('hex');
    await req.user.save();

    res.json({
      success: true,
      apiKey: req.user.apiKey
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== DEVICE MANAGEMENT ====================

// Register/update device
app.post('/api/device/register', authenticateApiKey, async (req, res) => {
  try {
    const { deviceId, deviceName } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const device = await Device.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      {
        deviceId,
        deviceName: deviceName || 'R36S Device',
        lastSeen: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      device
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's devices
app.get('/api/device/list', authenticateToken, async (req, res) => {
  try {
    const devices = await Device.find({ userId: req.user._id });
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== GAMEPLAY TRACKING ENDPOINTS ====================

// Start gameplay session
app.post('/api/gameplay/start', authenticateApiKey, async (req, res) => {
  try {
    const { deviceId, gameName, platform, core } = req.body;

    if (!deviceId || !gameName) {
      return res.status(400).json({ error: 'deviceId and gameName are required' });
    }

    const startTime = new Date();
    const date = startTime.toISOString().split('T')[0];

    // Check if there's already an active session
    let session = await GameplaySession.findOne({
      userId: req.user._id,
      deviceId,
      gameName,
      isActive: true
    });

    if (session) {
      // Update existing session
      session.lastPing = startTime;
      await session.save();
    } else {
      // Create new session
      session = new GameplaySession({
        userId: req.user._id,
        deviceId,
        gameName,
        platform,
        core,
        startTime,
        date,
        isActive: true,
        lastPing: startTime
      });
      await session.save();
    }

    // Update device last seen
    await Device.findOneAndUpdate(
      { userId: req.user._id, deviceId },
      { lastSeen: startTime },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Session started',
      sessionId: session._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// End gameplay session
app.post('/api/gameplay/end', authenticateApiKey, async (req, res) => {
  try {
    const { deviceId, gameName } = req.body;

    if (!deviceId || !gameName) {
      return res.status(400).json({ error: 'deviceId and gameName are required' });
    }

    const session = await GameplaySession.findOne({
      userId: req.user._id,
      deviceId,
      gameName,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ error: 'No active session found' });
    }

    const endTime = new Date();
    const duration = Math.floor((endTime - session.startTime) / 1000); // seconds

    session.endTime = endTime;
    session.duration = duration;
    session.isActive = false;
    await session.save();

    res.json({
      success: true,
      message: 'Session ended',
      duration,
      sessionId: session._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Heartbeat
app.post('/api/gameplay/ping', authenticateApiKey, async (req, res) => {
  try {
    const { deviceId, gameName } = req.body;

    const result = await GameplaySession.updateOne(
      {
        userId: req.user._id,
        deviceId,
        gameName,
        isActive: true
      },
      {
        lastPing: new Date()
      }
    );

    res.json({ success: true, updated: result.modifiedCount > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's gameplay statistics
app.get('/api/gameplay/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { userId: req.user._id, isActive: false };

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const sessions = await GameplaySession.find(query).sort({ startTime: -1 });

    // Calculate statistics
    const stats = {
      totalSessions: sessions.length,
      totalPlaytime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      gamesPlayed: [...new Set(sessions.map(s => s.gameName))].length,
      sessions,
      byGame: {},
      byDate: {}
    };

    sessions.forEach(session => {
      // By game
      if (!stats.byGame[session.gameName]) {
        stats.byGame[session.gameName] = {
          gameName: session.gameName,
          platform: session.platform,
          totalPlaytime: 0,
          sessionCount: 0
        };
      }
      stats.byGame[session.gameName].totalPlaytime += session.duration || 0;
      stats.byGame[session.gameName].sessionCount += 1;

      // By date
      if (!stats.byDate[session.date]) {
        stats.byDate[session.date] = {
          date: session.date,
          totalPlaytime: 0,
          sessionCount: 0
        };
      }
      stats.byDate[session.date].totalPlaytime += session.duration || 0;
      stats.byDate[session.date].sessionCount += 1;
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public user profile
app.get('/api/gameplay/public/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.profilePublic) {
      return res.status(403).json({ error: 'This profile is private' });
    }

    const sessions = await GameplaySession.find({
      userId: user._id,
      isActive: false
    }).sort({ startTime: -1 }).limit(100);

    const stats = {
      username: user.username,
      displayName: user.displayName,
      totalSessions: sessions.length,
      totalPlaytime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      gamesPlayed: [...new Set(sessions.map(s => s.gameName))].length,
      recentSessions: sessions.slice(0, 20),
      byGame: {}
    };

    sessions.forEach(session => {
      if (!stats.byGame[session.gameName]) {
        stats.byGame[session.gameName] = {
          gameName: session.gameName,
          platform: session.platform,
          totalPlaytime: 0,
          sessionCount: 0
        };
      }
      stats.byGame[session.gameName].totalPlaytime += session.duration || 0;
      stats.byGame[session.gameName].sessionCount += 1;
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== SAVE BACKUP ENDPOINTS ====================

// Upload backup
app.post('/api/backup', authenticateApiKey, upload.single('backup'), async (req, res) => {
  try {
    const { deviceId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const backup = new SaveBackup({
      userId: req.user._id,
      deviceId,
      backupDate: new Date(),
      filePath: req.file.path,
      fileName: req.file.filename,
      fileSize: req.file.size
    });

    await backup.save();

    res.json({
      success: true,
      message: 'Backup uploaded successfully',
      backupId: backup._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's backups
app.get('/api/backup/list', authenticateToken, async (req, res) => {
  try {
    const backups = await SaveBackup.find({ userId: req.user._id })
      .sort({ backupDate: -1 });
    res.json({ backups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download backup
app.get('/api/backup/download/:backupId', authenticateToken, async (req, res) => {
  try {
    const backup = await SaveBackup.findOne({
      _id: req.params.backupId,
      userId: req.user._id
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    if (!fs.existsSync(backup.filePath)) {
      return res.status(404).json({ error: 'Backup file not found on disk' });
    }

    res.download(backup.filePath, backup.fileName);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete backup
app.delete('/api/backup/:backupId', authenticateToken, async (req, res) => {
  try {
    const backup = await SaveBackup.findOne({
      _id: req.params.backupId,
      userId: req.user._id
    });

    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    // Delete file
    if (fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }

    // Delete from database
    await SaveBackup.deleteOne({ _id: backup._id });

    res.json({ success: true, message: 'Backup deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== UTILITY ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 MongoDB: ${MONGODB_URI}`);
  console.log(`💾 Uploads: ${UPLOAD_DIR}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed');
  process.exit(0);
});

// module.exports = app;