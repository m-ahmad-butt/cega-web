const { User, formatDoc, formatDocs } = require('../models');

class AuthRepository {
  async findUserByEmail(email) {
    return formatDoc(await User.findOne({ email }).lean());
  }

  async findUserByToken(token) {
    return formatDoc(
      await User.findOne({
        passwordSetupToken: token,
        passwordSetupExpiry: { $gt: new Date() },
      }).lean()
    );
  }

  async createUser(data) {
    const user = await User.create(data);
    return formatDoc(user);
  }

  async updatePassword(email, hashedPassword) {
    return formatDoc(
      await User.findOneAndUpdate(
        { email },
        { password: hashedPassword, isVerified: true },
        { new: true }
      ).lean()
    );
  }

  async setPasswordSetupToken(email, token, expiry) {
    return formatDoc(
      await User.findOneAndUpdate(
        { email },
        { passwordSetupToken: token, passwordSetupExpiry: expiry },
        { new: true }
      ).lean()
    );
  }

  async clearPasswordSetupToken(email) {
    return formatDoc(
      await User.findOneAndUpdate(
        { email },
        { passwordSetupToken: null, passwordSetupExpiry: null },
        { new: true }
      ).lean()
    );
  }

  async verifyUser(email) {
    return formatDoc(
      await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true }).lean()
    );
  }

  async getAllUsers(skip = 0, take = 20) {
    return formatDocs(
      await User.find().sort({ createdAt: -1 }).skip(skip).limit(take).lean()
    );
  }

  async getUserCount() {
    return User.countDocuments();
  }
}

module.exports = new AuthRepository();
