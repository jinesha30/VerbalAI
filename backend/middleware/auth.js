const jwt = require('jsonwebtoken');

// Secret key for JWT (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 * @param {Object} user - User object (student or admin)
 * @param {string} userType - Type of user ('student' or 'admin')
 * @returns {string} JWT token
 */
function generateToken(user, userType) {
  const payload = {
    id: user._id || user.id,
    username: user.username,
    userType: userType,
    // Add role for admins
    ...(userType === 'admin' && { role: user.role, schoolId: user.schoolId })
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token middleware
 * Adds decoded user data to req.user
 */
function verifyToken(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NO_TOKEN' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user data to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN' 
      });
    }

    return res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED' 
    });
  }
}

/**
 * Verify user is a student
 */
function verifyStudent(req, res, next) {
  if (req.user.userType !== 'student') {
    return res.status(403).json({ 
      error: 'Access denied. Students only.',
      code: 'NOT_STUDENT' 
    });
  }
  next();
}

/**
 * Verify user is an admin
 */
function verifyAdmin(req, res, next) {
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ 
      error: 'Access denied. Admins only.',
      code: 'NOT_ADMIN' 
    });
  }
  next();
}

/**
 * Verify user is a system admin
 */
function verifySystemAdmin(req, res, next) {
  if (req.user.userType !== 'admin' || req.user.role !== 'system_admin') {
    return res.status(403).json({ 
      error: 'Access denied. System admins only.',
      code: 'NOT_SYSTEM_ADMIN' 
    });
  }
  next();
}

/**
 * Verify user is a school admin
 */
function verifySchoolAdmin(req, res, next) {
  if (req.user.userType !== 'admin' || req.user.role !== 'school_admin') {
    return res.status(403).json({ 
      error: 'Access denied. School admins only.',
      code: 'NOT_SCHOOL_ADMIN' 
    });
  }
  next();
}

/**
 * Verify student can only access their own data
 * Expects :studentId parameter in route
 */
function verifyOwnData(req, res, next) {
  const studentId = req.params.studentId;
  
  if (req.user.userType === 'student' && req.user.id !== studentId) {
    return res.status(403).json({ 
      error: 'Access denied. You can only access your own data.',
      code: 'NOT_AUTHORIZED' 
    });
  }
  
  // Admins can access any student data
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  verifyStudent,
  verifyAdmin,
  verifySystemAdmin,
  verifySchoolAdmin,
  verifyOwnData,
  JWT_SECRET
};
