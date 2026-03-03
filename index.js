require('dotenv').config();
const express = require('express');
const path = require('path');
const BaileysClient = require('./lib/baileys-client');
const config = require('./config');

const app = express();
const PORT = config.port;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Store bot instance globally
let botInstance = null;

// API Routes
app.post('/api/pair', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone || !phone.match(/^\d{10,15}$/)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid phone number' 
      });
    }
    
    if (!botInstance) {
      return res.status(500).json({ 
        success: false, 
        error: 'Bot not initialized' 
      });
    }
    
    // Generate real pair code using Baileys
    const result = await botInstance.generatePairCode(phone);
    
    if (result.success) {
      res.json({
        success: true,
        pairCode: result.pairCode,
        qrCode: result.qrCode
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Pair API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate pair code'
    });
  }
});

// Check connection status
app.get('/api/status', async (req, res) => {
  try {
    const { phone } = req.query;
    
    if (botInstance && botInstance.sock && botInstance.sock.user) {
      res.json({
        connected: true,
        number: botInstance.sock.user.id,
        phone: phone
      });
    } else {
      res.json({
        connected: false
      });
    }
  } catch (error) {
    res.json({ connected: false });
  }
});

// Start Server + Bot
async function start() {
  // Start web server
  app.listen(PORT, () => {
    console.log(`🌐 Web server: http://localhost:${PORT}`);
    console.log(`📱 Pair Code Website: http://localhost:${PORT}`);
  });
  
  // Start WhatsApp Bot
  botInstance = new BaileysClient();
  await botInstance.init();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🔄 Shutting down...');
    await botInstance.db.close();
    process.exit(0);
  });
}

start().catch(console.error);

