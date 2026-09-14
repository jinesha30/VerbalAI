# Learning Ability Assessment System

A comprehensive web application for evaluating the learning abilities of primary and secondary school students (Grades 1-12) through AI-powered speech recognition.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🎯 Overview

This application provides an interactive platform where students can:
- Register and login with secure credentials
- Take voice-based assessments with grade-appropriate content
- Record 15-second audio responses
- Receive instant AI-powered feedback on pronunciation accuracy
- Track assessment history and performance

## ✨ Key Features

- **Student Management**: Secure registration and authentication system
- **Grade-Based Content**: Customized assessments for grades 1-12
- **AI Speech Recognition**: OpenAI Whisper model for accurate transcription
- **Real-time Evaluation**: 95% similarity threshold for precision
- **Position-Based Matching**: Order-aware word verification
- **Progress Tracking**: MongoDB storage for assessment history
- **Automated Startup**: PowerShell script for easy launching

## 🛠️ Tech Stack

### Frontend
- React 18.2.0
- React Router DOM 6.20.1
- Axios 1.6.2
- CSS3 with responsive design

### Backend
- Node.js with Express 4.18.2
- MongoDB with Mongoose 8.0.3
- Multer for file uploads
- CORS enabled

### ML Service
- Python 3.x
- Flask 2.3.3
- OpenAI Whisper (Base Model)
- FFmpeg for audio processing
- difflib for similarity matching

## 📋 Prerequisites

- Node.js (v14 or higher)
- Python 3.x
- MongoDB (local or cloud)
- FFmpeg

## ⚙️ Configuration

### Backend Configuration

1. **Create environment file**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` file with your settings:**
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/learning_assessment_db
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # JWT Configuration (IMPORTANT: Change in production!)
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=24h
   
   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   
   # Python Whisper Service URL
   WHISPER_SERVICE_URL=http://localhost:5001
   ```

### Frontend Configuration

1. **Create environment file**
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Edit `.env` file with your settings:**
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_ENV=development
   ```

### Security Notes

- 🔒 **Always change the `JWT_SECRET` in production!**
- 🔐 **Use a strong, random secret key (at least 32 characters)**
- 🛡️ **Never commit `.env` files to version control**
- 🔑 **Rotate JWT secrets periodically**

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Learning-Ability-Assessment.git
   cd Learning-Ability-Assessment
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd ../backend
   npm install
   ```

4. **Install Python Dependencies**
   ```bash
   pip install flask flask-cors openai-whisper
   ```

5. **Install FFmpeg**
   - Download from [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html)
   - Add to system PATH

6. **Setup MongoDB**
   - Install MongoDB or use MongoDB Atlas
   - Ensure MongoDB is running on `localhost:27017`
   - Or set custom URI in `backend/server.js`

## 💻 Running the Application

### Quick Start (Windows)
```bash
.\start-app.ps1
```

### Manual Startup

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Start Backend Server**
   ```bash
   cd backend
   node server.js
   ```

3. **Start Whisper Service**
   ```bash
   cd backend
   python whisper_service.py
   ```

4. **Start Frontend**
   ```bash
   cd frontend
   npm start
   ```

5. Open browser to `http://localhost:3000`

## 📊 System Architecture

```
Frontend (React - Port 3000)
    ↓
Backend API (Express - Port 5000)
    ↓
Whisper ML Service (Flask - Port 5001)
    ↓
MongoDB (Port 27017)
```

## 🎓 Grade-Based Content

- **Grades 1-3**: Animals (CAT, DOG, BIRD)
- **Grades 4-6**: Fruits (APPLE, BANANA, ORANGE)
- **Grades 7-9**: Objects (BOOK, COMPUTER, PHONE)
- **Grades 10-12**: Advanced (ELEPHANT, LION, TIGER)

## 🔒 Privacy & Security

- Passwords stored in MongoDB (⚠️ Production: Use bcrypt hashing)
- No sensitive data in repository (.gitignore configured)
- Audio files stored temporarily and not committed
- Environment variables supported via .env files

## 📝 API Endpoints

- `POST /api/register` - Register new student
- `POST /api/login` - Student authentication
- `POST /api/assess` - Submit audio assessment
- `GET /api/student/:id/history` - Get assessment history
- `GET /api/stats` - Get system statistics

## 🤖 How It Works

1. Student logs in with credentials
2. Grade-appropriate image cards displayed
3. Student records 15-second audio speaking card names
4. Audio sent to Whisper AI for transcription
5. Position-based word matching (95% similarity threshold)
6. Results displayed with detailed analysis
7. Assessment saved to MongoDB

## 📈 Future Enhancements

- [ ] Password hashing with bcrypt
- [ ] JWT authentication
- [ ] HTTPS for production
- [ ] Multi-language support
- [ ] Progress dashboard with analytics
- [ ] Mobile-responsive improvements
- [ ] Cloud deployment (AWS/Azure)
- [ ] Email notifications

## 🐛 Known Issues

- Passwords stored in plaintext (use bcrypt in production)
- No rate limiting on API endpoints
- Audio files not automatically cleaned up

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Created as a learning ability assessment tool for educational purposes.

## 🙏 Acknowledgments

- OpenAI Whisper for speech recognition
- MongoDB for database solutions
- React team for the frontend framework
- Express.js for the backend framework

---

**Note**: This is an educational project. For production use, implement proper security measures including password hashing, JWT authentication, and HTTPS.
