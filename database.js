const mongoose = require('mongoose');

class Database {
  constructor(mongodbUrl) {
    this.mongodbUrl = mongodbUrl;
    this.connection = null;
  }

  async connect() {
    try {
      if (!this.mongodbUrl) {
        console.log('⚠️  MongoDB URL not provided, skipping database connection');
        return;
      }

      this.connection = await mongoose.connect(this.mongodbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });

      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error.message);
      console.log('⚠️  Bot will work without database');
    }
  }

  async saveSession(userId, creds) {
    try {
      if (!this.connection || !userId) return;
      
      const Session = this.getSessionModel();
      await Session.findOneAndUpdate(
        { userId },
        { userId, creds, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  async getSession(userId) {
    try {
      if (!this.connection || !userId) return null;
      
      const Session = this.getSessionModel();
      return await Session.findOne({ userId });
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  getSessionModel() {
    return mongoose.model('Session', new mongoose.Schema({
      userId: String,
      creds: Object,
      updatedAt: { type: Date, default: Date.now }
    }));
  }

  async close() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        console.log('📴 MongoDB disconnected');
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}

module.exports = Database;

