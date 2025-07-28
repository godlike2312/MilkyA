// DOM Elements
const chatMessages = document.getElementById('messages');
const userInput = document.getElementById('user-input');
const sendButton = document.querySelector('.send-btn');
const container = document.querySelector('.container');
const themeToggle = document.querySelector('.theme-toggle');
const newChatBtn = document.querySelector('.new-chat');
const chatHistoryContainer = document.querySelector('.chat-history');
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');
const mobileToggle = document.querySelector('.mobile-toggle');
const stopBtn = document.querySelector('.stop-btn');
const messagesContainer = document.querySelector('.messages-container');
const inputContainer = document.querySelector('.input-container');

// Function to toggle sidebar
function toggleSidebar() {
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
}

// Add event listeners for sidebar toggle
if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
}

// Handle mobile toggle button
if (mobileToggle) {
    mobileToggle.addEventListener('click', toggleSidebar);
}

// Global variables
let controller = null;

// Chat state variables
let currentChatId = null;
let currentUser = null;

// Offline indicator element
const offlineIndicator = document.createElement('div');
offlineIndicator.className = 'offline-indicator';
offlineIndicator.textContent = 'You are currently offline';
offlineIndicator.style.display = 'none';
document.body.appendChild(offlineIndicator);

// Create loading overlay for token verification
const createLoadingOverlay = () => {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'token-verification-overlay';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    const message = document.createElement('div');
    message.className = 'loading-message';
    message.textContent = 'Verifying your account...';
    
    overlay.appendChild(spinner);
    overlay.appendChild(message);
    document.body.appendChild(overlay);
    
    return overlay;
};

// Function to verify Firebase token once when user logs in
async function verifyTokenOnce() {
    if (firebase.auth().currentUser) {
        // Show loading overlay
        const overlay = createLoadingOverlay();
        
        try {
            const token = await firebase.auth().currentUser.getIdToken(true);
            const response = await fetch('/api/verify-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                console.log('Token verified and cached on server');
                // Show success message briefly before removing overlay
                const message = overlay.querySelector('.loading-message');
                message.textContent = 'Verification successful!';
                message.style.color = '#4facfe';
                
                setTimeout(() => {
                    // Remove overlay with fade-out effect
                    overlay.classList.add('fade-out');
                    setTimeout(() => {
                        document.body.removeChild(overlay);
                    }, 500);
                }, 1000);
            } else {
                console.error('Failed to verify token on server');
                // Show error message
                const message = overlay.querySelector('.loading-message');
                message.textContent = 'Verification failed. Please try again.';
                message.style.color = '#ff4d4d';
                
                setTimeout(() => {
                    // Remove overlay
                    document.body.removeChild(overlay);
                }, 3000);
            }
        } catch (error) {
            console.error('Error verifying token:', error);
            // Show error message
            const message = overlay.querySelector('.loading-message');
            message.textContent = 'Verification error. Please refresh the page.';
            message.style.color = '#ff4d4d';
            
            setTimeout(() => {
                // Remove overlay
                document.body.removeChild(overlay);
            }, 3000);
        }
    }
}

// Check if user is online
function checkOnlineStatus() {
    if (navigator.onLine) {
        document.body.classList.remove('offline');
        offlineIndicator.style.display = 'none';
        
        // If we're back online and have a currentChatId, try to reload the chat
        if (currentChatId && currentUser) {
            console.log('Back online, attempting to reload chat:', currentChatId);
            loadChat(currentChatId);
        }
    } else {
        document.body.classList.add('offline');
        offlineIndicator.style.display = 'block';
    }
}

// Add event listeners for online/offline status
window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);

// Check online status on page load
checkOnlineStatus();

// Mobile viewport height adjustment for virtual keyboard
function adjustViewportForMobile() {
    // Only apply these adjustments on mobile devices
    if (window.innerWidth <= 768) {
        // Set initial viewport height as a CSS variable
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
        
        // Update on resize
        window.addEventListener('resize', () => {
            // Update the viewport height variable
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        });
        
        // Handle input focus (keyboard appears)
        if (userInput) {
            userInput.addEventListener('focus', () => {
                // Add a small delay to allow the keyboard to fully appear
                setTimeout(() => {
                    // Scroll to the input field
                    userInput.scrollIntoView({ behavior: 'smooth' });
                    
                    // Ensure messages container has enough bottom padding
                    if (messagesContainer) {
                        messagesContainer.style.paddingBottom = '150px';
                    }
                }, 300);
            });
            
            // Handle input blur (keyboard disappears)
            userInput.addEventListener('blur', () => {
                // Reset padding when keyboard is hidden
                if (messagesContainer) {
                    messagesContainer.style.paddingBottom = '100px';
                }
            });
        }
    }
}

// Call the function on page load
document.addEventListener('DOMContentLoaded', adjustViewportForMobile);

// Initialize chat history array to store all messages
let chatHistory = [
    { 
        role: 'system', 
        content: 'You are NumAI, a sophisticated AI assistant powered by advanced language models. NumAI is a AI chat WebPage. You have access to various AI models including GPT-4o, Reasoner 3.5, Dev 2.4 sonnet, Milky Basic, Milky-S1, MilkyCoder Pro, Milky 3.7 sonnet, Milky Fast-7o, Milky Edge, Milky S2, and Milky 2o.\n\nImportant guidelines:\n1. DO NOT provide code examples or solutions unless explicitly requested by the user.\n2. When a user says only \'hello\', respond with just \'Hello! How can I help you today?\' and nothing more.\n3. For all other queries, respond concisely with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification.\n4. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses.\n5. If the user asks for code, provide clear, well-commented examples with proper explanations.\n6. Always prioritize clarity and relevance in your responses.\n7. Avoid unnecessary verbosity and focus on directly addressing the user\'s query. Ask Questions to get more robust solution'
    }
];

// Toast notification function
function showToast(message, duration = 3000) {
    // Check if a toast container already exists
    let toastContainer = document.querySelector('.toast-container');
    
    // Create toast container if it doesn't exist
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove the toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
            // Remove container if empty
            if (toastContainer.children.length === 0) {
                document.body.removeChild(toastContainer);
            }
        }, 300);
    }, duration);
}

// Model selection variables
let availableModels = {};
let currentModel = 'deepseek/deepseek-chat-v3-0324:free'; // Default model with full ID

// Function to fetch available models
async function fetchAvailableModels() {
    try {
        const response = await fetch('/api/models');
        if (!response.ok) {
            throw new Error('Failed to fetch models');
        }
        
        const data = await response.json();
        availableModels = data.models;
        
        // Load preferred model from localStorage if available
        const preferredModel = localStorage.getItem('preferred_model');
        if (preferredModel && availableModels[preferredModel]) {
            currentModel = preferredModel;
            console.log('Using preferred model from localStorage:', currentModel);
        } else {
            currentModel = data.default_model;
            console.log('Using default model:', currentModel);
        }
        
        // Debug: Check if the model exists in the available models
        if (availableModels[currentModel]) {
            console.log('Model found in available models:', availableModels[currentModel]);
        } else {
            console.warn('Current model not found in available models:', currentModel);
            // Try to find a matching model by ID
            for (const [key, model] of Object.entries(availableModels)) {
                if (model.id === currentModel) {
                    console.log('Found matching model by ID:', key);
                    currentModel = key;
                    break;
                }
            }
        }
        
        // Update UI with model information
        if (availableModels[currentModel]) {
            updateModelIndicator(availableModels[currentModel].display_name);
        } else {
            console.error('Cannot update model indicator: model not found', currentModel);
        }
        
        populateModelSelectors();
        
        return data;
    } catch (error) {
        console.error('Error fetching models:', error);
        return null;
    }
}

// Function to update the model indicator in the UI
function updateModelIndicator(modelName) {
    const modelIndicator = document.getElementById('current-model-indicator');
    if (modelIndicator) {
        modelIndicator.textContent = modelName;
    }
    
    // Also update in settings if open
    const currentModelDisplay = document.getElementById('current-model-display');
    if (currentModelDisplay) {
        currentModelDisplay.textContent = modelName;
    }
}

// Function to populate model selectors in settings and quick switcher
function populateModelSelectors() {
    // Populate settings model selector
    const modelSelector = document.getElementById('model-selector');
    if (modelSelector) {
        modelSelector.innerHTML = '';
        
        Object.entries(availableModels).forEach(([key, model]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = model.display_name;
            if (key === currentModel) {
                option.selected = true;
            }
            modelSelector.appendChild(option);
        });
        
        // Add change event listener
        modelSelector.addEventListener('change', function() {
            const selectedKey = this.value;
            currentModel = selectedKey;
            updateModelIndicator(availableModels[selectedKey].display_name);
            
            // Update model description
            const modelDescription = document.getElementById('model-description');
            if (modelDescription) {
                modelDescription.textContent = availableModels[selectedKey].description;
            }
            
            // Save preference to localStorage
            localStorage.setItem('preferred_model', selectedKey);
        });
        
        // Trigger change event to update description
        modelSelector.dispatchEvent(new Event('change'));
    }
    
    // We're not populating the model switcher here anymore since we're using static HTML structure
    // Instead, we'll just add event listeners to the existing model options
    const modelOptions = document.querySelectorAll('.model-option');
    
    modelOptions.forEach(modelOption => {
        const modelId = modelOption.getAttribute('data-model-id');
        if (modelId === currentModel) {
            modelOption.classList.add('selected');
        }
        
        modelOption.addEventListener('click', () => {
            // Update selected model
            currentModel = modelId;
            const modelName = modelOption.querySelector('.model-option-name').textContent;
            updateModelIndicator(modelName);
            
            // Update UI
            document.querySelectorAll('.model-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            modelOption.classList.add('selected');
            
            // Close the popup
            document.getElementById('model-switcher-popup').style.display = 'none';
            
            // Save preference to localStorage
            localStorage.setItem('preferred_model', modelId);
        });
    });
}

// GSAP Animations
document.addEventListener('DOMContentLoaded', () => {
    // Scroll to the bottom of the chat when page loads
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    // Initial animation for the container
    gsap.to('.container', {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.3
    });
    
    // Fetch available models
    fetchAvailableModels();
    
    // Setup model switcher
    const modelSwitchBtn = document.getElementById('model-switch-btn');
    const modelSwitcherPopup = document.getElementById('model-switcher-popup');
    const closeModelSwitcherBtn = document.getElementById('close-model-switcher');
    
    // Debug log to check if elements exist
    console.log('Model Switch Button:', modelSwitchBtn);
    console.log('Model Switcher Popup:', modelSwitcherPopup);
    
    if (modelSwitchBtn && modelSwitcherPopup) {
        // Remove any existing event listeners
        modelSwitchBtn.replaceWith(modelSwitchBtn.cloneNode(true));
        
        // Get the fresh reference
        const freshModelSwitchBtn = document.getElementById('model-switch-btn');
        
        // Add new event listener
        freshModelSwitchBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            console.log('Model switch button clicked');
            
            // Toggle the display of the popup with animation
            if (modelSwitcherPopup.style.display === 'block') {
                // Hide with animation
                modelSwitcherPopup.style.opacity = '0';
                modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
                console.log('Hiding model switcher popup');
                
                // After animation completes, hide the element
                setTimeout(() => {
                    modelSwitcherPopup.style.display = 'none';
                }, 300); // Match the transition duration in CSS
            } else {
                // Show with animation - first set initial state
                modelSwitcherPopup.style.opacity = '0';
                modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
                modelSwitcherPopup.style.display = 'block';
                console.log('Showing model switcher popup');
                
                // Force a reflow to ensure the popup is displayed
                void modelSwitcherPopup.offsetWidth;
                
                // Then animate to visible state
                setTimeout(() => {
                    modelSwitcherPopup.style.opacity = '1';
                    modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(0)';
                }, 10);
            }
        });
    }
    
    if (closeModelSwitcherBtn && modelSwitcherPopup) {
        // Remove any existing event listeners
        closeModelSwitcherBtn.replaceWith(closeModelSwitcherBtn.cloneNode(true));
        
        // Get the fresh reference
        const freshCloseBtn = document.getElementById('close-model-switcher');
        
        // Add new event listener
        freshCloseBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            console.log('Close model switcher button clicked');
            
            // Hide with animation
            modelSwitcherPopup.style.opacity = '0';
            modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
            
            // After animation completes, hide the element
            setTimeout(() => {
                modelSwitcherPopup.style.display = 'none';
            }, 300); // Match the transition duration in CSS
        });
    }
    
    // Close model switcher when clicking outside
    document.addEventListener('click', (event) => {
        if (modelSwitcherPopup && modelSwitcherPopup.style.display === 'block') {
            // Get fresh reference to the model switch button
            const currentModelSwitchBtn = document.getElementById('model-switch-btn');
            // Check if the click is outside the popup and not on the model switch button
            if (!modelSwitcherPopup.contains(event.target) && event.target !== currentModelSwitchBtn) {
                console.log('Clicked outside, closing popup');
                
                // Hide with animation
                modelSwitcherPopup.style.opacity = '0';
                modelSwitcherPopup.style.transform = 'translateY(10px)';
                
                // After animation completes, hide the element
                setTimeout(() => {
                    modelSwitcherPopup.style.display = 'none';
                }, 300); // Match the transition duration in CSS
            }
        }
    });
    
    // Prevent clicks inside the popup from closing it
    if (modelSwitcherPopup) {
        modelSwitcherPopup.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    }
    
    // Add event listeners to model options
const modelOptions = document.querySelectorAll('.model-option');

// Map model names to their logo files
const modelLogoMap = {
    'Milky 3.1': '/static/img/model-logos/milky-3.1.svg',
    'Milky Small': '/static/img/model-logos/milky-small.svg',
    'Milky 3.7': '/static/img/model-logos/milky-3.7.svg',
    'Milky V2': '/static/img/model-logos/milky-v2.svg',
    'MilkyCoder Pro': '/static/img/model-logos/milkycoder-pro.svg',
    'Milky 3.7 sonnet': '/static/img/model-logos/milky-3.7-sonnet.svg',
    'Sonnet Seek': '/static/img/model-logos/sonnet-seek.svg',
    'Milky Fast': '/static/img/model-logos/milky-fast.svg',
    'Milky Edge': '/static/img/model-logos/milky-edge.svg',
    'Milky Fast-7o': '/static/img/model-logos/milky-fast-7o.svg',
    'Milky S2': '/static/img/model-logos/milky-s2-new.svg',
    'Milky 2o': '/static/img/model-logos/milky-2o-new.svg',
    'Milky 8B': '/static/img/model-logos/milky-8b-new.svg',
    'Milky 70B': '/static/img/model-logos/milky-70b-new.svg'
};

