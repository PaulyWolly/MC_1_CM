/*
  LOGINMANAGER.JS
  Version: 24
  AppName: mc_1_cm [v24]
  Updated: 9/8/2025 @9:30AM
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
      
      // Retry setting up event handlers when modal is shown
      setTimeout(() => {
        initializeEventHandlers();
      }, 100);
    } else {
      console.error('🔧 [LoginManager] Modal element not found');
    }
  }
  
  function hideModal() {
    const elements = getElements();
    if (elements.modal) {
      elements.modal.style.display = 'none';
      
      // Disable login modal display after hiding to prevent automatic showing
      if (window.LoginManager && typeof window.LoginManager.disableLoginModal === 'function') {
        window.LoginManager.disableLoginModal();
      }
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

    // Cancel button logic - with retry mechanism
    const cancelBtn = document.getElementById('login-manager-cancel');
    if (cancelBtn) {
      console.log('🔧 [LoginManager] Cancel button found, setting up event handler');
      cancelBtn.onclick = function(e) {
        e.preventDefault();
        console.log('🔧 [LoginManager] Cancel button clicked, returning to main app');
        
        // Show toast notification instead of blocking alert
        if (window.toastManager && typeof window.toastManager.showToast === 'function') {
          window.toastManager.showToast('❌ Login cancelled - returning to main app', 'info');
        } else if (window.ToastManager && typeof window.ToastManager.show === 'function') {
          // Alternative ToastManager reference
          window.ToastManager.show('❌ Login cancelled - returning to main app', 'info');
        } else {
          console.log('🔧 [LoginManager] ToastManager not available, proceeding with cancel action');
        }
        
        // Hide the login modal
        hideModal();
        
        // Disable login modal display after cancellation
        if (window.LoginManager && typeof window.LoginManager.disableLoginModal === 'function') {
          window.LoginManager.disableLoginModal();
        }
        
        // Use AdminPanel's cancel handler if available
        if (window.adminPanel && typeof window.adminPanel.handleCancel === 'function') {
          console.log('🔧 [LoginManager] Using AdminPanel cancel handler');
          window.adminPanel.handleCancel();
        } else {
          // Fallback: manually close Admin panel and return to main app
          console.log('🔧 [LoginManager] Using fallback cancel handling');
          console.log('🔧 [LoginManager] window.adminPanel:', window.adminPanel);
          console.log('🔧 [LoginManager] typeof window.adminPanel.handleCancel:', typeof window.adminPanel?.handleCancel);
          
          // Close the Admin panel and return to main app
          if (window.adminPanel && typeof window.adminPanel.hide === 'function') {
            window.adminPanel.hide();
          }
          
          // Also try to close any AdminPanel instances that might be open
          const adminPanelContainer = document.getElementById('admin-panel-container');
          if (adminPanelContainer) {
            adminPanelContainer.style.display = 'none';
          }
          
          // Ensure the main app is visible
          const mainApp = document.querySelector('.chat-container, .main-content, #app');
          if (mainApp) {
            mainApp.style.display = 'block';
          }
        }
        
        console.log('🔧 [LoginManager] Successfully returned to main app');
      };
    } else {
      console.warn('🔧 [LoginManager] Cancel button not found, will retry when modal is shown');
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
        
        console.log('🔧 [LoginManager] Login successful, calling onLogin callback...');
        console.log('🔧 [LoginManager] _postLoginIntent:', window._postLoginIntent);
        console.log('🔧 [LoginManager] window.adminPanel available:', !!window.adminPanel);
        console.log('🔧 [LoginManager] window.LoginManager.onLogin available:', typeof window.LoginManager.onLogin);
        
        setTimeout(() => {
          hideModal();
          
          // Disable login modal display after use to prevent automatic showing
          this.disableLoginModal();
          
          // Handle post-login intent for admin access
          if (window._postLoginIntent === 'admin') {
            console.log('🔧 [LoginManager] Post-login intent: admin, opening admin panel...');
            // Clear the intent
            window._postLoginIntent = null;
            
            // Instead of calling adminPanel.show() directly, let the onLogin callback handle it
            // This ensures proper coordination between LoginManager and AdminPanel
            if (typeof window.LoginManager.onLogin === 'function') {
              console.log('🔧 [LoginManager] Executing onLogin callback for admin access...');
              window.LoginManager.onLogin(data.user);
            } else {
              console.warn('🔧 [LoginManager] No onLogin callback registered, falling back to direct show...');
              // Fallback: try to open admin panel directly
              if (window.adminPanel && typeof window.adminPanel.show === 'function') {
                console.log('🔧 [LoginManager] AdminPanel available, calling show() as fallback...');
                setTimeout(() => {
                  window.adminPanel.show();
                }, 100);
              }
            }
          } else {
            // Call the onLogin callback if it exists
            if (typeof window.LoginManager.onLogin === 'function') {
              console.log('🔧 [LoginManager] Executing onLogin callback...');
              window.LoginManager.onLogin(data.user);
            } else {
              console.warn('🔧 [LoginManager] No onLogin callback registered');
            }
          }
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
    // Flag to prevent automatic login modal display
    _preventAutoShow: true,
    
    checkAuth: async function() {
      console.log('🔧 [LoginManager] checkAuth() called');
      
      // Check if we already have a valid user stored
      const storedUser = localStorage.getItem('authUser');
      const token = localStorage.getItem('authToken');
      
      if (storedUser && token) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id) {
            console.log('🔧 [LoginManager] User already authenticated:', user.email);
            // Don't show login modal if user is already authenticated
            return true;
          }
        } catch (e) {
          console.warn('🔧 [LoginManager] Invalid stored user data, clearing...');
          localStorage.removeItem('authUser');
          localStorage.removeItem('authToken');
        }
      }
      
      // Check if user is authenticated via main app and convert to admin
      const jwtToken = localStorage.getItem('jwtToken');
      if (jwtToken && !token) {
        console.log('🔧 [LoginManager] JWT token found, attempting to convert main app auth to admin...');
        try {
          const res = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: jwtToken })
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            // Convert main app auth to admin auth
            localStorage.setItem('authToken', jwtToken);
            localStorage.setItem('authUser', JSON.stringify(data.user));
            console.log('🔧 [LoginManager] Successfully converted main app auth to admin:', data.user.email);
            return true;
          }
        } catch (err) {
          console.warn('🔧 [LoginManager] Failed to convert main app auth to admin:', err);
        }
      }
      
      if (!token) {
        console.log('🔧 [LoginManager] No token found, checking if should show login modal...');
        
        // Only show login modal if explicitly requested (not automatic)
        if (this._preventAutoShow) {
          console.log('🔧 [LoginManager] Auto-show disabled, not showing login modal');
          return false;
        }
        
        console.log('🔧 [LoginManager] Showing login modal as requested');
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
        
        // Update stored user data
        localStorage.setItem('authUser', JSON.stringify(data.user));
        console.log('🔧 [LoginManager] Token verified successfully');
        return true;
      } catch (err) {
        console.log('🔧 [LoginManager] Token invalid, clearing and checking if should show login modal...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        
        // Only show login modal if explicitly requested (not automatic)
        if (this._preventAutoShow) {
          console.log('🔧 [LoginManager] Auto-show disabled, not showing login modal');
          return false;
        }
        
        console.log('🔧 [LoginManager] Showing login modal as requested');
        setMode('login');
        initializeEventHandlers(); // Initialize handlers before showing modal
        showModal();
        return false;
      }
    },
    
    // Method to hide the login modal
    hideModal: function() {
      console.log('🔧 [LoginManager] hideModal() called');
      hideModal();
    },
    
    logout: function() {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      setMode('login');
      initializeEventHandlers(); // Initialize handlers before showing modal
      
      // Enable login modal display for logout (user explicitly requested this)
      this.enableLoginModal();
      showModal();
    },
    isAuthenticated: function() {
      const token = localStorage.getItem('authToken');
      const user = localStorage.getItem('authUser');
      return !!(token && user);
    },
    
    // Check if user is authenticated without showing login modal
    checkAuthSilent: async function() {
      console.log('🔧 [LoginManager] checkAuthSilent() called');
      
      const storedUser = localStorage.getItem('authUser');
      const token = localStorage.getItem('authToken');
      
      if (!storedUser || !token) {
        // Check if user is authenticated via main app and convert to admin
        const jwtToken = localStorage.getItem('jwtToken');
        if (jwtToken) {
          console.log('🔧 [LoginManager] JWT token found in silent check, attempting to convert...');
          try {
            const res = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: jwtToken })
            });
            const data = await res.json();
            if (res.ok && data.success && data.user) {
              // Convert main app auth to admin auth
              localStorage.setItem('authToken', jwtToken);
              localStorage.setItem('authUser', JSON.stringify(data.user));
              console.log('🔧 [LoginManager] Successfully converted main app auth to admin in silent check:', data.user.email);
              return true;
            }
          } catch (err) {
            console.warn('🔧 [LoginManager] Failed to convert main app auth to admin in silent check:', err);
          }
        }
        return false;
      }
      
      try {
        const user = JSON.parse(storedUser);
        if (!user || !user.id) {
          return false;
        }
        
        // Verify token with backend silently
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        
        const data = await res.json();
        if (!res.ok || !data.success) {
          // Clear invalid data
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
          return false;
          }
        
        // Update stored user data
        localStorage.setItem('authUser', JSON.stringify(data.user));
        return true;
      } catch (err) {
        console.error('🔧 [LoginManager] Silent auth check failed:', err);
        return false;
      }
    },
    onLogin: null, // Settable callback for successful login
    
    // Method to enable login modal display (for explicit requests)
    enableLoginModal: function() {
      console.log('🔧 [LoginManager] Enabling login modal display');
      this._preventAutoShow = false;
    },
    
    // Method to disable login modal display (default state)
    disableLoginModal: function() {
      console.log('🔧 [LoginManager] Disabling login modal display');
      this._preventAutoShow = true;
    }
  };

  // On load, initialize event handlers if DOM is ready
  // BUT don't automatically show login modal - only show when explicitly requested
  if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
      initializeEventHandlers();
      // Don't automatically check auth or show login modal
  });
  } else {
    // DOM is already loaded
    initializeEventHandlers();
    // Don't automatically check auth or show login modal
  }
  
  // CRITICAL: Expose LoginManager globally so AdminPanel can access it
  window.LoginManager = LoginManager;
  console.log('🔧 [LoginManager] LoginManager exposed globally:', window.LoginManager);
})(); 