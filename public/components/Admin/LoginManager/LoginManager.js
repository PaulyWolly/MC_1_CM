/*
  LOGINMANAGER.JS
  Version: 7
  AppName: MCC_1_CCM [v7]
  Updated: 7/16/2025 @7:00AM
  Created by Paul Welby
*/

// LoginManager.js
(function() {
  let mode = 'login'; // 'login' | 'register' | 'forgot'

  // Get DOM elements when needed
  function getElements() {
    return {
      modal: document.getElementById('login-manager-modal'),
      form: document.getElementById('login-manager-form'),
      title: document.getElementById('login-manager-title'),
      message: document.getElementById('login-manager-message'),
      emailInput: document.getElementById('login-manager-email'),
      passwordInput: document.getElementById('login-manager-password'),
      confirmPasswordField: document.getElementById('login-manager-confirm-password-field'),
      confirmPasswordInput: document.getElementById('login-manager-confirm-password'),
      submitBtn: document.getElementById('login-manager-submit'),
      closeBtn: document.getElementById('close-login-manager-modal'),
      switchRegister: document.getElementById('login-manager-switch-register'),
      switchLogin: document.getElementById('login-manager-switch-login'),
      switchForgot: document.getElementById('login-manager-switch-forgot')
    };
  }

  function setMode(newMode) {
    mode = newMode;
    const elements = getElements();
    
    if (elements.message) elements.message.textContent = '';
    if (mode === 'login') {
      if (elements.title) elements.title.textContent = 'Admin Login';
      if (elements.submitBtn) elements.submitBtn.textContent = 'Login';
      if (elements.confirmPasswordField) elements.confirmPasswordField.style.display = 'none';
      if (elements.switchRegister) elements.switchRegister.style.display = '';
      if (elements.switchLogin) elements.switchLogin.style.display = 'none';
      if (elements.switchForgot) elements.switchForgot.style.display = '';
      if (elements.passwordInput) elements.passwordInput.required = true;
      if (elements.emailInput) elements.emailInput.required = true;
    } else if (mode === 'register') {
      if (elements.title) elements.title.textContent = 'Register New Admin';
      if (elements.submitBtn) elements.submitBtn.textContent = 'Register';
      if (elements.confirmPasswordField) elements.confirmPasswordField.style.display = '';
      if (elements.switchRegister) elements.switchRegister.style.display = 'none';
      if (elements.switchLogin) elements.switchLogin.style.display = '';
      if (elements.switchForgot) elements.switchForgot.style.display = '';
      if (elements.passwordInput) elements.passwordInput.required = true;
      if (elements.emailInput) elements.emailInput.required = true;
      if (elements.confirmPasswordInput) elements.confirmPasswordInput.required = true;
    } else if (mode === 'forgot') {
      if (elements.title) elements.title.textContent = 'Forgot Password';
      if (elements.submitBtn) elements.submitBtn.textContent = 'Send Reset Link';
      if (elements.confirmPasswordField) elements.confirmPasswordField.style.display = 'none';
      if (elements.switchRegister) elements.switchRegister.style.display = '';
      if (elements.switchLogin) elements.switchLogin.style.display = '';
      if (elements.switchForgot) elements.switchForgot.style.display = 'none';
      if (elements.passwordInput) elements.passwordInput.required = false;
      if (elements.confirmPasswordInput) elements.confirmPasswordInput.required = false;
    }
    if (elements.form) elements.form.reset();
  }

  function showModal() {
    const elements = getElements();
    if (elements.modal) {
      console.log('🔧 [LoginManager] Showing modal');
      elements.modal.style.display = 'flex';
    } else {
      console.error('🔧 [LoginManager] Modal element not found');
    }
  }
  
  function hideModal() {
    const elements = getElements();
    if (elements.modal) {
      elements.modal.style.display = 'none';
    }
  }

  function setMessage(msg, isSuccess) {
    const elements = getElements();
    if (elements.message) {
      elements.message.textContent = msg;
      elements.message.className = 'login-manager-message' + (isSuccess ? ' success' : '');
  }
  }

  // Initialize event handlers only if elements exist
  function initializeEventHandlers() {
    const elements = getElements();

  // Switch mode links
    if (elements.switchRegister) {
      elements.switchRegister.onclick = function(e) { e.preventDefault(); setMode('register'); };
    }
    if (elements.switchLogin) {
      elements.switchLogin.onclick = function(e) { e.preventDefault(); setMode('login'); };
    }
    if (elements.switchForgot) {
      elements.switchForgot.onclick = function(e) { e.preventDefault(); setMode('forgot'); };
    }

  // Close modal (optional, for future use)
    if (elements.closeBtn) elements.closeBtn.onclick = hideModal;

    // Cancel button logic
    const cancelBtn = document.getElementById('login-manager-cancel');
    if (cancelBtn) {
      cancelBtn.onclick = function(e) {
        e.preventDefault();
        hideModal();
      };
    }

  // Form submit handler
    if (elements.form) {
      elements.form.onsubmit = async function(e) {
    e.preventDefault();
    setMessage('');
        const email = elements.emailInput ? elements.emailInput.value.trim() : '';
        const password = elements.passwordInput ? elements.passwordInput.value : '';
    if (mode === 'register') {
          const confirmPassword = elements.confirmPasswordInput ? elements.confirmPasswordInput.value : '';
      if (password !== confirmPassword) {
        setMessage('Passwords do not match.');
        return;
      }
    }
        if (elements.submitBtn) elements.submitBtn.disabled = true;
    try {
      let res, data;
      if (mode === 'login') {
        // If superadmin email, use special endpoint
        if (email.toLowerCase() === 'superadmin@system.local') {
          res = await fetch('/api/auth/superadmin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
        } else {
          res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
        }
      } else if (mode === 'register') {
        res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
      } else if (mode === 'forgot') {
        res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
      }
      data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unknown error');
      if (mode === 'login' || mode === 'register') {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('authUser', JSON.stringify(data.user));
        setMessage('Login successful!', true);
        setTimeout(() => {
          hideModal();
          if (typeof window.LoginManager.onLogin === 'function') window.LoginManager.onLogin(data.user);
        }, 800);
      } else if (mode === 'forgot') {
        setMessage('If this email exists, a reset link will be sent.', true);
      }
    } catch (err) {
      setMessage(err.message || 'Login failed.');
    } finally {
          if (elements.submitBtn) elements.submitBtn.disabled = false;
    }
  };
    }
  }

  // Expose check function
  window.LoginManager = {
    checkAuth: async function() {
      console.log('🔧 [LoginManager] checkAuth() called');
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('🔧 [LoginManager] No token found, showing login modal');
        setMode('login');
        initializeEventHandlers(); // Initialize handlers before showing modal
        showModal();
        return false;
      }
      // Verify token with backend
      try {
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('Invalid or expired token');
        localStorage.setItem('authUser', JSON.stringify(data.user));
        return true;
      } catch (err) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        console.log('🔧 [LoginManager] Token invalid, showing login modal');
        setMode('login');
        initializeEventHandlers(); // Initialize handlers before showing modal
        showModal();
        return false;
      }
    },
    logout: function() {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      setMode('login');
      initializeEventHandlers(); // Initialize handlers before showing modal
      showModal();
    },
    onLogin: null // Settable callback for successful login
  };

  // On load, initialize event handlers if DOM is ready
  if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
      initializeEventHandlers();
  });
  } else {
    // DOM is already loaded
    initializeEventHandlers();
  }
})(); 