// Map model IDs to their names for easier lookup
const modelIdToNameMap = {
    'deepseek/deepseek-chat-v3-0324:free': 'Sonnet Seek',
    'mistralai/mistral-small-3.2-24b-instruct:free': 'Milky Small',
    'mistralai/devstral-small:free': 'Milky 3.7',
    'google/gemma-3n-e4b-it:free': 'Milky V2',
    'agentica-org/deepcoder-14b-preview:free': 'MilkyCoder Pro',
    'deepseek/deepseek-v3-base:free': 'Milky 3.7 sonnet',
    'mistralai/mistral-7b-instruct:free': 'Milky Fast',
    'cohere/command-r-plus': 'Milky S2',
    'cohere/command-r': 'Milky 2o',
    'groq/llama3-8b': 'Milky 8B',
    'groq/llama3-70b': 'Milky 70B'
};

// Debug: Log all model options and their data-model-id attributes
console.log('Available model options:');
modelOptions.forEach(option => {
    console.log(`Model: ${option.querySelector('.model-option-name').textContent}, ID: ${option.getAttribute('data-model-id')}`);
});

// Map models that have animated versions
const animatedLogoMap = {
    'Milky 3.1': '/static/img/model-logos/milky-3.1-animated.svg',
    'Milky 3.7 sonnet': '/static/img/model-logos/milky-3.7-sonnet-animated.svg'
};

// Function to update model icons with SVG logos
function updateModelIcons() {
    // Update icons in the model switcher popup
    modelOptions.forEach(option => {
        const modelName = option.querySelector('.model-option-name').textContent;
        const iconContainer = option.querySelector('.model-option-icon');
        
        if (modelName && iconContainer) {
            // Clear existing content
            iconContainer.innerHTML = '';
            
            // Check if we have a logo for this model
            if (modelLogoMap[modelName]) {
                // Create an image element for the SVG
                const img = document.createElement('img');
                img.src = modelLogoMap[modelName];
                img.alt = `${modelName} logo`;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                
                // Add the image to the icon container
                iconContainer.appendChild(img);
            } else {
                // Fallback to the default icon
                const icon = document.createElement('i');
                icon.className = 'fas fa-robot';
                iconContainer.appendChild(icon);
            }
        }
    });
    
    // Update the current model icon in the switch button
    updateCurrentModelIcon();
}

// Function to update the current model icon in the switch button
function updateCurrentModelIcon() {
    const currentModelIcon = document.getElementById('current-model-icon');
    if (currentModelIcon) {
        // Clear existing content
        currentModelIcon.innerHTML = '';
        
        // Get the current model name from the ID
        const currentModelName = modelIdToNameMap[currentModel] || 'Unknown Model';
        
        // Check if we have a logo for this model
        if (modelLogoMap[currentModelName]) {
            // Create an image element for the SVG
            const img = document.createElement('img');
            img.src = modelLogoMap[currentModelName];
            img.alt = `${currentModelName} logo`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            
            // Add the image to the icon container
            currentModelIcon.appendChild(img);
        } else {
            // Fallback to the default icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-robot';
            currentModelIcon.appendChild(icon);
        }
    }
}

// Highlight the currently selected model
function updateSelectedModelOption() {
    // Remove selected class from all options
    modelOptions.forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selected class to the current model option
    if (currentModel) {
        const selectedOption = document.querySelector(`.model-option[data-model-id="${currentModel}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
            
            // Check if this model has an animated version
            const modelName = selectedOption.querySelector('.model-option-name').textContent;
            const iconContainer = selectedOption.querySelector('.model-option-icon');
            const img = iconContainer.querySelector('img');
            
            if (img && animatedLogoMap[modelName]) {
                // Switch to the animated version
                img.src = animatedLogoMap[modelName];
            }
        }
    }
}

// Call initially to update icons and highlight the current model
updateModelIcons();
updateSelectedModelOption();

modelOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Get model ID from data attribute
        const modelId = option.getAttribute('data-model-id');
        if (modelId) {
            // Update current model
            currentModel = modelId;
            console.log('Model selected:', modelId);
            
            // Update selected state in UI
            modelOptions.forEach(opt => {
                opt.classList.remove('selected');
                
                // Reset to static logo if it was animated
                const optModelName = opt.querySelector('.model-option-name').textContent;
                const optIconContainer = opt.querySelector('.model-option-icon');
                const optImg = optIconContainer.querySelector('img');
                
                if (optImg && modelLogoMap[optModelName]) {
                    optImg.src = modelLogoMap[optModelName];
                }
            });
            
            option.classList.add('selected');
            
            // Get model name from the option
            const modelName = option.querySelector('.model-option-name').textContent;
            console.log('Selected model name:', modelName);
            
            // Update to animated logo if available
            const iconContainer = option.querySelector('.model-option-icon');
            const img = iconContainer.querySelector('img');
            
            if (img && animatedLogoMap[modelName]) {
                img.src = animatedLogoMap[modelName];
            }
            
            // Update model indicator
            updateModelIndicator(modelName);
            
            // Close the popup with animation
            modelSwitcherPopup.style.opacity = '0';
            modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
            
            // After animation completes, hide the element
            setTimeout(() => {
                modelSwitcherPopup.style.display = 'none';
            }, 300); // Match the transition duration in CSS
            
            // Save preference to localStorage
            localStorage.setItem('preferred_model', modelId);
            console.log('Saved model preference to localStorage:', modelId);
            
            // Show feedback to user
            if (typeof showToast === 'function') {
                showToast(`Model switched to ${modelName}`);
            }
            
            // Update the current model icon in the switch button
            updateCurrentModelIcon();
        }
    });
});
    
    // Close model switcher when clicking outside
    document.addEventListener('click', (event) => {
        if (modelSwitcherPopup && 
            modelSwitcherPopup.style.display === 'block' && 
            !modelSwitcherPopup.contains(event.target) && 
            event.target !== modelSwitchBtn) {
            
            // Hide with animation
            modelSwitcherPopup.style.opacity = '0';
            modelSwitcherPopup.style.transform = 'translateX(-50%) translateY(10px)';
            
            // After animation completes, hide the element
            setTimeout(() => {
                modelSwitcherPopup.style.display = 'none';
            }, 300); // Match the transition duration in CSS
        }
    });
    
    // Stagger animation for sidebar header elements
    gsap.from('.sidebar-header', {
        opacity: 0,
        y: -20,
        duration: 0.8,
        ease: 'back.out(1.7)',
        delay: 0.8
    });
    
    // Animation for chat section
    gsap.from('.chat-section', {
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        ease: 'power2.out',
        delay: 1.2
    });
    
    // Logo click for mobile toggle
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                toggleSidebar();
            }
        });
    }
    
    // Default to dark mode
    let darkMode = true;
    
    // Initialize chat functionality
    initializeChats();
    
    // New chat functionality
    newChatBtn.addEventListener('click', function() {
        createNewChatSession();
    });
    
    // After all messages are loaded, scroll to bottom
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// Function to add a message to the chat
function addMessage(content, type, isOfflineMessage = false, modelId = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    
    // Store original content as a data attribute for potential reprocessing
    if (type === 'assistant') {
        // Ensure we're storing the raw content before any processing
        messageDiv.setAttribute('data-original-content', content);
        console.log('Storing original content for assistant message:', content.substring(0, 50) + '...');
    }
    
    // Create a message content container for all message types
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageDiv.appendChild(messageContent);
    
    // Always parse markdown and emojis for assistant messages
    if (type === 'assistant') {
        // Configure marked.js with custom renderer for emoji shortcodes and links
        const renderer = new marked.Renderer();
        const originalText = renderer.text;
        const originalLink = renderer.link;
        
        // Override link renderer to make links open in new tabs
        renderer.link = function(href, title, text) {
            const link = originalLink.call(this, href, title, text);
            return link.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
        };
        
        renderer.text = function(text) {
            // Ensure text is a string before using replace
            if (typeof text !== 'string') {
                return originalText.call(this, text);
            }
            // Replace emoji shortcodes with actual emojis
            const emojiText = text.replace(/:([a-zA-Z0-9_]+):/g, (match, code) => {
                const emojiMap = { 
                    smile: '😊', sad: '😔', grin: '😁', thumbsup: '👍', 
                    rocket: '🚀', star: '⭐', idea: '💡', code: '💻', 
                    warning: '⚠️', check: '✅', heart: '❤️', info: 'ℹ️', 
                    bird: '🐦', robot: '🤖', thinking: '🤔',
                    hammer_and_wrench: '🛠️', iphone: '📱', 
                    construction: '🚧', electric_car: '🚗', brain: '🧠'
                };
                return emojiMap[code] || match;
            });
            return originalText.call(this, emojiText);
        };
        
        // First check if the content contains code blocks
        if (content.includes('```')) {
            // Use our custom parseCodeBlocks function to handle code blocks with proper language classes
            // This ensures code blocks get the proper language class for highlight.js
            messageContent.innerHTML = parseCodeBlocks(content);
        } else {
            // Use marked.js to parse markdown with our custom renderer for content without code blocks
            messageContent.innerHTML = marked.parse(content, { renderer: renderer });
        }
    } else {
        // Regular text message without markdown parsing
        const messagePara = document.createElement('p');
        messagePara.textContent = content;
        messageContent.appendChild(messagePara);
    }
    
    // Add feedback options for assistant messages
    if (type === 'assistant') {
        const feedbackContainer = document.createElement('div');
        feedbackContainer.classList.add('message-feedback');
        
        // Add model watermark to show which model was used
        const modelWatermark = document.createElement('div');
        modelWatermark.classList.add('model-watermark');
        // Use the provided modelId parameter if available, otherwise use currentModel
        const modelIdToUse = modelId || currentModel;
        
        // Ensure we have a valid model name even if availableModels isn't loaded yet
        let modelName = 'Unknown Model';
        if (availableModels && availableModels[modelIdToUse] && availableModels[modelIdToUse].display_name) {
            modelName = availableModels[modelIdToUse].display_name;
        } else if (modelIdToUse) {
            // If availableModels isn't loaded yet, use a formatted version of the ID
            modelName = modelIdToUse.charAt(0).toUpperCase() + modelIdToUse.slice(1).replace(/-/g, ' ');
        }
        
        modelWatermark.textContent = `Model Used: ${modelName}`;
        modelWatermark.setAttribute('data-model-id', modelIdToUse || '');
        // Store the model ID as a data attribute for persistence across page reloads
        feedbackContainer.appendChild(modelWatermark);
        
        // Create feedback buttons container
        const feedbackButtons = document.createElement('div');
        feedbackButtons.classList.add('feedback-buttons');
        
        // Add feedback buttons
        feedbackButtons.innerHTML = `
            <button class="feedback-btn like-btn" data-tooltip="Good Response"><i class="fas fa-thumbs-up"></i></button>
            <button class="feedback-btn dislike-btn" data-tooltip="Bad Response"><i class="fas fa-thumbs-down"></i></button>
            <button class="feedback-btn copy-btn" data-tooltip="Copy"><i class="fas fa-copy"></i></button>
            <button class="feedback-btn speak-btn" data-tooltip="Read aloud"><i class="fas fa-volume-up"></i></button>
        `;
        
        // Append feedback buttons to the container
        feedbackContainer.appendChild(feedbackButtons);
        messageDiv.appendChild(feedbackContainer);
        
        // Add event listeners for feedback buttons
        const likeBtn = feedbackButtons.querySelector('.like-btn');
        const dislikeBtn = feedbackButtons.querySelector('.dislike-btn');
        const copyBtn = feedbackButtons.querySelector('.copy-btn');
        const speakBtn = feedbackButtons.querySelector('.speak-btn');
        
        likeBtn.addEventListener('click', () => {
            likeBtn.classList.toggle('active');
            if (dislikeBtn.classList.contains('active')) {
                dislikeBtn.classList.remove('active');
            }
        });
        
        dislikeBtn.addEventListener('click', () => {
            dislikeBtn.classList.toggle('active');
            if (likeBtn.classList.contains('active')) {
                likeBtn.classList.remove('active');
            }
        });
        
        copyBtn.addEventListener('click', () => {
            // Get text content from the message
            const textToCopy = messageContent.textContent;
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            });
        });
        
        speakBtn.addEventListener('click', async () => {
            // Check if already speaking - toggle off if active
            if (speakBtn.classList.contains('active')) {
                if (window.readAloudAudio) {
                    window.readAloudAudio.pause();
                    window.readAloudAudio = null;
                }
                speakBtn.classList.remove('active');
                speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                return;
            }
            
            // Process text to speak - exclude code blocks and emojis
            let textToSpeak = processTextForSpeech(messageContent);
            
            // If no regular text was found, or only code blocks exist
            if (!textToSpeak.trim()) {
                textToSpeak = "This response contains code examples that I'll skip reading. Please review the code on screen.";
            }

            // Get the selected voice from localStorage
            let savedVoice = localStorage.getItem('selectedVoice');
            
            // If no voice is selected or the selected voice is Sara (which is unavailable)
            if (!savedVoice || savedVoice === 'en-US-SaraNeural') {
                // Default to Ava
                savedVoice = 'en-US-AvaNeural';
                localStorage.setItem('selectedVoice', savedVoice);
                console.log('[DEBUG] Read Aloud: No voice selected or Sara requested, using default voice: en-US-AvaNeural');
            } else {
                console.log(`[DEBUG] Read Aloud: Voice selected from settings: ${savedVoice}`);
            }
            
            // Show loading indicator
            speakBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            speakBtn.classList.add('active');

            try {
                console.log(`[DEBUG] Read Aloud: Requesting TTS with voice: ${savedVoice}`);
                
                // Call the Edge TTS API
                const response = await fetch('/api/edge-tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: textToSpeak, voice: savedVoice })
                });
                
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }
                
                // Always log the voice being used for debugging
                console.log(`[DEBUG] Read Aloud: Using voice: ${data.voice_used || savedVoice}`);
                
                // Log additional details about the voice selection process
                if (data.requested_voice) {
                    console.log(`[DEBUG] Read Aloud: Requested voice: ${data.requested_voice}, Server selected: ${data.voice_used}`);
                }
                
                // Always show which voice is being used
                console.log(`[DEBUG] Read Aloud: Voice selection: ${savedVoice} → ${data.voice_used || savedVoice}`);
                    
                // Extract the voice name for display
                let voiceName = "Unknown";
                const voiceToDisplay = data.voice_used || savedVoice;
                const voiceParts = voiceToDisplay.split('-');
                if (voiceParts.length >= 3) {
                    voiceName = voiceParts[2].replace('Neural', '');
                    // Handle multilingual voices
                    if (voiceName.includes('Multilingual')) {
                        voiceName = voiceName.replace('Multilingual', '') + ' Multilingual';
                    }
                } else {
                    voiceName = voiceToDisplay;
                }
                
                // Show a notification to the user
                const notification = document.createElement('div');
                notification.className = 'voice-notification';
                
                // If there was a voice substitution, indicate it
                if (data.voice_used && data.voice_used !== savedVoice) {
                    console.log(`[DEBUG] Read Aloud: Voice substitution: ${savedVoice} → ${data.voice_used}`);
                    notification.textContent = `Voice substituted: ${voiceName}`;
                    notification.style.backgroundColor = 'rgba(255,193,7,0.9)';
                } else {
                    // notification.textContent = `Using voice: ${voiceName}`;
                    notification.style.backgroundColor = 'rgba(0,0,0,0.7)';
                }
                
                notification.style.position = 'fixed';
                notification.style.bottom = '20px';
                notification.style.right = '20px';
                notification.style.color = 'white';
                notification.style.padding = '8px 12px';
                notification.style.borderRadius = '4px';
                notification.style.zIndex = '1000';
                notification.style.fontSize = '12px';
                document.body.appendChild(notification);
                
                // Remove the notification after 3 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transition = 'opacity 0.5s';
                    setTimeout(() => notification.remove(), 500);
                }, 3000);
                
                // Process and play the audio
                const audioData = atob(data.audio);
                const arrayBuffer = new ArrayBuffer(audioData.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                for (let i = 0; i < audioData.length; i++) uint8Array[i] = audioData.charCodeAt(i);
                const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                // Store the audio object for potential stopping later
                window.readAloudAudio = audio;
                
                // Update the button to show it's playing
                speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                
                // Play the audio
                await audio.play().catch(err => {
                    console.error('[DEBUG] Read Aloud: Error playing audio:', err);
                    throw new Error('Failed to play audio');
                });
                
                // Handle audio completion
                audio.onended = () => {
                    console.log(`[DEBUG] Read Aloud: Audio playback completed (Voice used: ${data.voice_used || savedVoice})`);
                    speakBtn.classList.remove('active');
                    URL.revokeObjectURL(audioUrl);
                    window.readAloudAudio = null;
                };
                
                // Handle audio errors
                audio.onerror = (e) => {
                    console.error('[DEBUG] Read Aloud: Audio playback error:', e);
                    speakBtn.classList.remove('active');
                    URL.revokeObjectURL(audioUrl);
                    window.readAloudAudio = null;
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                };
             } catch (error) {
                console.error('[DEBUG] Read Aloud: Edge TTS failed:', error);
                
                // Show error notification
                const errorNotification = document.createElement('div');
                errorNotification.className = 'voice-notification error';
                errorNotification.textContent = `TTS Error: ${error.message}`;
                errorNotification.style.position = 'fixed';
                errorNotification.style.bottom = '20px';
                errorNotification.style.right = '20px';
                errorNotification.style.backgroundColor = 'rgba(220,53,69,0.9)';
                errorNotification.style.color = 'white';
                errorNotification.style.padding = '8px 12px';
                errorNotification.style.borderRadius = '4px';
                errorNotification.style.zIndex = '1000';
                errorNotification.style.fontSize = '12px';
                document.body.appendChild(errorNotification);
                
                // Remove the notification after 3 seconds
                setTimeout(() => {
                    errorNotification.style.opacity = '0';
                    errorNotification.style.transition = 'opacity 0.5s';
                    setTimeout(() => errorNotification.remove(), 500);
                }, 3000);
                
                // Reset UI state
                speakBtn.classList.remove('active');
                speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            }
        });
    }
    
    // Set initial state for GSAP animation
    gsap.set(messageDiv, { opacity: 0, y: 20 });
    
    chatMessages.appendChild(messageDiv);
    
    // Animate the message appearing
    gsap.to(messageDiv, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
    });
    
    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Apply syntax highlighting to code blocks if this is an assistant message
    if (type === 'assistant') {
        setTimeout(() => {
            messageDiv.querySelectorAll('pre code').forEach(block => {
                try {
                    hljs.highlightElement(block);
                } catch (e) {
                    console.error('Error applying syntax highlighting:', e);
                }
            });
        }, 0);
    }
    
    return messageDiv;
}

