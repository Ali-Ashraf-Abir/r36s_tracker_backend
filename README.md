# 🎮 R36S Gameplay Tracker Backend

A complete multi-user backend server for tracking gameplay sessions and managing save backups from R36S handheld gaming devices. Features user authentication, private/public profiles, and automatic gameplay tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/mongodb-5.0%2B-green.svg)

## ✨ Features

- 🔐 **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- 👤 **Multi-user Support** - Each user has their own gameplay data and save backups
- 🌐 **Public Profiles** - Users can make their gameplay stats public (optional)
- 📊 **Gameplay Tracking** - Automatic session tracking with duration calculation
- 💾 **Save Backups** - Upload, store, and download game save files
- 🔑 **API Key System** - Secure API keys for R36S device authentication
- 📱 **Device Management** - Track multiple devices per user
- 🗄️ **MongoDB** - Production-ready NoSQL database
- 🚀 **Deployment Ready** - Easy deployment to Heroku, Railway, or any Node.js host

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [MongoDB Setup](#mongodb-setup)
- [Configuration](#configuration)
- [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Security](#security)
- [Contributing](#contributing)

## 🔧 Prerequisites

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v5.0 or higher) - Choose one:
  - [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (Free cloud database - Recommended)
  - [Local MongoDB](https://www.mongodb.com/try/download/community) (For development)
- **npm** or **yarn** (comes with Node.js)

## 📦 Installation

### 1. Clone or Download the Repository

```bash
git clone https://github.com/yourusername/r36s-tracker-backend.git
cd r36s-tracker-backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- `express` - Web framework
- `mongoose` - MongoDB object modeling
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `multer` - File upload handling
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management

## 🗄️ MongoDB Setup

You have two options for MongoDB:

### Option A: MongoDB Atlas (Recommended - Free Cloud Database)

1. **Create Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up (free)

2. **Create Cluster**:
   - Click "Build a Database"
   - Choose "FREE" tier (M0)
   - Select a cloud provider and region (choose closest to you)
   - Click "Create Cluster"

3. **Configure Network Access**:
   - Go to "Network Access" in left sidebar
   - Click "Add IP Address"
   - For testing: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your server's IP address
   - Click "Confirm"

4. **Create Database User**:
   - Go to "Database Access" in left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `r36s_admin` (or your choice)
   - Password: Generate a strong password (save it!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

5. **Get Connection String**:
   - Go to "Database" in left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Select "Node.js" and version "4.1 or later"
   - Copy the connection string, it looks like:
   ```
   mongodb+srv://r36s_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - Replace `<password>` with your actual password
   - Add database name before the `?`: `...mongodb.net/r36s-tracker?retryWrites=true...`

6. **Save to .env**:
   ```env
   MONGODB_URI=mongodb+srv://r36s_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/r36s-tracker?retryWrites=true&w=majority
   ```

### Option B: Local MongoDB (For Development)

1. **Install MongoDB**:
   - **macOS**: `brew install mongodb-community`
   - **Ubuntu**: `sudo apt-get install mongodb`
   - **Windows**: Download installer from [MongoDB Download Center](https://www.mongodb.com/try/download/community)

2. **Start MongoDB**:
   ```bash
   # macOS/Linux
   sudo systemctl start mongod
   # or
   mongod --dbpath /path/to/data/directory
   
   # Windows
   # Run as service or: mongod.exe --dbpath C:\data\db
   ```

3. **Verify it's running**:
   ```bash
   mongosh
   # You should see: "Connecting to: mongodb://127.0.0.1:27017"
   ```

4. **Use local connection** in `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/r36s-tracker
   ```

## ⚙️ Configuration

### 1. Create `.env` File

Copy the example environment file:

```bash
cp .env.example .env
```

### 2. Edit `.env` File

```env
# Server Port
PORT=3000

# MongoDB Connection (use your connection string from above)
MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/r36s-tracker

# JWT Secret (IMPORTANT: Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Environment
NODE_ENV=development
```

### 3. Generate Secure JWT Secret

Run this command to generate a secure random JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as your `JWT_SECRET` in `.env`

## 🚀 Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

You should see:
```
✅ Connected to MongoDB
🚀 Backend server running on port 3000
📊 MongoDB: mongodb+srv://...
💾 Uploads: /path/to/uploads/saves
```

### Test the Server

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": 1234567890,
  "mongodb": "connected"
}
```

## 📚 API Documentation

### Authentication Endpoints

#### Register New User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@example.com",
  "password": "secure123",
  "displayName": "Player One" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "player1",
    "email": "player1@example.com",
    "displayName": "Player One",
    "apiKey": "abc123def456...",
    "profilePublic": false
  }
}
```

**Save the API key!** You'll need it for your R36S device.

#### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "player1",  // or email
  "password": "secure123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Update Profile Settings

```bash
PATCH /api/auth/profile
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "displayName": "New Name",
  "profilePublic": true  // Allow others to see your gameplay stats
}
```

#### Regenerate API Key

```bash
POST /api/auth/regenerate-api-key
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "success": true,
  "apiKey": "new_api_key_here"
}
```

### Device Management

#### Register Device (First time from R36S)

```bash
POST /api/device/register
X-API-Key: YOUR_API_KEY
Content-Type: application/json

{
  "deviceId": "r36s_abc123",
  "deviceName": "My R36S" // optional
}
```

#### List User's Devices

```bash
GET /api/device/list
Authorization: Bearer YOUR_JWT_TOKEN
```

### Gameplay Tracking

#### Start Session (from R36S)

```bash
POST /api/gameplay/start
X-API-Key: YOUR_API_KEY
Content-Type: application/json

{
  "deviceId": "r36s_abc123",
  "gameName": "Super Mario Bros 3",
  "platform": "NES",
  "core": "fceumm"
}
```

#### End Session (from R36S)

```bash
POST /api/gameplay/end
X-API-Key: YOUR_API_KEY
Content-Type: application/json

{
  "deviceId": "r36s_abc123",
  "gameName": "Super Mario Bros 3"
}
```

#### Heartbeat (Keep session alive)

```bash
POST /api/gameplay/ping
X-API-Key: YOUR_API_KEY
Content-Type: application/json

{
  "deviceId": "r36s_abc123",
  "gameName": "Super Mario Bros 3"
}
```

Send this every 1-2 minutes while playing to keep the session active.

#### Get Your Statistics

```bash
GET /api/gameplay/stats
Authorization: Bearer YOUR_JWT_TOKEN

# Optional: Filter by date range
GET /api/gameplay/stats?startDate=2025-01-01&endDate=2025-01-31
```

**Response:**
```json
{
  "totalSessions": 45,
  "totalPlaytime": 54000,
  "gamesPlayed": 8,
  "sessions": [...],
  "byGame": {
    "Super Mario Bros 3": {
      "gameName": "Super Mario Bros 3",
      "platform": "NES",
      "totalPlaytime": 7200,
      "sessionCount": 5
    }
  },
  "byDate": {
    "2025-01-15": {
      "date": "2025-01-15",
      "totalPlaytime": 10800,
      "sessionCount": 3
    }
  }
}
```

#### View Public Profile

```bash
GET /api/gameplay/public/player1
```

This works without authentication if the user has `profilePublic: true`.

### Save Backups

#### Upload Backup (from R36S)

```bash
POST /api/backup
X-API-Key: YOUR_API_KEY
Content-Type: multipart/form-data

deviceId: r36s_abc123
backup: [file.tar.gz]
```

#### List Your Backups

```bash
GET /api/backup/list
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Download Backup

```bash
GET /api/backup/download/BACKUP_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

#### Delete Backup

```bash
DELETE /api/backup/BACKUP_ID
Authorization: Bearer YOUR_JWT_TOKEN
```

### Utility Endpoints

#### Health Check

```bash
GET /api/health
```

## 🚢 Deployment

### Option 1: Railway.app (Easiest - Recommended)

Railway provides free MongoDB hosting and easy deployment.

1. **Create Account**: Go to [Railway.app](https://railway.app/) and sign up with GitHub

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add MongoDB**:
   - In your project, click "New"
   - Select "Database" → "Add MongoDB"
   - Railway will automatically create a MongoDB instance
   - Copy the connection string from the MongoDB service variables

4. **Configure Environment Variables**:
   - Click on your service
   - Go to "Variables" tab
   - Add:
     ```
     MONGODB_URI=mongodb://mongo.railway.internal:27017/r36s-tracker
     JWT_SECRET=your_generated_secret_here
     PORT=3000
     NODE_ENV=production
     ```

5. **Deploy**:
   - Railway automatically deploys on push
   - Get your public URL from the "Settings" tab
   - Example: `https://your-app.up.railway.app`

### Option 2: Heroku

1. **Install Heroku CLI**: [Download](https://devcenter.heroku.com/articles/heroku-cli)

2. **Create App**:
   ```bash
   heroku login
   heroku create r36s-tracker
   ```

3. **Add MongoDB Atlas**:
   - Use MongoDB Atlas (free tier)
   - Get connection string from Atlas

4. **Set Environment Variables**:
   ```bash
   heroku config:set MONGODB_URI="your_mongodb_atlas_connection_string"
   heroku config:set JWT_SECRET="your_generated_secret"
   heroku config:set NODE_ENV=production
   ```

5. **Deploy**:
   ```bash
   git push heroku main
   ```

6. **Open App**:
   ```bash
   heroku open
   ```

### Option 3: VPS (DigitalOcean, Linode, AWS EC2)

1. **SSH into server**:
   ```bash
   ssh user@your-server.com
   ```

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install MongoDB** (or use Atlas):
   ```bash
   # Follow MongoDB installation guide for your OS
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```

4. **Clone and setup**:
   ```bash
   git clone your-repo-url
   cd r36s-tracker-backend
   npm install --production
   ```

5. **Create .env file**:
   ```bash
   nano .env
   # Add your environment variables
   ```

6. **Use PM2 for process management**:
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name r36s-backend
   pm2 startup
   pm2 save
   ```

7. **Setup Nginx reverse proxy** (optional but recommended):
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/r36s-tracker
   ```

   Add:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   Enable:
   ```bash
   sudo ln -s /etc/nginx/sites-available/r36s-tracker /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## 🔒 Security

### Important Security Notes

1. **Never commit `.env` file** - It contains secrets!
2. **Use strong JWT_SECRET** - Generate with crypto (see Configuration section)
3. **Use HTTPS in production** - Especially important for login/registration
4. **Validate all inputs** - The server does basic validation, but add more as needed
5. **Rate limiting** - Consider adding rate limiting for production:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Authentication Flow

1. **Web App Authentication**: Uses JWT tokens
   - User logs in → Receives JWT token
   - Include token in requests: `Authorization: Bearer TOKEN`
   - Token expires in 30 days

2. **R36S Device Authentication**: Uses API keys
   - User registers → Receives API key
   - Include API key in requests: `X-API-Key: YOUR_KEY`
   - API key never expires (until regenerated)

## 📊 Database Collections

The server automatically creates these MongoDB collections:

- **users** - User accounts and authentication
- **devices** - Registered R36S devices
- **gameplaysessions** - Gameplay tracking data
- **savebackups** - Save file backup metadata

## 🧪 Testing

### Test User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123"
  }'
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "test123"
  }'
```

Save the token and API key from the response!

### Test Gameplay Tracking

```bash
# Start session
curl -X POST http://localhost:3000/api/gameplay/start \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test_device",
    "gameName": "Test Game",
    "platform": "TEST"
  }'

# End session
curl -X POST http://localhost:3000/api/gameplay/end \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "test_device",
    "gameName": "Test Game"
  }'

# Get stats
curl http://localhost:3000/api/gameplay/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Error: "MongoNetworkError: connect ECONNREFUSED"**
- Local MongoDB: Make sure MongoDB is running (`mongod`)
- Atlas: Check network access settings, verify connection string

**Error: "Authentication failed"**
- Check username and password in connection string
- Verify database user permissions in Atlas

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 [PID]

# Or use a different port
PORT=3001 npm start
```

### Upload Errors

**Error: "File too large"**
- Increase multer limit in server.js
- Default is 500MB

**Error: "ENOENT: no such file or directory"**
- Server will auto-create uploads directory
- Check file permissions

### JWT Errors

**Error: "Invalid or expired token"**
- Token expired (30 days) - User needs to login again
- JWT_SECRET changed - All tokens invalidated
- Token not included in request

## 📁 Project Structure

```
r36s-tracker-backend/
├── server.js              # Main server file
├── package.json          # Dependencies
├── .env                  # Environment variables (DO NOT COMMIT)
├── .env.example          # Example environment file
├── .gitignore           # Git ignore rules
├── README.md            # This file
└── uploads/             # Upload directory (auto-created)
    └── saves/
        └── [userId]/
            └── backup_*.tar.gz
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check this README thoroughly
2. Verify your `.env` configuration
3. Check server logs for error messages
4. Test with curl commands provided above
5. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Your environment (Node version, OS, etc.)

## 🎯 Next Steps

Now that your backend is set up:

1. ✅ **Deploy your backend** to Railway/Heroku
2. 📝 **Note your server URL** (e.g., `https://your-app.railway.app`)
3. 🔧 **Create R36S tracking scripts** to send data to your backend
4. 🎨 **Build a frontend dashboard** to visualize your gameplay data

Need help with the R36S scripts or frontend? Let me know!