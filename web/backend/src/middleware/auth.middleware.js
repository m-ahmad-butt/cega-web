const { verifyToken } = require('../utils/jwt');
const authRepo = require('../repositories/auth.repository');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const email = payload.email || payload.sub;
    if (!email) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const user = await authRepo.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.isBan) {
      return res.status(403).json({ message: 'Your account has been banned' });
    }

    const role = user.role || payload.role || 'STUDENT';

    req.user = {
      id: user.id || user.email,
      email: user.email,
      role,
      name: user.name,
      module: user.module || null,
      teamId: user.teamId || null,
      groupPrivacy: user.groupPrivacy !== false,
    };

    req.headers['x-user-email'] = user.email;
    req.headers['x-user-role'] = role;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requireAdminOrTeam = (req, res, next) => {
  if (!req.user || !['ADMIN', 'TEAM'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or team access required' });
  }
  next();
};

const requireTeam = (req, res, next) => {
  if (!req.user || req.user.role !== 'TEAM') {
    return res.status(403).json({ message: 'Team access required' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    return authenticate(req, res, next);
  } catch {
    return next();
  }
};

module.exports = {
  authenticate,
  requireAdmin,
  requireAdminOrTeam,
  requireTeam,
  optionalAuth,
};