// Function to parse and format code blocks
function parseCodeBlocks(content) {
    let parts = content.split('```');
    let result = '';
    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            let textContent = parts[i];
            // Numbered lists
            textContent = textContent.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="list-item"><span class="list-number">$1.</span><span class="list-content">$2</span></div>');
            // Bullet lists
            textContent = textContent.replace(/^[\-\*]\s+(.+)$/gm, '<div class="list-item"><span class="list-bullet">•</span><span class="list-content">$1</span></div>');
            // Inline code
            textContent = textContent.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
            // Emoji shortcodes: replace known, return original shortcode for unknown
            textContent = textContent.replace(/:([a-zA-Z0-9_]+):/g, (m, code) => {
                const emojiMap = { 
                    smile: '😊', 
                    sad: '😔', 
                    grin: '😁', 
                    thumbsup: '👍', 
                    rocket: '🚀', 
                    star: '⭐', 
                    idea: '💡', 
                    code: '💻', 
                    warning: '⚠️', 
                    check: '✅', 
                    heart: '❤️', 
                    info: 'ℹ️', 
                    bird: '🐦', 
                    robot: '🤖', 
                    thinking: '🤔', 
                    hammer_and_wrench: '🛠️', 
                    iphone: '📱', 
                    construction: '🚧', 
                    electric_car: '🚗', 
                    brain: '🧠'
                };
                return emojiMap[code] || m; // Return the original shortcode if not found
            });
            // Bold/italic
            textContent = textContent.replace(/\*\*([\s\S]*?)\*\*/g, '<strong class="highlighted-text">$1</strong>');
            textContent = textContent.replace(/__([\s\S]*?)__/g, '<strong class="highlighted-text">$1</strong>');
            textContent = textContent.replace(/\*([^*]+)\*/g, '<em>$1</em>');
            // Headers
            textContent = textContent.replace(/###\s+([^\n]+)/g, '<h3 class="content-title" style="margin:1.2rem 0 0.7rem 0;">$1</h3>');
            textContent = textContent.replace(/##\s+([^\n]+)/g, '<h2 class="content-title" style="margin:1.5rem 0 1rem 0;">$1</h2>');
            textContent = textContent.replace(/^#\s+([^\n]+)$/gm, '<h1 class="content-title" style="margin:2rem 0 1.2rem 0;">$1</h1>');
            // Links
            textContent = textContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="message-link">$1</a>');
            // Remove extra <br> after block elements
            textContent = textContent.replace(/(<\/div>|<\/h[1-3]>|<\/p>)<br>/g, '$1');
            // Remove extra <p> after lists
            textContent = textContent.replace(/<p style="margin-bottom: 0.75rem;"><\/p>/g, '');
            // Only preserve single line breaks that are not inside block elements
            // (We avoid replacing \n with <br> inside headers, lists, or code blocks)
            // For now, keep <br> for plain text, but not after block elements
            result += '<div class="text-content">' + textContent.replace(/([^>])\n/g, '$1<br>') + '</div>';
        } else {
            let codeContent = parts[i];
            let language = '';
            const firstLineBreak = codeContent.indexOf('\n');
            if (firstLineBreak > 0) {
                language = codeContent.substring(0, firstLineBreak).trim();
                codeContent = codeContent.substring(firstLineBreak + 1);
            }
            result += '<div class="code-block">';
            result += '<div class="code-header">';
            if (language) {
                result += '<div class="code-language">' + language + '</div>';
            }
            // Group Copy and Edit buttons in a flex container
            result += '<div class="code-buttons">';
            result += '<button class="copy-code-btn" data-tooltip="Copy" onclick="copyCodeToClipboard(this, event)">Copy</button>';
            result += '<button class="edit-code-btn" data-tooltip="Edit in Canvas" title="Edit in Canvas"><i class="fas fa-pencil-alt"></i> Edit</button>';
            result += '</div>';
            result += '</div>';
            const escapedContent = codeContent
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/\\'/g, '&#039;');
            // Add language class for highlight.js
            // Make sure to clean the language name to avoid issues
            let cleanLanguage = '';
            if (language) {
                // Remove any special characters and keep only alphanumeric and hyphens
                cleanLanguage = language.replace(/[^a-zA-Z0-9-]/g, '');
            }
            const languageClass = cleanLanguage ? ` class="language-${cleanLanguage}"` : '';
            result += `<pre><code${languageClass}>${escapedContent}</code></pre>`;
            result += '</div>';
        }
    }
    return result;
}

// Function to add loading indicator
function addLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('message', 'assistant', 'loading-message');
    
    const loadingIndicator = document.createElement('div');
    loadingIndicator.classList.add('loading');
    
    // Create a simple spinning circle (like DeepSeek)
    const circle = document.createElement('div');
    circle.classList.add('loading-circle');
    loadingIndicator.appendChild(circle);
    
    loadingDiv.appendChild(loadingIndicator);
    chatMessages.appendChild(loadingDiv);
    
    // Scroll to the bottom of the chat
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return loadingDiv;
}

// Function to remove loading indicator
function removeLoadingIndicator(loadingDiv) {
    if (loadingDiv && loadingDiv.parentNode) {
        chatMessages.removeChild(loadingDiv);
    } else {
        // Fallback: try to find and remove any loading indicators that might be present
        const loadingIndicator = document.querySelector('.message.loading-message');
        if (loadingIndicator && loadingIndicator.parentNode) {
            chatMessages.removeChild(loadingIndicator);
        }
    }
}

// Variables for response control
let isResponding = false;

