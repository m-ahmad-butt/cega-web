const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const authRepo = require('../repositories/auth.repository');
const emailService = require('../services/email.service');
const { signToken } = require('../utils/jwt');

const toSafeUser = (user) => {
  const { password, passwordSetupToken, passwordSetupExpiry, ...safeUser } = user;
  return safeUser;
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    if (!password) return res.status(400).json({ message: 'Password is required' });

    const user = await authRepo.findUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isVerified) return res.status(403).json({ message: 'Please set up your password first' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ message: 'Invalid credentials' });

    const safeUser = toSafeUser(user);
    const token = signToken(safeUser);

    res.status(200).json({ message: 'Login successful', token, user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const setupPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const user = await authRepo.findUserByToken(token);
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashed = await bcrypt.hash(password, 10);
    await authRepo.updatePassword(user.email, hashed);
    await authRepo.clearPasswordSetupToken(user.email);

    res.status(200).json({ message: 'Password set successfully. You can now login.' });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await authRepo.findUserByEmail(email);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await authRepo.setPasswordSetupToken(email, token, expiry);

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    try {
      await emailService.sendPasswordReset(email, user.fullName, resetLink);
    } catch (err) {
      console.error('[Email] Password reset email failed:', err.message);
    }

    res.status(200).json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const user = await authRepo.findUserByToken(token);
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });

    const hashed = await bcrypt.hash(password, 10);
    await authRepo.updatePassword(user.email, hashed);
    await authRepo.clearPasswordSetupToken(user.email);

    res.status(200).json({ message: 'Password reset successfully. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, setupPassword, forgotPassword, resetPassword };
