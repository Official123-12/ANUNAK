const { generatePairingCode } = require('@whiskeysockets/baileys');

class PairCodeManager {
  constructor(sock) {
    this.sock = sock;
    this.activePairs = new Map();
  }

  async generate(phoneNumber) {
    try {
      if (!phoneNumber || !phoneNumber.match(/^\d{10,15}$/)) {
        throw new Error('Invalid phone number format');
      }

      // Format phone number (remove leading 0, add country code if needed)
      let formattedNumber = phoneNumber.trim();
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '255' + formattedNumber.slice(1);
      }

      // Generate pairing code
      const code = await generatePairingCode(this.sock, formattedNumber);

      // Store pair info
      this.activePairs.set(formattedNumber, {
        code,
        timestamp: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
      });

      return {
        success: true,
        code,
        phoneNumber: formattedNumber,
        expiresIn: 300 // seconds
      };
    } catch (error) {
      console.error('Pair code generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  verify(phoneNumber, code) {
    const pair = this.activePairs.get(phoneNumber);
    
    if (!pair) {
      return { success: false, error: 'No active pairing session' };
    }

    if (Date.now() > pair.expiresAt) {
      this.activePairs.delete(phoneNumber);
      return { success: false, error: 'Pairing code expired' };
    }

    if (pair.code !== code) {
      return { success: false, error: 'Invalid pairing code' };
    }

    this.activePairs.delete(phoneNumber);
    return { success: true };
  }

  cleanup() {
    const now = Date.now();
    for (const [phone, data] of this.activePairs.entries()) {
      if (now > data.expiresAt) {
        this.activePairs.delete(phone);
      }
    }
  }
}

module.exports = PairCodeManager;