// Function to send a message to the API
// Function to send a message to the API
async function sendMessage(message) {
    try {
        userInput.disabled = true;
        sendButton.disabled = true;
        sendButton.style.display = 'none';
        stopBtn.style.display = 'flex';
        isResponding = true;

        controller = new AbortController();
        const signal = controller.signal;

        chatHistory.push({ role: 'user', content: message });

        if (currentChatId && currentUser) {
            const messageData = {
                role: 'user',
                content: message,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            saveMessageToChat(currentChatId, messageData);

            const currentChat = chatHistory.find(chat => chat.id === currentChatId);
            if (currentChat && currentChat.title === 'New Chat') {
                let newTitle = message.split(' ').slice(0, 4).join(' ');
                if (message.length > newTitle.length) newTitle += '...';
                renameChat(currentChatId, newTitle).then(success => {
                    if (success) {
                        const chatItem = document.querySelector(`.chat-item[data-id="${currentChatId}"]`);
                        if (chatItem) {
                            const titleElement = chatItem.querySelector('.chat-title');
                            if (titleElement) titleElement.textContent = newTitle;
                        }
                        currentChat.title = newTitle;
                    }
                });
            }
        }

        const loadingIndicator = addLoadingIndicator();

        let headers = { 'Content-Type': 'application/json' };
        if (firebase.auth().currentUser) {
            try {
                const token = await firebase.auth().currentUser.getIdToken(true);
                headers['Authorization'] = `Bearer ${token}`;
            } catch (tokenError) {
                console.error('Error getting auth token:', tokenError);
            }
        }

        // Process chat history to handle large content before sending to API
        const MAX_CONTENT_LENGTH = 1000; // Maximum length for message content
        const processedChatHistory = chatHistory.map(msg => {
            if (msg.content && typeof msg.content === 'string' && msg.content.length > MAX_CONTENT_LENGTH) {
                // Create a copy of the message to avoid modifying the original
                const processedMsg = {...msg};
                // Extract title from large content (first few words)
                const words = msg.content.split(' ');
                const title = words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
                // Replace large content with title
                processedMsg.content = `[Large content: ${title}]`;
                console.log(`Truncated large message content (${msg.content.length} chars) to title`);
                return processedMsg;
            }
            return msg;
        });

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message,
                model: currentModel,
                chatHistory: processedChatHistory
            }),
            signal
        });

        removeLoadingIndicator(loadingIndicator);

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication error: API key may be missing or invalid');
            } else {
                throw new Error('Failed to get response from API');
            }
        }

        const data = await response.json();
        const content = data.response;

        if (content) {
            // Create assistant message UI element
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('message', 'assistant');
            const messageContent = document.createElement('div');
            messageContent.classList.add('message-content');
            messageDiv.appendChild(messageContent);
            chatMessages.appendChild(messageDiv);
            gsap.set(messageDiv, { opacity: 0, y: 20 });
            gsap.to(messageDiv, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Markdown & Emoji rendering
            const renderEmojiMarkdown = (text) => {
                const renderer = new marked.Renderer();
                const originalText = renderer.text;
                const originalLink = renderer.link;
                renderer.link = function(href, title, text) {
                    const link = originalLink.call(this, href, title, text);
                    return link.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
                };

                renderer.text = function(text) {
                    if (typeof text !== 'string') return originalText.call(this, text);
                    if (window.replaceEmojis && typeof window.replaceEmojis === 'function') {
                        return window.replaceEmojis(originalText.call(this, text));
                    }
                    return originalText.call(this, text);
                };

                return marked.parse(text, { renderer });
            };

            let formattedContent = '';
            const completeContent = content;
            let isTypingCancelled = false;

            const shouldCancelTyping = () => !isResponding || isTypingCancelled;

            try {
                if (content.includes('```')) {
                    const parts = content.split('```');
                    let processedParts = parts.map(() => '');

                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        for (let j = 0; j < part.length; j += 100) {
                            if (shouldCancelTyping()) throw new Error('Typing cancelled');
                            processedParts[i] += part.substring(j, j + 100);
                            
                            // Use parseCodeBlocks instead of renderEmojiMarkdown for proper code block rendering
                            const processedContent = processedParts.join('```');
                            messageContent.innerHTML = parseCodeBlocks(processedContent);
                            
                            // Store the original content as a data attribute on the message div
                            const messageDiv = messageContent.closest('.message');
                            if (messageDiv && !messageDiv.hasAttribute('data-original-content')) {
                                messageDiv.setAttribute('data-original-content', content);
                                console.log('Setting original content in renderEmojiMarkdown');
                            }
                            
                            // Apply syntax highlighting to any code blocks that have been rendered
                            messageContent.querySelectorAll('pre code').forEach(block => {
                                try {
                                    hljs.highlightElement(block);
                                } catch (e) {
                                    console.error('Error applying syntax highlighting:', e);
                                }
                            });
                            
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                            await new Promise(r => setTimeout(r, 10));
                        }

                        if (i < parts.length - 1) {
                            if (shouldCancelTyping()) throw new Error('Typing cancelled');
                            await new Promise(r => setTimeout(r, 10));
                        }
                    }
                } else {
                    for (let i = 0; i < content.length; i += 15) {
                        if (shouldCancelTyping()) throw new Error('Typing cancelled');
                        formattedContent += content.substring(i, i + 15);
                        
                        // Process markdown and emojis
                        let processedContent = marked.parse(formattedContent);
                        
                        // Apply emoji replacement directly
                        if (window.replaceEmojis && typeof window.replaceEmojis === 'function') {
                            processedContent = window.replaceEmojis(processedContent);
                        }
                        
                        messageContent.innerHTML = processedContent;
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        await new Promise(r => setTimeout(r, 0));
                    }
                }
            } catch (err) {
                console.log('Typing animation cancelled');
                messageContent.innerHTML = renderEmojiMarkdown(completeContent);
                
                // Store the original content as a data attribute on the message div
                const messageDiv = messageContent.closest('.message');
                if (messageDiv && !messageDiv.hasAttribute('data-original-content')) {
                    messageDiv.setAttribute('data-original-content', completeContent);
                    console.log('Setting original content in renderEmojiMarkdown catch block');
                }
                
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }

            // Save assistant reply
            chatHistory.push({ role: 'assistant', content });
            if (currentChatId && currentUser) {
                saveMessageToChat(currentChatId, {
                    role: 'assistant',
                    content,
                    modelId: currentModel,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            // Feedback buttons
            const feedbackContainer = document.createElement('div');
            feedbackContainer.classList.add('message-feedback');

            const modelWatermark = document.createElement('div');
            modelWatermark.classList.add('model-watermark');
            const modelIdToUse = currentModel;
            let modelName = availableModels?.[modelIdToUse]?.display_name || modelIdToUse.replace(/-/g, ' ');
            modelWatermark.textContent = `Model Used: ${modelName}`;
            modelWatermark.setAttribute('data-model-id', modelIdToUse || '');
            feedbackContainer.appendChild(modelWatermark);
            
            // Auto-speak functionality if enabled in settings
            const autoSpeakEnabled = localStorage.getItem('autoSpeakEnabled') === 'true';
            if (autoSpeakEnabled) {
                console.log('[DEBUG] Auto-speak enabled, preparing to read response');
                // We'll trigger this after the message is fully rendered
                setTimeout(() => {
                    // Get the message content element
                    const messageContent = messageDiv.querySelector('.message-content');
                    if (messageContent) {
                        // Process the text for speech (remove code blocks and emojis)
                        let textToSpeak = processTextForSpeech(messageContent);
                        
                        // Summarize the text if it's too long
                        textToSpeak = summarizeTextForSpeech(textToSpeak);
                        
                        // Get the selected voice from localStorage
                        let voice = localStorage.getItem('selectedVoice') || 'en-US-AvaNeural';
                        // Handle the Sara voice substitution
                        if (voice === 'en-US-SaraNeural') {
                            voice = 'en-US-AvaNeural';
                        }
                        
                        // Show loading indicator
                        const speakBtn = messageDiv.querySelector('.speak-btn');
                        if (speakBtn) {
                            speakBtn.classList.add('loading');
                            speakBtn.innerHTML = '<div class="spinner"></div>';
                        }
                        
                        // Make the API request to get the audio
                        fetch('/api/edge-tts', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                text: textToSpeak,
                                voice: voice
                            })
                        })
                        .then(response => response.json())
                        .then(data => {
                            // If there's already audio playing, stop it
                            if (window.readAloudAudio) {
                                window.readAloudAudio.pause();
                                window.readAloudAudio = null;
                            }
                            
                            // Create a new audio element
                            const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
                            window.readAloudAudio = audio;
                            
                            // Update the button when audio ends
                            audio.addEventListener('ended', () => {
                                if (speakBtn) {
                                    speakBtn.classList.remove('loading', 'playing');
                                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                                }
                                window.readAloudAudio = null;
                            });
                            
                            // Update the button when audio starts playing
                            audio.addEventListener('play', () => {
                                if (speakBtn) {
                                    speakBtn.classList.remove('loading');
                                    speakBtn.classList.add('playing');
                                    speakBtn.innerHTML = '<i class="fas fa-pause"></i>';
                                }
                            });
                            
                            // Play the audio
                            audio.play();
                            
                            // Notification for summarized text removed
                        })
                        .catch(error => {
                            console.error('Error with text-to-speech:', error);
                            if (speakBtn) {
                                speakBtn.classList.remove('loading', 'playing');
                                speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                            }
                            // Error notification removed
                        });
                    }
                }, 500); // Small delay to ensure the message is fully rendered
            }

            const feedbackButtons = document.createElement('div');
            feedbackButtons.classList.add('feedback-buttons');
            feedbackButtons.innerHTML = `
                <button class="feedback-btn like-btn" title="Like"><i class="fas fa-thumbs-up"></i></button>
                <button class="feedback-btn dislike-btn" title="Dislike"><i class="fas fa-thumbs-down"></i></button>
                <button class="feedback-btn copy-btn" title="Copy"><i class="fas fa-copy"></i></button>
                <button class="feedback-btn speak-btn" title="Speak"><i class="fas fa-volume-up"></i></button>
            `;
            feedbackContainer.appendChild(feedbackButtons);
            messageDiv.appendChild(feedbackContainer);

            const likeBtn = feedbackButtons.querySelector('.like-btn');
            const dislikeBtn = feedbackButtons.querySelector('.dislike-btn');
            const copyBtn = feedbackButtons.querySelector('.copy-btn');
            const speakBtn = feedbackButtons.querySelector('.speak-btn');

            likeBtn.addEventListener('click', () => {
                likeBtn.classList.toggle('active');
                if (dislikeBtn.classList.contains('active')) dislikeBtn.classList.remove('active');
            });

            dislikeBtn.addEventListener('click', () => {
                dislikeBtn.classList.toggle('active');
                if (likeBtn.classList.contains('active')) likeBtn.classList.remove('active');
            });

            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(messageContent.textContent).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
                    }, 2000);
                });
            });

            speakBtn.addEventListener('click', async () => {
                if (speakBtn.classList.contains('active')) {
                    // Stop any playing audio
                    if (window.readAloudAudio) {
                        window.readAloudAudio.pause();
                        window.readAloudAudio = null;
                    }
                    speakBtn.classList.remove('active');
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    return;
                }

                // Always process text to skip code blocks and emojis for better readability
                let textToSpeak = processTextForSpeech(messageContent);
                console.log('[DEBUG] Read Aloud: Skipping code blocks and emojis');
                
                // Check if text is too long and needs summarization
                const wordCount = textToSpeak.split(/\s+/).length;
                let isSummarized = false;
                if (wordCount > 50) {
                    console.log(`[DEBUG] Read Aloud: Text is ${wordCount} words, generating summary`);
                    textToSpeak = summarizeTextForSpeech(textToSpeak);
                    console.log(`[DEBUG] Read Aloud: Generated summary with ${textToSpeak.split(/\s+/).length} words`);
                    isSummarized = true;
                }
                
                if (!textToSpeak.trim()) {
                    textToSpeak = "This message cannot be read aloud.";
                }

                // Get the selected voice from localStorage
                let savedVoice = localStorage.getItem('selectedVoice');
                
                // If no voice is selected or the selected voice is Sara (which is unavailable)
                if (!savedVoice || savedVoice === 'en-US-SaraNeural') {
                    // Default to Ava
                    savedVoice = 'en-US-AvaNeural';
                    localStorage.setItem('selectedVoice', savedVoice);
                    console.log('[DEBUG] Read Aloud: No voice selected or Sara requested, using default voice: en-US-AvaNeural');
                } else {
                    console.log(`[DEBUG] Read Aloud: Voice selected from settings: ${savedVoice}`);
                }
                
                // Show loading indicator
                speakBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                speakBtn.classList.add('active');

                try {
                    console.log(`[DEBUG] Read Aloud: Requesting TTS with voice: ${savedVoice}`);
                    
                    // Call the Edge TTS API
                    const response = await fetch('/api/edge-tts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: textToSpeak, voice: savedVoice })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`API returned ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    
                    // Always log the voice being used for debugging
                    console.log(`[DEBUG] Read Aloud: Using voice: ${data.voice_used || savedVoice}`);
                    
                    // Log additional details about the voice selection process
                    if (data.requested_voice) {
                        console.log(`[DEBUG] Read Aloud: Requested voice: ${data.requested_voice}, Server selected: ${data.voice_used}`);
                    }
                    
                    // Always show which voice is being used
                    console.log(`[DEBUG] Read Aloud: Voice selection: ${savedVoice} → ${data.voice_used || savedVoice}`);
                        
                    // Extract the voice name for display
                    let voiceName = "Unknown";
                    const voiceToDisplay = data.voice_used || savedVoice;
                    const voiceParts = voiceToDisplay.split('-');
                    if (voiceParts.length >= 3) {
                        voiceName = voiceParts[2].replace('Neural', '');
                        // Handle multilingual voices
                        if (voiceName.includes('Multilingual')) {
                            voiceName = voiceName.replace('Multilingual', '') + ' Multilingual';
                        }
                    } else {
                        voiceName = voiceToDisplay;
                    }
                    
                    // Log voice information without showing notification
                    if (data.voice_used && data.voice_used !== savedVoice) {
                        console.log(`[DEBUG] Read Aloud: Voice substitution: ${savedVoice} → ${data.voice_used}`);
                    } else {
                        console.log(`[DEBUG] Read Aloud: Using voice: ${voiceName}`);
                    }
                    
                    // Process and play the audio
                    const audioData = atob(data.audio);
                    const arrayBuffer = new ArrayBuffer(audioData.length);
                    const uint8Array = new Uint8Array(arrayBuffer);
                    for (let i = 0; i < audioData.length; i++) uint8Array[i] = audioData.charCodeAt(i);
                    const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    
                    // Store the audio object for potential stopping later
                    window.readAloudAudio = audio;
                    
                    // Update the button to show it's playing
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    
                    // Play the audio
                    await audio.play().catch(err => {
                        console.error('[DEBUG] Read Aloud: Error playing audio:', err);
                        throw new Error('Failed to play audio');
                    });
                    
                    // Notification for summarized text removed
                    
                    // Handle audio completion
                    audio.onended = () => {
                        console.log(`[DEBUG] Read Aloud: Audio playback completed (Voice used: ${data.voice_used || savedVoice})`);
                        speakBtn.classList.remove('active');
                        URL.revokeObjectURL(audioUrl);
                        window.readAloudAudio = null;
                    };
                    
                    // Handle audio errors
                    audio.onerror = (e) => {
                        console.error('[DEBUG] Read Aloud: Audio playback error:', e);
                        speakBtn.classList.remove('active');
                        URL.revokeObjectURL(audioUrl);
                        window.readAloudAudio = null;
                        speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                    };
                } catch (error) {
                    console.error('[DEBUG] Read Aloud: Edge TTS failed:', error);
                    
                    // Error notification removed
                    
                    // Reset UI state
                    speakBtn.classList.remove('active');
                    speakBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                }
            });
        } else if (data.error) {
            addMessage(`Error: ${data.error}`, 'system');
        }

        userInput.disabled = false;
        sendButton.disabled = false;
        sendButton.style.display = 'flex';
        stopBtn.style.display = 'none';
        isResponding = false;
        controller = null;
        userInput.focus();

    } catch (error) {
        console.error('Error:', error);
        if (error.name !== 'AbortError') {
            if (error.message.includes('API key')) {
                addMessage('Error: The API key is missing or invalid. Please check the server configuration.', 'system');
            } else {
                addMessage(`An error occurred: ${error.message}`, 'system');
            }
        }

        userInput.disabled = false;
        sendButton.disabled = false;
        sendButton.style.display = 'flex';
        stopBtn.style.display = 'none';
        isResponding = false;
        controller = null;
        userInput.focus();
    }
}

// Add event listener for stop button
if (stopBtn) {
    stopBtn.addEventListener('click', () => {
        if (controller && isResponding) {
            controller.abort();
            
            // Remove any existing loading indicators
            const loadingIndicator = document.querySelector('.message.loading-message');
            if (loadingIndicator && loadingIndicator.parentNode) {
                chatMessages.removeChild(loadingIndicator);
            }
            
            // Set isResponding to false to stop the typing animation
            isResponding = false;
            
            // Add a small delay before showing the system message to allow the typing animation to complete
            setTimeout(() => {
                addMessage('Response stopped by You', 'system');
                
                // Reset UI
                userInput.disabled = false;
                sendButton.disabled = false;
                sendButton.style.display = 'flex';
                stopBtn.style.display = 'none';
                controller = null;
                userInput.focus();
            }, 100);
        }
    });
}

// Event listener for send button
sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    
    if (message) {
        // Add the user's message to the chat
        addMessage(message, 'user');
        
        // Clear the input field
        userInput.value = '';
        
        // Reset textarea height to default after clearing
        userInput.style.height = 'auto';
        
        // Always scroll to the bottom when sending a message
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Send the message to the API
        sendMessage(message);
    }
});

