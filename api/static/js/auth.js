// Firebase Authentication

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDtMVs5sJxUaYHbcb9Y_ScQ835nkUhoHJc",
    authDomain: "bot-ai-ind.firebaseapp.com",
    projectId: "bot-ai-ind",
    storageBucket: "bot-ai-ind.appspot.com",
    messagingSenderId: "25563234789",
    appId: "1:25563234789:web:d23c495448668ba43bef0c",
    measurementId: "G-YZT2GJE693"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// DOM Elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const googleBtn = document.getElementById('google-btn');
const authMessage = document.getElementById('auth-message');
const togglePasswordBtns = document.querySelectorAll('.toggle-password');

// Additional elements for registration
const nameInput = document.getElementById('name');
const confirmPasswordInput = document.getElementById('confirm-password');

// GSAP Animations
document.addEventListener('DOMContentLoaded', () => {
    // Initial animation for the auth card
    gsap.from('.auth-card', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.3
    });
    
    // Stagger animation for form elements
    gsap.from('.auth-header, .input-group, .auth-options, .auth-divider, .auth-redirect', {
        opacity: 0,
        y: 20,
        stagger: 0.1,
        duration: 0.6,
        ease: 'back.out(1.4)',
        delay: 0.6
    });
    
    // Separate animation for buttons to ensure they're visible
    gsap.fromTo('.auth-btn, .social-auth-btn', 
        {opacity: 1, y: 20},
        {opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.4)', delay: 0.8}
    );
});

// Toggle password visibility
togglePasswordBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const icon = btn.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
});

// Show auth message
function showMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = 'auth-message';
    authMessage.classList.add(type);
    
    // Animate message
    gsap.from(authMessage, {
        opacity: 0,
        y: 10,
        duration: 0.3,
        ease: 'power2.out'
    });
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        gsap.to(authMessage, {
            opacity: 0,
            y: -10,
            duration: 0.3,
            ease: 'power2.in',
            onComplete: () => {
                authMessage.style.display = 'none';
            }
        });
    }, 5000);
}

// Check if user is already logged in
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in, redirect to home page if on login/register/reset-password page
        const currentPath = window.location.pathname;
        if (currentPath === '/login' || currentPath === '/register' || currentPath === '/reset-password') {
            window.location.href = '/';
        }
    } else {
        // User is signed out, redirect to login page if on protected pages
        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/reset-password' && currentPath !== '/status') {
            window.location.href = '/login';
        }
    }
});

// Login functionality
if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Simple validation
        if (!email || !password) {
            showMessage('Please enter both email and password', 'error');
            return;
        }
        
        // Disable button and show loading state
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        
        // Sign in with Firebase
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                showMessage('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            })
            .catch(error => {
                let errorMessage = 'Login failed. Please try again.';
                
                // Handle specific error codes
                switch (error.code) {
                    case 'auth/user-not-found':
                        errorMessage = 'No account found with this email.';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Incorrect password. Please try again.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email format.';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Too many failed login attempts. Please try again later.';
                        break;
                }
                
                showMessage(errorMessage, 'error');
                
                // Reset button state
                loginBtn.disabled = false;
                loginBtn.innerHTML = 'Sign In';
            });
    });
}

// Register functionality
if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        const name = nameInput ? nameInput.value.trim() : '';
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
        
        // Simple validation
        if (!name) {
            showMessage('Please enter your name', 'error');
            return;
        }
        
        if (!email) {
            showMessage('Please enter your email', 'error');
            return;
        }
        
        if (!password) {
            showMessage('Please create a password', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }
        
        // Check terms agreement
        const termsCheckbox = document.getElementById('terms');
        if (termsCheckbox && !termsCheckbox.checked) {
            showMessage('Please agree to the Terms of Service', 'error');
            return;
        }
        
        // Disable button and show loading state
        registerBtn.disabled = true;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        
        // Create user with Firebase
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Update profile with name
                return userCredential.user.updateProfile({
                    displayName: name
                });
            })
            .then(() => {
                showMessage('Account created successfully! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            })
            .catch(error => {
                let errorMessage = 'Registration failed. Please try again.';
                
                // Handle specific error codes
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Email already in use. Please use a different email or sign in.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Invalid email format.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Password is too weak. Please use a stronger password.';
                        break;
                }
                
                showMessage(errorMessage, 'error');
                
                // Reset button state
                registerBtn.disabled = false;
                registerBtn.innerHTML = 'Create Account';
            });
    });
}

// Google Sign In
if (googleBtn) {
    googleBtn.addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Disable button and show loading state
        googleBtn.disabled = true;
        googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        
        auth.signInWithPopup(provider)
            .then(() => {
                showMessage('Google sign-in successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            })
            .catch(error => {
                console.error('Google sign-in error:', error);
                showMessage('Google sign-in failed. Please try again.', 'error');
                
                // Reset button state
                googleBtn.disabled = false;
                googleBtn.innerHTML = `<img src="${window.location.origin}/static/img/google-icon.svg" alt="Google"> Sign ${window.location.pathname === '/login' ? 'in' : 'up'} with Google`;
            });
    });
}

// Enter key functionality
document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        if (window.location.pathname === '/login' && loginBtn) {
            loginBtn.click();
        } else if (window.location.pathname === '/register' && registerBtn) {
            registerBtn.click();
        } else if (window.location.pathname === '/reset-password') {
            // Handle enter key for different stages of password reset
            if (document.getElementById('email-form').style.display !== 'none') {
                document.getElementById('send-code-btn').click();
            } else if (document.getElementById('code-form').style.display !== 'none') {
                document.getElementById('verify-code-btn').click();
            } else if (document.getElementById('new-password-form').style.display !== 'none') {
                document.getElementById('reset-password-btn').click();
            }
        }
    }
});

