// Global variables
let qrInterval;
let countdownInterval;

// Mobile menu toggle
document.querySelector('.mobile-menu-btn')?.addEventListener('click', () => {
  document.querySelector('.nav-links').classList.toggle('active');
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Commands Slider
const slides = document.querySelectorAll('.command-slide');
const dotsContainer = document.querySelector('.commands-dots');
let currentSlide = 0;

// Create dots
slides.forEach((_, index) => {
  const dot = document.createElement('div');
  dot.className = 'dot' + (index === 0 ? ' active' : '');
  dot.addEventListener('click', () => goToSlide(index));
  dotsContainer?.appendChild(dot);
});

function goToSlide(index) {
  slides[currentSlide]?.classList.remove('active');
  document.querySelector('.commands-dots')?.children[currentSlide]?.classList.remove('active');
  
  currentSlide = index;
  
  slides[currentSlide]?.classList.add('active');
  document.querySelector('.commands-dots')?.children[currentSlide]?.classList.add('active');
}

document.querySelector('.slider-btn.prev')?.addEventListener('click', () => {
  goToSlide(currentSlide > 0 ? currentSlide - 1 : slides.length - 1);
});

document.querySelector('.slider-btn.next')?.addEventListener('click', () => {
  goToSlide(currentSlide < slides.length - 1 ? currentSlide + 1 : 0);
});

// Auto-advance slider
setInterval(() => {
  goToSlide(currentSlide < slides.length - 1 ? currentSlide + 1 : 0);
}, 5000);

// Pair Code Form
const pairForm = document.getElementById('pairForm');
const qrContainer = document.getElementById('qrContainer');
const successDiv = document.getElementById('success');
const countdownEl = document.getElementById('countdown');
const pairCodeEl = document.getElementById('pairCode');
const copyBtn = document.getElementById('copyCode');

pairForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('phone').value.trim();
  
  if (!phone.match(/^\d{10,15}$/)) {
    showToast('Please enter a valid phone number', 'error');
    return;
  }
  
  // Show loading
  const submitBtn = pairForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
  submitBtn.disabled = true;
  
  try {
    // Call backend to generate pair code
    const response = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Hide form, show QR
      pairForm.classList.add('hidden');
      qrContainer.classList.remove('hidden');
      
      // Display pair code (8 digits)
      const generatedCode = data.pairCode || generateRandomCode();
      pairCodeEl.textContent = generatedCode;
      
      // Display QR code (will be updated via WebSocket or polling)
      displayQRCode(data.qrCode);
      
      // Start countdown
      startCountdown(60);
      
      // Poll for connection status
      pollConnectionStatus(phone);
    } else {
      throw new Error(data.error || 'Failed to generate pair code');
    }
  } catch (error) {
    showToast(error.message, 'error');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

// Generate random 8-digit code (fallback)
function generateRandomCode() {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// Display QR Code
function displayQRCode(qrData) {
  const qrDiv = document.getElementById('qrCode');
  
  if (qrData) {
    // If backend returns QR as base64 or URL
    qrDiv.innerHTML = `<img src="${qrData}" alt="QR Code" style="width:100%;height:100%;object-fit:contain" />`;
  } else {
    // Show placeholder while waiting for real QR
    qrDiv.innerHTML = '<i class="fas fa-qrcode"></i>';
    qrDiv.style.fontSize = '4rem';
    qrDiv.style.color = '#00a884';
  }
}

// Countdown timer
function startCountdown(seconds) {
  let timeLeft = seconds;
  countdownEl.textContent = timeLeft;
  
  countdownInterval = setInterval(() => {
    timeLeft--;
    countdownEl.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      showToast('QR Code expired. Please try again.', 'error');
      location.reload();
    }
  }, 1000);
}

// Poll for connection status
async function pollConnectionStatus(phone) {
  const maxAttempts = 30; // 30 seconds
  let attempts = 0;
  
  const checkInterval = setInterval(async () => {
    attempts++;
    
    try {
      const response = await fetch(`/api/status?phone=${phone}`);
      const data = await response.json();
      
      if (data.connected) {
        clearInterval(checkInterval);
        clearInterval(countdownInterval);
        showSuccess(data);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        showToast('Connection timeout. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  }, 1000);
}

// Show success message
function showSuccess(data) {
  qrContainer.classList.add('hidden');
  successDiv.classList.remove('hidden');
  
  document.getElementById('connectedNumber').textContent = data.number || 'Connected';
  document.getElementById('connectedTime').textContent = new Date().toLocaleString();
  
  showToast('Successfully connected!', 'success');
}

// Copy code button
copyBtn?.addEventListener('click', async () => {
  const code = pairCodeEl.textContent;
  
  try {
    await navigator.clipboard.writeText(code);
    showToast('Code copied to clipboard!', 'success');
    
    // Change icon temporarily
    const icon = copyBtn.querySelector('i');
    icon.className = 'fas fa-check';
    setTimeout(() => {
      icon.className = 'fas fa-copy';
    }, 2000);
  } catch (err) {
    showToast('Failed to copy code', 'error');
  }
});

// Toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast ' + type;
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Update QR code via WebSocket (optional - for real-time updates)
function setupWebSocket() {
  // Implementation for WebSocket connection to receive QR updates
  // This would connect to your backend WebSocket server
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('ANNUNAKI Bot Website Loaded');
  // setupWebSocket(); // Uncomment if using WebSocket
});