// Event listener for Enter key and Ctrl+Enter key
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        if (event.ctrlKey) {
            // Insert a new line when Ctrl+Enter is pressed
            event.preventDefault();
            const start = userInput.selectionStart;
            const end = userInput.selectionEnd;
            userInput.value = userInput.value.substring(0, start) + '\n' + userInput.value.substring(end);
            userInput.selectionStart = userInput.selectionEnd = start + 1;
            
            // Trigger the input event to adjust textarea height
            const inputEvent = new Event('input', { bubbles: true });
            userInput.dispatchEvent(inputEvent);
        } else if (!event.shiftKey) {
            event.preventDefault();
            sendButton.click();
        }
    }
});

// Add word limit to user input (6000 words) and auto-resize functionality
userInput.addEventListener('input', () => {
    const text = userInput.value;
    const wordCount = text.trim().split(/\s+/).length;
    
    // Auto-resize the textarea based on content
    userInput.style.height = 'auto';
    
    // Set a maximum height for very large content
    if (wordCount > 100) {
        userInput.style.height = '10rem';
    } else {
        userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
    }
    
    // Handle word limit
    if (wordCount > 6000) {
        // If over the limit, truncate to 6000 words
        const words = text.trim().split(/\s+/);
        userInput.value = words.slice(0, 6000).join(' ');
        
        // Disable send button and add tooltip
        sendButton.disabled = true;
        sendButton.setAttribute('data-tooltip', 'You exceed word limit 6000');
        
        // Show toast notification
        showToast('Word limit reached (6000 words maximum)', 'warning');
    } else {
        // Re-enable send button if below limit
        sendButton.disabled = false;
        sendButton.removeAttribute('data-tooltip');
    }
});

// Reset textarea height when cleared
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && userInput.value === '') {
        userInput.style.height = 'auto';
    }
});

// Focus the input field when the page loads
userInput.focus();

// Function to copy code to clipboard
function copyCodeToClipboard(button, event) {
    // If event is not passed directly, get it from the window
    event = event || window.event;
    
    const codeBlock = button.closest('.code-block');
    const codeElement = codeBlock.querySelector('code');
    const textToCopy = codeElement.textContent;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Change button text temporarily
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('copied');
        
        // Reset button text after 2 seconds
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        button.textContent = 'Failed';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    });
    
    // Prevent event bubbling if event exists
    if (event) {
        event.stopPropagation();
    }
}

// Button hover animation
sendButton.addEventListener('mouseenter', () => {
    gsap.to(sendButton, {
        scale: 1.05,
        duration: 0.3,
        ease: 'power2.out'
    });
});

sendButton.addEventListener('mouseleave', () => {
    gsap.to(sendButton, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out'
    });
});

// Textarea animation on focus
userInput.addEventListener('focus', () => {
    gsap.to(userInput, {
        boxShadow: '0 0 0 2px rgba(79, 172, 254, 0.7)',
        duration: 0.3
    });
});

userInput.addEventListener('blur', () => {
    gsap.to(userInput, {
        boxShadow: 'none',
        duration: 0.3
    });
});

// ===== Chat Management Functions =====

// Initialize chat functionality
async function initializeChats() {
    console.log('Initializing chats...');
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            console.log('User authenticated:', user.email);
            currentUser = user;
            
            // Clean up any existing listener before setting up a new one
            if (window.chatUnsubscribe) {
                console.log('Cleaning up existing chat listener');
                window.chatUnsubscribe();
            }
            
            // Set up real-time listener for user's chats
            setupChatListener(user.uid);
            
            try {
                // Check if there's a chat ID in the URL
                const urlParams = new URLSearchParams(window.location.search);
                const urlChatId = urlParams.get('chat');
                
                if (urlChatId) {
                    console.log('Found chat ID in URL:', urlChatId);
                    
                    try {
                        // Verify this chat exists and belongs to the current user
                        const chatDoc = await firebase.firestore().collection('chats').doc(urlChatId).get();
                        
                        if (chatDoc.exists && chatDoc.data().userId === user.uid) {
                            console.log('Loading chat from URL');
                            loadChat(urlChatId);
                            return;
                        } else {
                            console.log('Chat from URL not found or does not belong to current user');
                        }
                    } catch (error) {
                        console.error('Error verifying chat from URL:', error);
                    }
                }
                
                // If no valid chat ID in URL, check localStorage
                const savedChatId = localStorage.getItem('currentChatId');
                
                if (savedChatId) {
                    console.log('Found saved chat ID in localStorage:', savedChatId);
                    
                    try {
                        // Verify this chat exists and belongs to the current user
                        const chatDoc = await firebase.firestore().collection('chats').doc(savedChatId).get();
                        
                        if (chatDoc.exists && chatDoc.data().userId === user.uid) {
                            console.log('Loading saved chat');
                            loadChat(savedChatId);
                            return;
                        } else {
                            console.log('Saved chat not found or does not belong to current user');
                            // Clear invalid saved chat ID
                            localStorage.removeItem('currentChatId');
                        }
                    } catch (error) {
                        console.error('Error verifying saved chat:', error);
                        
                        // If we're offline, we might not be able to verify the chat
                        // Try to load it anyway, the setupChatListener will handle validation when online
                        console.log('Attempting to load saved chat without verification (possibly offline)');
                        loadChat(savedChatId);
                        return;
                    }
                }
                
                // If no valid saved chat, check if user has any chats
                try {
                    // The setupChatListener will handle loading the first chat if available
                    // so we only need to create a new chat if there are no existing chats
                    const chatsSnapshot = await firebase.firestore().collection('chats')
                        .where('userId', '==', user.uid)
                        .orderBy('lastUpdated', 'desc')
                        .limit(1)
                        .get();
                        
                    if (chatsSnapshot.empty) {
                        console.log('No chats found, creating new chat session');
                        await createNewChatSession();
                    }
                    // We don't need to load the most recent chat here anymore
                    // as the setupChatListener will handle that
                } catch (error) {
                    console.error('Error checking for existing chats:', error);
                    
                    // If we're offline and can't query Firestore, try to load from localStorage
                    try {
                        const savedHistory = localStorage.getItem('chatHistory');
                        if (savedHistory) {
                            const parsedHistory = JSON.parse(savedHistory);
                            if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                                console.log('Loading chat history from localStorage due to offline state');
                                chatHistory = parsedHistory;
                                
                                // Clear and rebuild sidebar
                                clearChatSidebar();
                                chatHistory.forEach(chat => addChatToSidebar(chat));
                                
                                // Load the first chat
                                if (chatHistory.length > 0) {
                                    loadChat(chatHistory[0].id);
                                    return;
                                }
                            }
                        }
                        
                        // If we couldn't load from localStorage either, create a new chat
                        console.log('No saved chats found, creating new chat session');
                        await createNewChatSession();
                    } catch (e) {
                        console.error('Error loading from localStorage, creating new chat:', e);
                        await createNewChatSession();
                    }
                }
            } catch (error) {
                console.error('Unexpected error during chat initialization:', error);
                // Create a new chat as a fallback
                try {
                    await createNewChatSession();
                } catch (e) {
                    console.error('Failed to create new chat session:', e);
                    alert('There was an error initializing the chat. Please try refreshing the page.');
                }
            }
        } else {
            console.log('User not authenticated');
            // Clear any existing chat data when not authenticated
            currentChatId = null;
            chatHistory = [];
            clearChatSidebar();
        }
    });
}

// Set up real-time listener for user's chats
function setupChatListener(userId) {
    console.log('Setting up real-time chat listener for user:', userId);
    
    // Clear existing chats from sidebar
    clearChatSidebar();
    
    // Reset chat history array
    chatHistory = [];
    
    // Set up real-time listener for chats collection with cache-first strategy
    const unsubscribe = firebase.firestore().collection('chats')
        .where('userId', '==', userId)
        .orderBy('lastUpdated', 'desc')
        .onSnapshot({
            // Listen for document changes
            next: (snapshot) => {
                console.log('Chat collection updated, document count:', snapshot.docs.length);
                
                // Handle added or modified chats
                snapshot.docChanges().forEach(change => {
                    const chatData = {
                        id: change.doc.id,
                        ...change.doc.data()
                    };
                    
                    if (change.type === 'added') {
                        console.log('New chat added:', chatData.id, chatData.title);
                        // Add to local chat history array if not already present
                        if (!chatHistory.some(chat => chat.id === chatData.id)) {
                            chatHistory.unshift(chatData);
                            addChatToSidebar(chatData);
                        }
                    }
                    
                    if (change.type === 'modified') {
                        console.log('Chat modified:', chatData.id, chatData.title);
                        // Update in local chat history
                        const index = chatHistory.findIndex(chat => chat.id === chatData.id);
                        if (index !== -1) {
                            chatHistory[index] = chatData;
                        } else {
                            // If not found, add it (this can happen with offline/online syncing)
                            chatHistory.unshift(chatData);
                        }
                        
                        // Update in sidebar
                        updateChatInSidebar(chatData);
                    }
                    
                    if (change.type === 'removed') {
                        console.log('Chat removed:', chatData.id);
                        // Remove from local chat history
                        chatHistory = chatHistory.filter(chat => chat.id !== chatData.id);
                        
                        // Remove from sidebar
                        const chatItem = document.querySelector(`.chat-item[data-id="${chatData.id}"]`);
                        if (chatItem) {
                            const parentElement = chatItem.closest('.chat-history-item');
                            if (parentElement) {
                                parentElement.remove();
                            }
                        }
                        
                        // If the removed chat was active, load another chat or create a new one
                        if (currentChatId === chatData.id) {
                            if (chatHistory.length > 0) {
                                loadChat(chatHistory[0].id);
                            } else {
                                createNewChatSession();
                            }
                        }
                    }
                });
                
                // After initial load, if we have chats but none is selected, load the first one
                if (chatHistory.length > 0 && !currentChatId) {
                    console.log('Loading first chat from history');
                    loadChat(chatHistory[0].id);
                }
                
                // Save chat history to localStorage for backup persistence
                try {
                    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
                    console.log('Chat history saved to localStorage, count:', chatHistory.length);
                } catch (e) {
                    console.warn('Failed to save chat history to localStorage:', e);
                }
            },
            error: (error) => {
                console.error('Error listening to chat updates:', error);
                
                // If there's an error with the listener, try to load from localStorage
                try {
                    const savedHistory = localStorage.getItem('chatHistory');
                    if (savedHistory) {
                        const parsedHistory = JSON.parse(savedHistory);
                        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
                            console.log('Loading chat history from localStorage, count:', parsedHistory.length);
                            chatHistory = parsedHistory;
                            
                            // Clear and rebuild sidebar
                            clearChatSidebar();
                            chatHistory.forEach(chat => addChatToSidebar(chat));
                            
                            // Load the first chat
                            if (!currentChatId && chatHistory.length > 0) {
                                loadChat(chatHistory[0].id);
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error loading chat history from localStorage:', e);
                }
            }
        });
        
    // Store the unsubscribe function in window to persist between page reloads
    window.chatUnsubscribe = unsubscribe;
    return unsubscribe;
}

// Clear chat sidebar
function clearChatSidebar() {
    console.log('Clearing chat history container');
    // Clear the chat history container except for the template
    const template = document.getElementById('chat-item-template');
    if (!template) {
        console.error('Chat item template not found');
        return;
    }
    
    while (chatHistoryContainer.firstChild) {
        if (chatHistoryContainer.firstChild === template) {
            break;
        }
        chatHistoryContainer.removeChild(chatHistoryContainer.firstChild);
    }
}

// Add a chat to the sidebar
function addChatToSidebar(chat) {
    // Clone the template
    const template = document.getElementById('chat-item-template');
    if (!template) {
        console.error('Chat item template not found');
        return;
    }
    
    // Check if chat already exists in sidebar
    const existingChatItem = document.querySelector(`.chat-item[data-id="${chat.id}"]`);
    if (existingChatItem) {
        console.log('Chat already exists in sidebar, updating instead');
        updateChatInSidebar(chat);
        return;
    }
    
    // Create a container for the chat item
    const chatHistoryItem = document.createElement('div');
    chatHistoryItem.classList.add('chat-history-item');
    
    // Clone the template content
    const clone = template.querySelector('.chat-item').cloneNode(true);
    clone.setAttribute('data-id', chat.id);
    
    const chatTitle = clone.querySelector('.chat-title');
    chatTitle.textContent = chat.title || 'New Chat';
    
    // Add the cloned chat item to the container
    chatHistoryItem.appendChild(clone);
    
    // Add click event to load chat
    clone.addEventListener('click', (e) => {
        // Ignore clicks on the menu toggle or menu items
        if (e.target.closest('.chat-menu-toggle') || e.target.closest('.chat-menu')) {
            return;
        }
        
        loadChat(chat.id);
    });
    
    // Add menu toggle functionality
    const menuToggle = clone.querySelector('.chat-menu-toggle');
    const menu = clone.querySelector('.chat-menu');
    
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
        
        // Close other open menus
        document.querySelectorAll('.chat-menu.active').forEach(m => {
            if (m !== menu) {
                m.classList.remove('active');
            }
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', () => {
        menu.classList.remove('active');
    });
    
    // Rename chat functionality
    const renameBtn = clone.querySelector('.rename-chat');
    renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showRenameDialog(chat.id, chat.title);
    });
    
    // Delete chat functionality
    const deleteBtn = clone.querySelector('.delete-chat');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        confirmDeleteChat(chat.id);
    });
    
    // Add to the chat history container
    chatHistoryContainer.insertBefore(chatHistoryItem, template);
    
    // Highlight if it's the current chat
    if (currentChatId === chat.id) {
        clone.classList.add('active');
    }
}

// Update a chat in the sidebar
function updateChatInSidebar(chat) {
    const chatItem = document.querySelector(`.chat-item[data-id="${chat.id}"]`);
    if (!chatItem) {
        console.log('Chat not found in sidebar, adding instead');
        addChatToSidebar(chat);
        return;
    }
    
    // Update chat title
    const chatTitle = chatItem.querySelector('.chat-title');
    if (chatTitle) {
        chatTitle.textContent = chat.title || 'New Chat';
    }
    
    // Highlight if it's the current chat
    if (currentChatId === chat.id) {
        chatItem.classList.add('active');
    }
}