// Password Reset Functionality
if (window.location.pathname === '/reset-password') {
    // DOM Elements for password reset
    const emailForm = document.getElementById('email-form');
    const codeForm = document.getElementById('code-form');
    const newPasswordForm = document.getElementById('new-password-form');
    const resetEmail = document.getElementById('reset-email');
    const verificationCode = document.getElementById('verification-code');
    const newPassword = document.getElementById('new-password');
    const confirmNewPassword = document.getElementById('confirm-new-password');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const verifyCodeBtn = document.getElementById('verify-code-btn');
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    const resendCodeLink = document.getElementById('resend-code');
    const timerElement = document.getElementById('timer');
    
    // Variables to store verification data
    let verificationData = {
        email: '',
        code: '',
        expiryTime: null,
        verified: false
    };
    
    let timerInterval;
    
    // Function to generate a random 6-digit code
    function generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    
    // Function to start the countdown timer
    function startTimer(duration) {
        let timer = duration;
        clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            const minutes = Math.floor(timer / 60);
            const seconds = timer % 60;
            
            timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            
            if (--timer < 0) {
                clearInterval(timerInterval);
                timerElement.textContent = 'Expired';
                verificationData.verified = false;
                showMessage('Verification code has expired. Please request a new code.', 'error');
            }
        }, 1000);
    }
    
    // Send verification code
    sendCodeBtn.addEventListener('click', () => {
        const email = resetEmail.value.trim();
        
        if (!email) {
            showMessage('Please enter your email address', 'error');
            return;
        }
        
        // Disable button and show loading state
        sendCodeBtn.disabled = true;
        sendCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending code...';
        
        // Check if email exists in Firebase
        auth.fetchSignInMethodsForEmail(email)
            .then(methods => {
                if (methods && methods.length > 0) {
                    // Email exists, generate and send verification code
                    const code = generateVerificationCode();
                    const expiryTime = new Date();
                    expiryTime.setMinutes(expiryTime.getMinutes() + 5); // Code expires in 5 minutes
                    
                    // Store verification data
                    verificationData = {
                        email: email,
                        code: code,
                        expiryTime: expiryTime,
                        verified: false
                    };
                    
                    // In a real application, you would send this code via email
                    // For this demo, we'll just show it in the console and message
                    console.log(`Verification code for ${email}: ${code}`);
                    
                    // Show success message
                    showMessage(`Verification code sent to ${email}. Check your email inbox.`, 'success');
                    
                    // Switch to code verification form
                    emailForm.style.display = 'none';
                    codeForm.style.display = 'block';
                    
                    // Start the countdown timer (5 minutes = 300 seconds)
                    startTimer(300);
                } else {
                    showMessage('No account found with this email address', 'error');
                }
                
                // Reset button state
                sendCodeBtn.disabled = false;
                sendCodeBtn.innerHTML = 'Send Verification Code';
            })
            .catch(error => {
                console.error('Error checking email:', error);
                showMessage('An error occurred. Please try again.', 'error');
                
                // Reset button state
                sendCodeBtn.disabled = false;
                sendCodeBtn.innerHTML = 'Send Verification Code';
            });
    });
    
    // Verify code
    verifyCodeBtn.addEventListener('click', () => {
        const code = verificationCode.value.trim();
        
        if (!code) {
            showMessage('Please enter the verification code', 'error');
            return;
        }
        
        // Disable button and show loading state
        verifyCodeBtn.disabled = true;
        verifyCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        
        // Check if code is valid and not expired
        const now = new Date();
        
        if (code === verificationData.code && now < verificationData.expiryTime) {
            // Code is valid
            verificationData.verified = true;
            
            // Show success message
            showMessage('Code verified successfully', 'success');
            
            // Switch to new password form
            codeForm.style.display = 'none';
            newPasswordForm.style.display = 'block';
            
            // Stop the timer
            clearInterval(timerInterval);
        } else if (now >= verificationData.expiryTime) {
            showMessage('Verification code has expired. Please request a new code.', 'error');
        } else {
            showMessage('Invalid verification code. Please try again.', 'error');
        }
        
        // Reset button state
        verifyCodeBtn.disabled = false;
        verifyCodeBtn.innerHTML = 'Verify Code';
    });
    
    // Reset password
    resetPasswordBtn.addEventListener('click', () => {
        const password = newPassword.value;
        const confirmPassword = confirmNewPassword.value;
        
        if (!password) {
            showMessage('Please enter a new password', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('Password must be at least 6 characters', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }
        
        if (!verificationData.verified) {
            showMessage('Please verify your email first', 'error');
            return;
        }
        
        // Disable button and show loading state
        resetPasswordBtn.disabled = true;
        resetPasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting password...';
        
        // Send password reset email using Firebase
        auth.sendPasswordResetEmail(verificationData.email)
            .then(() => {
                // In a real application, you would update the password directly
                // For this demo, we'll send a password reset email instead
                showMessage('Password reset email sent. Please check your email to complete the process.', 'success');
                
                // Redirect to login page after 3 seconds
                setTimeout(() => {
                    window.location.href = '/login';
                }, 3000);
            })
            .catch(error => {
                console.error('Error resetting password:', error);
                showMessage('An error occurred. Please try again.', 'error');
                
                // Reset button state
                resetPasswordBtn.disabled = false;
                resetPasswordBtn.innerHTML = 'Reset Password';
            });
    });
    
    // Resend code
    resendCodeLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Go back to email form
        codeForm.style.display = 'none';
        emailForm.style.display = 'block';
        
        // Stop the timer
        clearInterval(timerInterval);
        
        // Reset verification data
        verificationData = {
            email: '',
            code: '',
            expiryTime: null,
            verified: false
        };
    });
}