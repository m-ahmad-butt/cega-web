const authRepo = require('../repositories/auth.repository');

class CleanupService {
  constructor() {
    this.intervalId = null;
  }

  start() {
    console.log('Starting cleanup service - runs every 10 minutes');
    this.cleanup();
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Cleanup service stopped');
    }
  }

  async cleanup() {
    try {
      // Clean expired password setup tokens
      const { User } = require('../models');
      const result = await User.updateMany(
        { passwordSetupExpiry: { $lt: new Date() }, passwordSetupToken: { $ne: null } },
        { passwordSetupToken: null, passwordSetupExpiry: null }
      );
      if (result.modifiedCount > 0) {
        console.log(`[Cleanup] Cleared ${result.modifiedCount} expired setup tokens`);
      }
    } catch (error) {
      console.error('[Cleanup] Error:', error.message);
    }
  }
}

module.exports = new CleanupService();