// Remove a chat from the sidebar
function removeChatFromSidebar(chatId) {
    const chatItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
    if (chatItem) {
        // Get the parent chat-history-item container and remove it
        const chatHistoryItem = chatItem.closest('.chat-history-item');
        if (chatHistoryItem) {
            chatHistoryItem.remove();
        } else {
            // Fallback to removing just the chat item if container not found
            chatItem.remove();
        }
    }
}

// Create a new chat session
async function createNewChatSession() {
    console.log('Creating new chat session...');
    if (!currentUser) {
        console.log('Cannot create chat: No user logged in');
        return;
    }
    
    try {
        console.log('Creating new chat for user:', currentUser.uid);
        // Create a new chat in Firebase
        const chatId = await createNewChat(currentUser.uid);
        
        if (chatId) {
            console.log('New chat created with ID:', chatId);
            // Load the new chat immediately
            loadChat(chatId);
            console.log('Loaded new chat');
            
            // Note: The chat will be added to the sidebar automatically by the real-time listener
        } else {
            console.error('Failed to create new chat: No chat ID returned');
        }
    } catch (error) {
        console.error('Error creating new chat:', error);
    }
}

// Load a specific chat
async function loadChat(chatId) {
    if (!chatId) return;
    
    try {
        console.log('Loading chat:', chatId);
        // Set current chat ID
        currentChatId = chatId;
        
        // Store current chat ID in localStorage for persistence between page reloads
        localStorage.setItem('currentChatId', chatId);
        
        // Update URL with chat ID without reloading the page
        const newUrl = `${window.location.origin}${window.location.pathname}?chat=${chatId}`;
        window.history.pushState({ chatId: chatId }, '', newUrl);
        
        // Update active state in sidebar
        document.querySelectorAll('.chat-item').forEach(item => {
            if (item.getAttribute('data-id') === chatId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // Clear chat messages
        while (chatMessages.children.length > 0) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
        
        try {
            // Get chat data
            const chat = await getChat(chatId);
            
            if (chat) {
                // Get messages from the subcollection
                const messages = await getChatMessages(chatId);
                
                // Add system welcome message if no messages
                if (messages.length === 0) {
                    addMessage("Hello! I'm NumAI, How can I help you today?", 'system');
                } else {
                    // Add messages from chat history and rebuild chat history array
                    // Reset chat history array with just the system message
                    chatHistory = [
                        { 
                            role: 'system', 
                            content: 'You are NumAI, a helpful assistant. When a user says only \'hello\', respond with just \'Hello! How can I help you today?\' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples.'
                        }
                    ];
                    
                    messages.forEach(msg => {
                        // Add message to the UI
                        // This will set data-original-content for assistant messages
                        addMessage(msg.content, msg.role, false, msg.modelId);
                        
                        // Add to chat history array (skip system messages)
                        if (msg.role === 'user' || msg.role === 'assistant') {
                            chatHistory.push({
                                role: msg.role,
                                content: msg.content
                            });
                        }
                    });
                    
                    console.log('Restored chat history:', chatHistory);
                }
                
                // Save chat and messages to localStorage for offline access
                try {
                    localStorage.setItem('currentChatData', JSON.stringify({
                        chat: chat,
                        messages: messages,
                        modelId: currentModel, // Save the current model ID
                        timestamp: new Date().getTime()
                    }));
                    console.log('Chat data saved to localStorage for offline access');
                } catch (e) {
                    console.warn('Failed to save chat data to localStorage:', e);
                }
            }
        } catch (error) {
            console.error('Error fetching chat from Firestore:', error);
            console.log('Attempting to load chat from localStorage...');
            
            // Try to load from localStorage if available
            try {
                const savedChatData = localStorage.getItem('currentChatData');
                if (savedChatData) {
                    const parsedData = JSON.parse(savedChatData);
                    const chat = parsedData.chat;
                    const messages = parsedData.messages;
                    
                    // Restore the model ID if it was saved
                    if (parsedData.modelId) {
                        currentModel = parsedData.modelId;
                        console.log('Restored model ID from localStorage:', currentModel);
                    }
                    
                    if (chat && chat.id === chatId) {
                        console.log('Loading chat from localStorage cache');
                        
                        // Add system welcome message if no messages
                        if (!messages || messages.length === 0) {
                            addMessage("Hello! I'm NumAI, How can I help you today?", 'system');
                        } else {
                            // Add messages from cached history and rebuild chat history array
                        // Reset chat history array with just the system message
                        chatHistory = [
                            { 
                                role: 'system', 
                                content: 'You are NumAI, a helpful assistant. When a user says only \'hello\', respond with just \'Hello! How can I help you today?\' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples.'
                            }
                        ];
                        
                        messages.forEach(msg => {
                            // Add message to the UI
                            // This will set data-original-content for assistant messages
                            addMessage(msg.content, msg.role, false, msg.modelId);
                            
                            // Add to chat history array (skip system messages)
                            if (msg.role === 'user' || msg.role === 'assistant') {
                                chatHistory.push({
                                    role: msg.role,
                                    content: msg.content
                                });
                            }
                        });
                        
                        console.log('Restored chat history from localStorage:', chatHistory);
                        }
                        
                        // Add offline indicator message
                        addMessage("You appear to be offline. Your messages will be saved and synchronized when you reconnect.", 'system', true);
                    } else {
                        // Wrong chat in cache
                        addMessage("You appear to be offline. This chat's history isn't available offline.", 'system', true);
                    }
                } else {
                    // No cache available
                    addMessage("You appear to be offline. Chat history isn't available.", 'system', true);
                }
            } catch (e) {
                console.error('Error loading chat from localStorage:', e);
                addMessage("There was an error loading your chat. Please try again later.", 'system', true);
            }
        }
        
        // Clear input and focus
        userInput.value = '';
        userInput.focus();
        
        // Close sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }
        
        // if (chatMessages) {
        //     chatMessages.scrollTop = chatMessages.scrollHeight;
        // }
    } catch (error) {
        console.error('Unexpected error in loadChat:', error);
        addMessage("There was an error loading your chat. Please try again later.", 'system', true);
    }
    
    // At the end of loadChat, after all messages are rendered:
    // Apply syntax highlighting and ensure we scroll to the bottom of the chat
    // with a short delay to allow DOM to fully update
    setTimeout(() => {
        // Fix any formatting issues with code blocks in assistant messages
        document.querySelectorAll('.message.assistant').forEach(messageDiv => {
            try {
                // Get the original markdown content from the data attribute
                const originalContent = messageDiv.getAttribute('data-original-content');
                const messageContent = messageDiv.querySelector('.message-content');
                
                if (originalContent) {
                    console.log('Found original content for message:', originalContent.substring(0, 50) + '...');
                    
                    if (originalContent.includes('```')) {
                        console.log('Reprocessing code blocks in loaded message using original content');
                        // Reprocess the original content with parseCodeBlocks
                        messageContent.innerHTML = parseCodeBlocks(originalContent);
                        
                        // Apply syntax highlighting to all code blocks
                        messageContent.querySelectorAll('pre code').forEach(block => {
                            try {
                                hljs.highlightElement(block);
                            } catch (e) {
                                console.error('Error applying syntax highlighting:', e);
                            }
                        });
                    } else if (originalContent.includes('`')) {
                        // Handle inline code if no code blocks
                        console.log('Processing markdown with inline code');
                        const renderer = new marked.Renderer();
                        const originalLink = renderer.link;
                        
                        renderer.link = function(href, title, text) {
                            const link = originalLink.call(this, href, title, text);
                            return link.replace('<a ', '<a target="_blank" rel="noopener noreferrer" ');
                        };
                        
                        messageContent.innerHTML = marked.parse(originalContent, { renderer });
                    }
                } else {
                    console.log('No original content found for message, applying highlighting only');
                    // If no original content is available, just apply highlighting
                    messageContent.querySelectorAll('pre code').forEach(block => {
                        try {
                            hljs.highlightElement(block);
                        } catch (e) {
                            console.error('Error applying syntax highlighting:', e);
                        }
                    });
                }
            } catch (e) {
                console.error('Error fixing code block formatting in loadChat:', e);
            }
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 300); // Increased timeout to ensure DOM is fully updated
}

// Show rename dialog
function showRenameDialog(chatId, currentTitle) {
    // Create dialog if it doesn't exist
    let dialog = document.querySelector('.rename-dialog');
    
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.classList.add('rename-dialog');
        
        dialog.innerHTML = `
            <div class="rename-dialog-content">
                <div class="rename-dialog-header">Rename Chat</div>
                <input type="text" class="rename-dialog-input" placeholder="Enter new title">
                <div class="rename-dialog-actions">
                    <button class="rename-dialog-btn rename-cancel-btn">Cancel</button>
                    <button class="rename-dialog-btn rename-confirm-btn">Rename</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }
    
    // Set current title in input
    const input = dialog.querySelector('.rename-dialog-input');
    input.value = currentTitle;
    
    // Show dialog
    dialog.classList.add('active');
    
    // Focus input
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
    
    // Handle cancel button
    const cancelBtn = dialog.querySelector('.rename-cancel-btn');
    cancelBtn.onclick = () => {
        dialog.classList.remove('active');
    };
    
    // Handle confirm button
    const confirmBtn = dialog.querySelector('.rename-confirm-btn');
    confirmBtn.onclick = async () => {
        const newTitle = input.value.trim();
        
        if (newTitle && newTitle !== currentTitle) {
            try {
                // Update chat title in Firebase
                await renameChat(chatId, newTitle);
                console.log('Chat renamed successfully:', chatId, newTitle);
                // Note: The chat title will be updated in the sidebar automatically by the real-time listener
            } catch (error) {
                console.error('Error renaming chat:', error);
            }
        }
        
        dialog.classList.remove('active');
    };
    
    // Handle Enter key in input
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmBtn.click();
        }
    };
    
    // Close dialog when clicking outside
    dialog.onclick = (e) => {
        if (e.target === dialog) {
            dialog.classList.remove('active');
        }
    };
}

// Confirm and delete chat
function confirmDeleteChat(chatId) {
    // Create dialog if it doesn't exist
    let dialog = document.querySelector('.delete-dialog');
    
    if (!dialog) {
        dialog = document.createElement('div');
        dialog.classList.add('delete-dialog');
        
        dialog.innerHTML = `
            <div class="delete-dialog-content">
                <div class="delete-dialog-header">Delete Chat</div>
                <div class="delete-dialog-message">Are you sure you want to delete this chat? This action cannot be undone.</div>
                <div class="delete-dialog-actions">
                    <button class="delete-dialog-btn delete-cancel-btn">Cancel</button>
                    <button class="delete-dialog-btn delete-confirm-btn">Delete</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Add styles for the delete dialog
        const style = document.createElement('style');
        style.textContent = `
            .delete-dialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
            }
            
            .delete-dialog.active {
                opacity: 1;
                visibility: visible;
            }
            
            .delete-dialog-content {
                background-color: #222323;
                border-radius: 8px;
                padding: 20px;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            .delete-dialog-header {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 15px;
                color: #e74c3c;
            }
            
            .delete-dialog-message {
                margin-bottom: 20px;
                line-height: 1.5;
                color: white;
            }
            
            .delete-dialog-actions {
                display: flex;
                justify-content: flex-end;
            }
            
            .delete-dialog-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: 500;
                transition: background-color 0.2s;
            }
            
            .delete-cancel-btn {
                background-color: #f1f1f1;
                color: #333;
                margin-right: 10px;
            }
            
            .delete-cancel-btn:hover {
                background-color: #e1e1e1;
            }
            
            .delete-confirm-btn {
                background-color: #e74c3c;
                color: white;
            }
            
            .delete-confirm-btn:hover {
                background-color: #c0392b;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Show dialog
    dialog.classList.add('active');
    
    // Handle cancel button
    const cancelBtn = dialog.querySelector('.delete-cancel-btn');
    cancelBtn.onclick = () => {
        dialog.classList.remove('active');
    };
    
    // Handle confirm button
    const confirmBtn = dialog.querySelector('.delete-confirm-btn');
    confirmBtn.onclick = async () => {
        try {
            // Check if this is the current chat
            const isCurrentChat = (chatId === currentChatId);
            
            // Delete chat from Firebase
            const success = await deleteChat(chatId);
            if (success) {
                console.log('Chat deleted successfully:', chatId);
                // If the deleted chat was the current chat, remove it from localStorage
                if (isCurrentChat) {
                    localStorage.removeItem('currentChatId');
                }
                // Note: The chat will be removed from the sidebar automatically by the real-time listener
                // and if it was the current chat, the listener will load another chat or create a new one
            } else {
                console.error('Failed to delete chat:', chatId);
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
        
        dialog.classList.remove('active');
    };
    
    // Close dialog when clicking outside
    dialog.onclick = (e) => {
        if (e.target === dialog) {
            dialog.classList.remove('active');
        }
    };
}

// Add event delegation for Edit button on code blocks
if (document.body) {
  document.body.addEventListener('click', function (e) {
    const editBtn = e.target.closest('.edit-code-btn');
    if (editBtn) {
      const codeBlock = editBtn.closest('.code-block');
      if (!codeBlock) return;
      const code = codeBlock.querySelector('code');
      if (!code) return;
      const originalCode = code.textContent;
      const languageClass = code.className || '';
      let mode = 'javascript';
      if (languageClass.includes('python')) mode = 'py';
      else if (languageClass.includes('html')) mode = 'htmlmixed';
      else if (languageClass.includes('css')) mode = 'css';
      else if (languageClass.includes('xml')) mode = 'xml';
      
      // Open the canvas editor overlay
      const canvas = document.getElementById('canvas-editor-container');
      if (!canvas) return;
      
      // Toggle sidebar to open when opening editor
      const sidebar = document.querySelector('.sidebar');
      const sidebarWasOpen = sidebar && sidebar.classList.contains('open');
      
      // If sidebar is not open, open it
      if (sidebar && !sidebar.classList.contains('open')) {
        toggleSidebar(); // Use the existing toggle function to open sidebar
      }
      
      // Set width based on sidebar state (should be open now)
      canvas.style.width = 'calc(100vw - 80px)';
      
      // We're using Ayu Dark theme permanently
      
      // Determine if this is web content or terminal content
      const isWebContent = mode === 'htmlmixed' || mode === 'html' || mode === 'css';
      const isTerminalContent = mode === 'javascript' || mode === 'python';
      
      // Build the overlay content with action buttons
      canvas.innerHTML = `
        <div class="canvas-header">
          <div class="canvas-header-actions">
            <button class="canvas-close-btn" data-tooltip="Close">&times;</button>
          </div>
          <div class="canvas-editor-controls">
            <button id="copy-code-btn" class="editor-action-btn" data-tooltip="Copy">
              <i class="fas fa-copy"></i>
            </button>
            <button id="save-code-btn" class="editor-action-btn" data-tooltip="Save Code">
              <i class="fas fa-save"></i>
            </button>
            ${isWebContent ? `
            <button id="preview-code-btn" class="editor-action-btn" data-tooltip="Preview">
              <i class="fas fa-eye"></i>
              <span>Preview</span>
            </button>
            ` : ''}
            ${isTerminalContent ? `
            <button id="run-code-btn" class="editor-action-btn" data-tooltip="Run Code in Terminal">
              <i class="fas fa-play"></i>
              <span>Run</span>
            </button>
            ` : ''}
          </div>
        </div>
        <div class="canvas-body">
          <textarea id="canvas-cm-textarea"></textarea>
        </div>
      `;
      
      canvas.classList.add('open');
      canvas.style.display = 'flex';
      
      // Initialize CodeMirror
      const textarea = document.getElementById('canvas-cm-textarea');
      textarea.value = originalCode;
      
      // Always use Ayu Dark theme
      const editorTheme = 'ayu-dark';
      
      // Add custom Emmet hint function to CodeMirror
      if (!CodeMirror.hint.emmet && window.emmet) {
        CodeMirror.hint.emmet = function(cm) {
          const cursor = cm.getCursor();
          const line = cm.getLine(cursor.line);
          const lineUpToCursor = line.substring(0, cursor.ch);
          
          // Common Emmet abbreviations for HTML
          const emmetSnippets = {
            'div': '<div></div>',
            'p': '<p></p>',
            'h1': '<h1></h1>',
            'h2': '<h2></h2>',
            'h3': '<h3></h3>',
            'a': '<a href=""></a>',
            'img': '<img src="" alt="">',
            'ul': '<ul>\n\t<li></li>\n</ul>',
            'li': '<li></li>',
            'table': '<table>\n\t<tr>\n\t\t<td></td>\n\t</tr>\n</table>',
            'form': '<form action="">\n\t<input type="text">\n</form>',
            'input': '<input type="text">',
            'btn': '<button></button>',
            'link': '<link rel="stylesheet" href="">',
            'script': '<script src=""></script>',
            'meta': '<meta charset="UTF-8">',
            'html:5': '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>Document</title>\n</head>\n<body>\n\t\n</body>\n</html>'
          };
          
          // Match potential abbreviation
          const match = lineUpToCursor.match(/[a-z0-9:._#>+*^\[\]$@!%\-=|]+$/i);
          if (!match) return null;
          
          const abbreviation = match[0];
          const start = cursor.ch - abbreviation.length;
          const end = cursor.ch;
          
          // Generate list of completions
          const completions = [];
          for (const key in emmetSnippets) {
            if (key.startsWith(abbreviation)) {
              completions.push({
                text: key,
                displayText: key + ' → ' + emmetSnippets[key].substring(0, 30) + (emmetSnippets[key].length > 30 ? '...' : ''),
                hint: function(cm, data, completion) {
                  cm.replaceRange(completion.text, 
                    {line: cursor.line, ch: start},
                    {line: cursor.line, ch: end});
                }
              });
            }
          }
          
          return {
            list: completions,
            from: CodeMirror.Pos(cursor.line, start),
            to: CodeMirror.Pos(cursor.line, end)
          };
        };
      }
      
      // Initialize CodeMirror with Emmet support
      const cm = CodeMirror.fromTextArea(textarea, {
        lineNumbers: true,
        mode: mode,
        theme: 'ayu-dark', // Always use Ayu Dark theme
        viewportMargin: Infinity,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: true,
        autoCloseTags: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        matchTags: {bothTags: true},
        extraKeys: {
          'Tab': 'emmetExpandAbbreviation',
          'Ctrl-Space': function(cm) {
            // Try Emmet hint first, fall back to anyword hint
            if (CodeMirror.hint.emmet) {
              CodeMirror.showHint(cm, CodeMirror.hint.emmet);
            } else {
              CodeMirror.showHint(cm, CodeMirror.hint.anyword);
            }
          },
          'Enter': 'emmetInsertLineBreak',
          'Ctrl-E': 'emmetExpandAbbreviationAll',
          'Ctrl-Enter': function(cm) {
            // Insert a new line without breaking the current line
            const cursor = cm.getCursor();
            cm.replaceRange('\n', cursor);
          },
          // Add additional key bindings for hints
          'Ctrl-/': function(cm) {
            if (CodeMirror.showHint) {
              CodeMirror.showHint(cm, CodeMirror.hint.anyword);
            }
          }
        },
        hintOptions: {
          completeSingle: false,
          closeOnUnfocus: false,
          alignWithWord: true,
          closeCharacters: /[\s()\[\]{};:>,]/
        }
      });
      
      // Initialize Emmet for CodeMirror using the official plugin
      // Check if emmetCodeMirror is available directly or through emmet object
      try {
        // Configure Emmet options
        const emmetOptions = {
          // Enable abbreviation tracking for automatic expansion suggestions
          mark: true,
          // Specify syntax based on mode
          syntax: mode === 'htmlmixed' ? 'html' : mode,
          // Configure preferences
          preferences: {
            'output.indent': '\t',
            'output.baseIndent': '\t',
            'output.newline': '\n',
            'output.tagCase': 'lower',
            'output.attributeCase': 'lower',
            'output.attributeQuotes': 'double',
            'output.format': true,
            'output.formatLeafNode': false,
            'markup.valueIndentSize': 1
          },
          // Add custom snippets for HTML5
          snippets: mode === 'htmlmixed' || mode === 'html' ? {
            'html:5': '!!!<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>Document</title>\n</head>\n<body>\n\t${0}\n</body>\n</html>',
            'div': 'div.${1:class}',
            'div:c': 'div.container',
            'div:r': 'div.row',
            'div:col': 'div.col',
            'btn': 'button.btn.${1:btn-primary}',
            'nav': 'nav.navbar.navbar-expand-lg',
            'card': 'div.card>div.card-body',
            'form': 'form>div.form-group*3>label+input.form-control'
          } : {}
        };
        
        // Initialize Emmet with the configured options
        if (window.emmetCodeMirror) {
          window.emmetCodeMirror(cm, emmetOptions);
          console.log('Emmet initialized successfully with official plugin');
          
          // Add a custom command to show Emmet abbreviation preview
          CodeMirror.commands.showEmmetPreview = function(cm) {
            if (cm.state && cm.state.emmet) {
              cm.state.emmet.markAbbreviation();
            }
          };
          
          // Add the command to the extraKeys
          cm.setOption('extraKeys', Object.assign({}, 
            cm.getOption('extraKeys') || {}, 
            {'Alt-E': 'showEmmetPreview'}
          ));
          
        } else if (window.emmet && window.emmet.expandAbbreviation) {
          // Fallback to legacy Emmet if available
          console.log('Using legacy Emmet implementation');
          // Set up legacy Emmet integration
          window.emmet.require('actions').add('expand_abbreviation_with_tab', function(editor) {
            if (!editor.getSelection()) {
              return window.emmet.run('expand_abbreviation', editor);
            }
            return false;
          });
        } else {
          console.error('Emmet for CodeMirror not loaded - neither official plugin nor legacy version found');
          // Try to load Emmet dynamically as a last resort
          console.log('Attempting to ensure Emmet is properly loaded...');
          
          // Try to load Emmet dynamically
          const emmetScript = document.createElement('script');
          emmetScript.src = 'https://unpkg.com/@emmetio/codemirror-plugin@1.2.0/dist/emmet-codemirror-plugin.js';
          emmetScript.onload = function() {
            if (window.emmetCodeMirror) {
              window.emmetCodeMirror(cm, emmetOptions);
              console.log('Emmet loaded and initialized dynamically');
            }
          };
          document.head.appendChild(emmetScript);
        }
      } catch (error) {
        console.error('Error initializing Emmet:', error);
      }
      
      // The official @emmetio/codemirror-plugin automatically handles abbreviation tracking
      // and expansion when the 'mark' option is set to true, so we don't need to manually
      // implement command suggestions with the keyup event handler.
      // 
      // The plugin will automatically show abbreviation preview as you type
      // and you can use the configured keyboard shortcuts to expand abbreviations:
      // - Tab: Expand abbreviation
      // - Ctrl-Space: Show abbreviation menu
      // - Enter: Insert line break with proper indentation
      // - Ctrl-E: Expand abbreviation
      // - Ctrl-Enter: Insert a new line without breaking the current line
      //
      // For custom behavior, you can still use the keyup event:
      cm.on('keyup', function(cm, event) {
        // Force Emmet to track abbreviations and show suggestions
      if (/[a-z0-9>+^*(){}\[\]$#@!%:;,.\-=|'"]/i.test(event.key)) {
        try {
          // Try to get the current line content
          const cursor = cm.getCursor();
          const line = cm.getLine(cursor.line);
          const lineUpToCursor = line.substring(0, cursor.ch);
          
          // Check for potential Emmet abbreviation patterns
          const isEmmetPattern = (
            // Basic element patterns: div, p, h1, etc.
            /[a-z0-9]+$/i.test(lineUpToCursor) ||
            // Element with class/id: div.class, div#id
            /[a-z0-9]+[.#][a-z0-9-_]*$/i.test(lineUpToCursor) ||
            // Nested elements: div>p, ul>li
            /[a-z0-9.#>+*^]+$/i.test(lineUpToCursor) ||
            // Elements with attributes: div[attr], a[href]
            /\[[a-z0-9-_="']*$/i.test(lineUpToCursor) ||
            // Multiplication: ul>li*3
            /\*[0-9]*$/i.test(lineUpToCursor)
          );
          
          if (isEmmetPattern) {
            // Log for debugging
            console.log('Potential Emmet pattern detected:', lineUpToCursor);
            
            // Explicitly trigger Emmet abbreviation tracking
            if (window.emmet && window.emmet.expandAbbreviation) {
              window.emmet.run('expand_abbreviation', cm);
            }
            
            // If using the official plugin, force abbreviation preview
            if (cm.state && cm.state.emmet) {
              // This will force the plugin to update the abbreviation preview
              cm.state.emmet.markAbbreviation();
              
              // Explicitly show hints if available
              if (CodeMirror.showHint && cm.state.emmet.abbreviation) {
                CodeMirror.showHint(cm, CodeMirror.hint.emmet || CodeMirror.hint.anyword, {
                  completeSingle: false,
                  closeOnUnfocus: false
                });
              }
            }
          }
        } catch (e) {
          console.log('Error in Emmet abbreviation tracking:', e);
        }
      }
        
        // Example of custom behavior (optional):
        // If you want to trigger hints for specific keys not handled by Emmet
        const customTriggerKeys = [
          '@', '$', '!', '?'
        ];
        
        if (customTriggerKeys.includes(event.key)) {
          // Show custom hints or perform custom actions
          if (CodeMirror.showHint) {
            CodeMirror.showHint(cm, CodeMirror.hint.anyword);
          }
        }
      });
      
      // No theme selector needed as we're using Ayu Dark permanently
      
      // Copy button handler
      const copyBtn = document.getElementById('copy-code-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          const code = cm.getValue();
          navigator.clipboard.writeText(code).then(() => {
            // Show a temporary success message
            const originalTitle = this.getAttribute('title');
            this.setAttribute('title', 'Copied!');
            setTimeout(() => {
              this.setAttribute('title', originalTitle);
            }, 2000);
          });
        });
      }
      
      // Save button handler
      const saveBtn = document.getElementById('save-code-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', function() {
          const code = cm.getValue();
          const blob = new Blob([code], {type: 'text/plain'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `code.${mode === 'htmlmixed' ? 'html' : mode}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }
      
      // Preview button handler (for HTML)
      const previewBtn = document.getElementById('preview-code-btn');
      if (previewBtn) {
        previewBtn.addEventListener('click', function() {
          if (mode === 'htmlmixed' || mode === 'html') {
            const code = cm.getValue();
            
            // Create web preview container if it doesn't exist
            // Instead of appending to body, append to canvas-body
            const canvasBody = document.querySelector('.canvas-body');
            let webPreviewContainer = document.getElementById('web-preview-container');
            if (!webPreviewContainer) {
              webPreviewContainer = document.createElement('div');
              webPreviewContainer.id = 'web-preview-container';
              webPreviewContainer.className = 'web-preview-container';
              canvasBody.appendChild(webPreviewContainer);
              
              // Add styles for web preview container
              const style = document.createElement('style');
              style.textContent = `
                .web-preview-container {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background-color: var(--bg-color);
                  z-index: 10;
                  display: flex;
                  flex-direction: column;
                  transform: translateY(100%);
                  transition: transform 0.3s ease-in-out;
                }
                
                .web-preview-container.open {
                  transform: translateY(0);
                }
                
                .web-preview-header {
                  display: flex;
                  align-items: center;
                  padding: 10px 20px;
                  background-color: var(--bg-tertiary);
                  border-bottom: 1px solid var(--border-color);
                }
                
                .web-preview-title {
                  font-size: 1.2rem;
                  font-weight: 600;
                  color: var(--text-color);
                  margin-right: auto;

                }
                
                .web-preview-controls {
                  display: flex;
                  gap: 10px;
                }
                
                .web-preview-btn {
                  background: none;
                  border: none;
                  color: var(--text-color);
                  border-radius: 4px;
                  padding: 6px 12px;
                  display: flex;
                  align-items: center;
                  gap: 5px;
                  cursor: pointer;
                  transition: background-color 0.2s;
                }
                
                .web-preview-btn:hover {
                  background-color: var(--hover-color);
                }
                
                .web-preview-iframe {
                  flex: 1;
                  width: 100%;
                  height: 100%;
                  border: none;
                }
              `;
              document.head.appendChild(style);
            }
            
            // Create web preview content
            webPreviewContainer.innerHTML = `
              <div class="web-preview-header">
                <div class="web-preview-title">Web Preview</div>
                <div class="web-preview-controls">
                  <button class="web-preview-btn open-new-tab-btn" data-tooltip="Open in new tab">
                    <i class="fas fa-external-link-alt"></i>
                  </button>
                  <button class="web-preview-btn web-preview-close-btn" data-tooltip="Close Preview">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <iframe class="web-preview-iframe"></iframe>
            `;
            
            // Show web preview
            webPreviewContainer.classList.add('open');
            
            // Get iframe and write content
            const iframe = webPreviewContainer.querySelector('.web-preview-iframe');
            iframe.contentDocument.open();
            iframe.contentDocument.write(code);
            iframe.contentDocument.close();
            
            // Open in new tab button handler
            const openNewTabBtn = webPreviewContainer.querySelector('.open-new-tab-btn');
            openNewTabBtn.addEventListener('click', function() {
              const previewWindow = window.open('', '_blank');
              previewWindow.document.write(code);
              previewWindow.document.close();
              
              // Execute any inline scripts in the preview window
              const scripts = previewWindow.document.getElementsByTagName('script');
              for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].innerText) {
                  try {
                    const scriptContent = scripts[i].innerText;
                    const scriptFn = new previewWindow.Function(scriptContent);
                    scriptFn.call(previewWindow);
                  } catch (error) {
                    console.error('Error executing inline script:', error);
                  }
                }
              }
            });
            
            // Close button handler
            const closeBtn = webPreviewContainer.querySelector('.web-preview-close-btn');
            closeBtn.addEventListener('click', function() {
              webPreviewContainer.classList.remove('open');
            });
            
            // Execute any inline scripts in the iframe
            const iframeScripts = iframe.contentDocument.getElementsByTagName('script');
            for (let i = 0; i < iframeScripts.length; i++) {
              if (iframeScripts[i].innerText) {
                try {
                  const scriptContent = iframeScripts[i].innerText;
                  const scriptFn = new iframe.contentWindow.Function(scriptContent);
                  scriptFn.call(iframe.contentWindow);
                } catch (error) {
                  console.error('Error executing inline script in iframe:', error);
                }
              }
            }
          } else {
            alert('Preview is only available for HTML content');
          }
        });
      }
      
      // Create and append terminal to canvas editor
      // Create terminal container
      const terminalHTML = `
        <div id="terminal-container" class="terminal-container">
          <div class="terminal-resizer"></div>
          <div class="terminal-header">
            <div class="terminal-title">Terminal</div>
            <div class="terminal-controls">
              <button id="terminal-expand-btn" class="terminal-expand-btn" data-tooltip="Expand Terminal">
                <i class="fas fa-expand"></i>
              </button>
              <button id="terminal-minimize-btn" class="terminal-btn" data-tooltip="Minimize Terminal">
                <i class="fas fa-minus"></i>
              </button>
              <button id="terminal-close-btn" class="terminal-btn" data-tooltip="Close Terminal">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div class="terminal-body">
            <div id="terminal-output" class="terminal-output"></div>
          </div>
        </div>
      `;
      
      // Append terminal to canvas body
      const canvasBody = canvas.querySelector('.canvas-body');
      canvasBody.insertAdjacentHTML('afterend', terminalHTML);
      
      // Get terminal elements
      const terminal = document.getElementById('terminal-container');
      const terminalOutput = document.getElementById('terminal-output');
      const terminalMinimizeBtn = document.getElementById('terminal-minimize-btn');
      const terminalCloseBtn = document.getElementById('terminal-close-btn');
      const terminalExpandBtn = document.getElementById('terminal-expand-btn');
      const terminalResizer = document.querySelector('.terminal-resizer');
      
      // Add height resizer functionality
      let isResizing = false;
      let startY = 0;
      let startHeight = 0;
      
      terminalResizer.addEventListener('mousedown', function(e) {
        isResizing = true;
        startY = e.clientY;
        startHeight = terminal.offsetHeight;
        
        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', stopResize);
        
        e.preventDefault();
      });
      
      function handleResize(e) {
        if (!isResizing) return;
        
        // Calculate new height (move up = increase height)
        const deltaY = startY - e.clientY;
        const newHeight = Math.max(100, startHeight + deltaY); // Minimum height of 100px
        
        // Update terminal height
        terminal.style.height = newHeight + 'px';
      }
      
      function stopResize() {
        isResizing = false;
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', stopResize);
      }
      
      // Terminal expand/collapse functionality
      terminalExpandBtn.addEventListener('click', function() {
        terminal.classList.toggle('fullscreen');
        const icon = this.querySelector('i');
        if (terminal.classList.contains('fullscreen')) {
          icon.classList.remove('fa-expand');
          icon.classList.add('fa-compress');
          this.setAttribute('title', 'Collapse');
        } else {
          icon.classList.remove('fa-compress');
          icon.classList.add('fa-expand');
          this.setAttribute('title', 'Expand');
        }
      });
      
      // Terminal minimize/maximize functionality
      terminalMinimizeBtn.addEventListener('click', function() {
        terminal.classList.toggle('minimized');
        if (terminal.classList.contains('fullscreen')) {
          terminal.classList.remove('fullscreen');
          const icon = terminalExpandBtn.querySelector('i');
          icon.classList.remove('fa-compress');
          icon.classList.add('fa-expand');
          terminalExpandBtn.setAttribute('title', 'Expand');
        }
      });
      
      // Terminal close functionality
      terminalCloseBtn.addEventListener('click', function() {
        terminal.classList.remove('open');
        terminal.classList.remove('fullscreen');
        terminal.classList.remove('minimized');
        setTimeout(() => {
          terminalOutput.innerHTML = ''; // Clear terminal output when closed
        }, 300);
      });
      
      // Function to write to terminal
      function writeToTerminal(text, type = '') {
        const span = document.createElement('span');
        span.textContent = text + '\n';
        if (type) span.classList.add(type);
        terminalOutput.appendChild(span);
        terminalOutput.scrollTop = terminalOutput.scrollHeight; // Auto-scroll to bottom
      }
      
      // Run button handler (for JavaScript and Python)
      const runBtn = document.getElementById('run-code-btn');
      if (runBtn) {
        runBtn.addEventListener('click', function() {
          if (mode === 'javascript') {
            try {
              const code = cm.getValue();
              // Create a safe execution environment
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';
              document.body.appendChild(iframe);
              
              // Capture console.log output
              const originalConsoleLog = console.log;
              console.log = function() {
                const args = Array.from(arguments);
                originalConsoleLog.apply(console, args);
                writeToTerminal('> ' + args.join(' '), 'info');
              };
              
              // Open terminal
              terminal.classList.add('open');
              terminal.classList.remove('minimized');
              writeToTerminal('Executing JavaScript...', 'info');
              
              // Execute code
              const result = iframe.contentWindow.eval(code);
              if (result !== undefined) {
                writeToTerminal('Result: ' + result, 'success');
              }
              
              // Clean up
              document.body.removeChild(iframe);
              console.log = originalConsoleLog;
            } catch (error) {
              terminal.classList.add('open');
              terminal.classList.remove('minimized');
              writeToTerminal('Error: ' + error.message, 'error');
            }
          } else if (mode === 'python' || mode === 'python3') {
            // Open terminal for Python code
            terminal.classList.add('open');
            terminal.classList.remove('minimized');
            terminalOutput.innerHTML = ''; // Clear previous output
            
            const code = cm.getValue();
            writeToTerminal('Executing Python code...', 'info');
            writeToTerminal('$ python script.py', 'info');
            
            // Improved Python code execution simulation
            setTimeout(() => {
              // Parse the code to handle different Python patterns
              try {
                // Handle print statements with various argument types
                const printRegex = /print\(([^)]+)\)/g;
                const inputRegex = /input\(([^)]*?)\)/g;
                
                // Replace input() with simulated values
                let simulatedCode = code.replace(inputRegex, (match, prompt) => {
                  // Extract the prompt if it exists
                  let promptText = '';
                  if (prompt) {
                    // Remove quotes from prompt
                    promptText = prompt.replace(/['"](.+?)['"]/g, '$1');
                    writeToTerminal(promptText, 'info');
                  }
                  
                  // Simulate user input with predefined values
                  const simulatedInputs = ['rock', 'paper', 'scissors', 'yes', 'no', '42', 'hello'];
                  const randomInput = simulatedInputs[Math.floor(Math.random() * simulatedInputs.length)];
                  writeToTerminal(`> ${randomInput}`, 'success');
                  
                  // Return the simulated input as a string literal
                  return `'${randomInput}'`;
                });
                
                // Execute the code line by line for better simulation
                const lines = simulatedCode.split('\n');
                let hasPrints = false;
                
                for (const line of lines) {
                  // Check for print statements
                  if (line.trim().startsWith('print(')) {
                    hasPrints = true;
                    // Extract the content inside print()
                    const printContent = line.trim().match(/print\((.+)\)/);
                    if (printContent && printContent[1]) {
                      let content = printContent[1];
                      
                      // Handle string literals
                      if ((content.startsWith('\'') && content.endsWith('\'')) || 
                          (content.startsWith('"') && content.endsWith('"'))) {
                        content = content.substring(1, content.length - 1);
                        writeToTerminal(content);
                      } 
                      // Handle variables and expressions (simplified simulation)
                      else {
                        // For variables like print(result), just output the variable name
                        writeToTerminal(content);
                      }
                    }
                  }
                }
                
                if (!hasPrints) {
                  writeToTerminal('Code executed. No output to display.');
                }
                
                writeToTerminal('Program finished with exit code 0', 'success');
              } catch (error) {
                writeToTerminal(`Error: ${error.message}`, 'error');
                writeToTerminal('Program finished with exit code 1', 'error');
              }
            }, 500);
          } else {
            terminal.classList.add('open');
            terminal.classList.remove('minimized');
            writeToTerminal('Execution is only supported for JavaScript and Python code', 'info');
          }
        });
      }
      
      // Close handler
      const closeBtn = canvas.querySelector('.canvas-close-btn');
      closeBtn.onclick = function () {
        canvas.classList.remove('open');
        setTimeout(() => { canvas.style.display = 'none'; }, 400);
        
        // Close terminal when canvas is closed
        if (terminal) {
          terminal.classList.remove('open');
          terminal.classList.remove('fullscreen');
          terminal.classList.remove('minimized');
          setTimeout(() => {
            if (terminalOutput) {
              terminalOutput.innerHTML = ''; // Clear terminal output
            }
          }, 300);
        }
        
        // Restore sidebar to its previous state
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          // If sidebar wasn't open before, close it
          if (!sidebarWasOpen && sidebar.classList.contains('open')) {
            toggleSidebar();
          }
        }
      };
      
      // Apply theme based on saved preference
      if (isDarkMode) {
        document.body.classList.remove('light-mode');
      } else {
        document.body.classList.add('light-mode');
      }
    }
  });
}

// Function to show a notification for text-to-speech events
// TTS notification function removed

// Function to summarize text for auto-speak when text is too long
function summarizeTextForSpeech(text) {
    // Count words in the text
    const wordCount = text.split(/\s+/).length;
    
    // If text is less than 50 words, return the original text
    if (wordCount <= 50) {
        return text;
    }
    
    console.log(`[DEBUG] Auto-speak: Text is ${wordCount} words, generating summary`);
    
    // Extract key sentences for summarization
    // This is a simple extractive summarization approach
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    if (sentences.length <= 3) {
        // If there are only a few sentences, use the first 50 words
        return text.split(/\s+/).slice(0, 50).join(' ') + '...';
    }
    
    // Extract important sentences (first sentence, last sentence, and a middle one)
    const firstSentence = sentences[0];
    const lastSentence = sentences[sentences.length - 1];
    const middleSentence = sentences[Math.floor(sentences.length / 2)];
    
    // Look for sentences with key indicator phrases
    const keyPhrases = ['important', 'key', 'main', 'significant', 'essential', 'crucial', 'primary', 'in summary', 'to summarize', 'in conclusion'];
    
    let keySentences = [];
    keyPhrases.forEach(phrase => {
        sentences.forEach(sentence => {
            if (sentence.toLowerCase().includes(phrase) && !keySentences.includes(sentence)) {
                keySentences.push(sentence);
            }
        });
    });
    
    // Combine the summary sentences
    let summary = firstSentence;
    
    // Add up to 2 key sentences if found
    if (keySentences.length > 0) {
        summary += ' ' + keySentences.slice(0, 2).join(' ');
    } else {
        // If no key sentences found, add the middle sentence
        summary += ' ' + middleSentence;
    }
    
    // Add the last sentence if it's different from what we already have
    if (lastSentence !== firstSentence && !keySentences.includes(lastSentence)) {
        summary += ' ' + lastSentence;
    }
    
    // Ensure the summary isn't too long (aim for ~15 seconds of speech, roughly 30-40 words)
    const summaryWords = summary.split(/\s+/);
    if (summaryWords.length > 40) {
        summary = summaryWords.slice(0, 40).join(' ') + '...';
    }
    
    console.log(`[DEBUG] Auto-speak: Generated summary with ${summary.split(/\s+/).length} words`);
    return summary;
}

// Function to process text for speech by removing code blocks and emojis
function processTextForSpeech(messageContentElement) {
    // Clone the element to avoid modifying the original
    const tempElement = messageContentElement.cloneNode(true);
    
    // Remove code blocks
    const codeBlocks = tempElement.querySelectorAll('pre, code');
    codeBlocks.forEach(block => {
        block.textContent = 'Code block skipped for speech.';
    });
    
    // Replace links with a generic phrase
    const links = tempElement.querySelectorAll('a');
    links.forEach(link => {
        link.textContent = "Here's the website link";
    });
    
    // Get the text content
    let text = tempElement.textContent;
    
    // Remove emojis using regex
    // This regex matches most common emoji patterns
    text = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    // Clean up any double spaces
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
}
