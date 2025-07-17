// Settings functionality

// DOM Elements
const settingsContainer = document.getElementById('settings-container');
const closeSettingsBtn = document.getElementById('close-settings');
const settingsTabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const themeOptions = document.querySelectorAll('.theme-option');
const voiceOptions = document.querySelectorAll('.voice-option:not(#advanced-tab .voice-option)');
const advancedVoiceOptions = document.querySelectorAll('#advanced-tab .voice-option');
const languageSelector = document.getElementById('language-selector');
const exportChatsBtn = document.getElementById('export-chats');
const deleteAllChatsBtn = document.getElementById('delete-all-chats');
const deleteAccountBtn = document.getElementById('delete-account');
const userInfoBtn = document.querySelector('.user-info');

// Initialize settings
document.addEventListener('DOMContentLoaded', () => {
    applySavedPreferences();
    initializeSettings();
    initVoices();
});

// Initialize settings functionality
function initializeSettings() {
    // Open settings when user info is clicked
    if (userInfoBtn) {
        userInfoBtn.addEventListener('click', openSettings);
    }
    
    // Close settings when close button is clicked
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }
    
    // Tab switching
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    // Theme selection
    themeOptions.forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.getAttribute('data-theme');
            setTheme(theme);
            
            // Update active state
            themeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });
    
    // Voice selection
    voiceOptions.forEach(option => {
        option.addEventListener('click', () => {
            const voice = option.getAttribute('data-voice');
            setVoice(voice);
        });
    });
    
    // Advanced voice selection
    advancedVoiceOptions.forEach(option => {
        option.addEventListener('click', () => {
            const voice = option.getAttribute('data-voice');
            setVoice(voice);
        });
    });
    
    // Language selection
    if (languageSelector) {
        languageSelector.addEventListener('change', () => {
            const language = languageSelector.value;
            setLanguage(language);
        });
    }
    
    // Data management buttons
    if (exportChatsBtn) {
        exportChatsBtn.addEventListener('click', exportChats);
    }
    
    if (deleteAllChatsBtn) {
        deleteAllChatsBtn.addEventListener('click', confirmDeleteAllChats);
    }
    
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', confirmDeleteAccount);
    }
    
    // Load user profile data
    loadUserProfile();
    
    // Load saved voice preference
    loadSavedVoice();
}

// Open settings panel
function openSettings() {
    if (settingsContainer) {
        settingsContainer.classList.add('open');
        loadUserProfile(); // Refresh profile data when opening
    }
}

// Close settings panel
function closeSettings() {
    if (settingsContainer) {
        settingsContainer.classList.remove('open');
    }
}

// Switch between tabs
function switchTab(tabId) {
    // Update tab active states
    settingsTabs.forEach(tab => {
        if (tab.getAttribute('data-tab') === tabId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update content visibility
    tabContents.forEach(content => {
        if (content.id === `${tabId}-tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Set theme and save preference
function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
    
    localStorage.setItem('theme', theme);
}

// Function to set the voice
function setVoice(voiceId) {
    localStorage.setItem('selectedVoice', voiceId);
    console.log('Voice set to:', voiceId);
    
    // Update UI to show active voice for regular voice options
    voiceOptions.forEach(option => {
        const optionVoice = option.getAttribute('data-voice');
        if (optionVoice === voiceId) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Update UI for advanced voice options
    advancedVoiceOptions.forEach(option => {
        const optionVoice = option.getAttribute('data-voice');
        if (optionVoice === voiceId) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Preview the selected voice
    previewVoice(voiceId);
}

// Function to preview the selected voice
function previewVoice(voiceId) {
    const previewText = "Hello, I'm your AI assistant.";
    
    // Map the voice option to Edge TTS voice ID
    let edgeVoiceId = 'en-US-AvaNeural'; // Default voice
    
    switch(voiceId) {
        case 'male-1':
            edgeVoiceId = 'en-AU-WilliamNeural';
            break;
        case 'male-2':
            edgeVoiceId = 'en-GB-RyanNeural';
            break;
        case 'male-3':
            edgeVoiceId = 'en-NZ-MitchellNeural';
            break;
        case 'male-4':
            edgeVoiceId = 'en-US-GuyNeural';
            break;
        case 'male-5':
            edgeVoiceId = 'en-CA-LiamNeural';
            break;
        case 'male-6':
            edgeVoiceId = 'en-IN-PrabhatNeural';
            break;
        case 'female-1':
            edgeVoiceId = 'en-AU-NatashaNeural';
            break;
        case 'female-2':
            edgeVoiceId = 'en-GB-SoniaNeural';
            break;
        case 'female-3':
            edgeVoiceId = 'en-US-AvaNeural';
            break;
        case 'female-4':
            edgeVoiceId = 'en-US-JennyNeural';
            break;
        case 'female-5':
            edgeVoiceId = 'en-CA-ClaraNeural';
            break;
        case 'female-6':
            edgeVoiceId = 'en-IN-NeerjaNeural';
            break;
    }
    
    // Log the selected voice for debugging
    console.log('Selected voice:', edgeVoiceId);
    
    // Stop any currently playing audio
    if (window.previewAudio) {
        window.previewAudio.pause();
        window.previewAudio = null;
    }
    
    // Call the Edge TTS API
    fetch('/api/tts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: previewText,
            voice: edgeVoiceId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('TTS Error:', data.error);
            return;
        }
        
        // Create and play audio element
        const audio = new Audio(data.audio_url);
        window.previewAudio = audio;
        audio.play();
        
        audio.onended = () => {
            window.previewAudio = null;
        };
        
        audio.onerror = () => {
            console.error('Audio playback error');
            window.previewAudio = null;
        };
    })
    .catch(error => {
        console.error('TTS API Error:', error);
    });
}

// Load saved voice preference
function loadSavedVoice() {
    const savedVoice = localStorage.getItem('selectedVoice') || 'female-2'; // Default to Emily
    
    // Update UI for regular voice options
    voiceOptions.forEach(option => {
        const optionVoice = option.getAttribute('data-voice');
        if (optionVoice === savedVoice) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Update UI for advanced voice options
    advancedVoiceOptions.forEach(option => {
        const optionVoice = option.getAttribute('data-voice');
        if (optionVoice === savedVoice) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// Set language
function setLanguage(language) {
    // Save preference for future implementation
    localStorage.setItem('language', language);
    console.log(`Language set to: ${language}`);
    // In a real app, this would trigger language file loading
}

// Load user profile data
function loadUserProfile() {
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileType = document.getElementById('profile-type');
    
    firebase.auth().onAuthStateChanged(user => {
        if (user && profileName && profileEmail) {
            profileName.textContent = user.displayName || 'Not set';
            profileEmail.textContent = user.email || 'Not available';
            profileType.textContent = 'Standard';
        }
    });
}

// Export chats functionality
async function exportChats() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('You must be logged in to export chats');
            return;
        }
        
        // Get all user chats
        const chats = await getUserChats(user.uid);
        
        // For each chat, get its messages
        const fullChats = await Promise.all(chats.map(async (chat) => {
            const messages = await getChatMessages(chat.id);
            return {
                ...chat,
                messages
            };
        }));
        
        // Convert to JSON and create download
        const dataStr = JSON.stringify(fullChats, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `numAI_chats_${new Date().toISOString().slice(0, 10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
    } catch (error) {
        console.error('Error exporting chats:', error);
        alert('Failed to export chats. Please try again.');
    }
}

// Confirm delete all chats
function confirmDeleteAllChats() {
    if (confirm('Are you sure you want to delete all your chats? This action cannot be undone.')) {
        deleteAllChats();
    }
}

// Delete all chats
async function deleteAllChats() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('You must be logged in to delete chats');
            return;
        }
        
        // Get all user chats
        const chatsSnapshot = await firebase.firestore().collection('chats')
            .where('userId', '==', user.uid)
            .get();
        
        // Delete each chat
        const batch = firebase.firestore().batch();
        chatsSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        
        // Clear current chat and localStorage
        localStorage.removeItem('currentChatId');
        currentChatId = null;
        
        // Create a new chat
        await createNewChatSession();
        
        alert('All chats have been deleted');
        
    } catch (error) {
        console.error('Error deleting all chats:', error);
        alert('Failed to delete chats. Please try again.');
    }
}

// Confirm delete account
function confirmDeleteAccount() {
    if (confirm('Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.')) {
        deleteAccount();
    }
}

// Delete account
async function deleteAccount() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('You must be logged in to delete your account');
            return;
        }
        
        // First delete all user data
        await deleteAllChats();
        
        // Then delete the user account
        await user.delete();
        
        // Redirect to login page
        window.location.href = '/login';
        
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. You may need to re-authenticate. ' + error.message);
    }
}

// Apply saved preferences on load
function applySavedPreferences() {
    // Apply saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
    
    // Update theme selector UI
    themeOptions.forEach(option => {
        if (option.getAttribute('data-theme') === savedTheme) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Apply saved language
    const savedLanguage = localStorage.getItem('language') || 'en';
    if (languageSelector) {
        languageSelector.value = savedLanguage;
    }
    
    // Apply saved voice preference
    loadSavedVoice();
    
    // Ensure the correct tab is active based on URL hash
    const hash = window.location.hash.substring(1);
    if (hash && ['general', 'profile', 'advanced', 'about'].includes(hash)) {
        switchTab(hash);
    }
}

// Initialize speech synthesis voices
function initVoices() {
    // We're now using Edge TTS API instead of browser's SpeechSynthesis
    // Fetch available voices from our API endpoint
    fetch('/api/tts/voices')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error fetching voices:', data.error);
                return;
            }
            
            console.log('Available Edge TTS voices:', data.voices);
            // We don't need to do anything with the voices here
            // as we're using predefined voice mappings in the UI
        })
        .catch(error => {
            console.error('Error fetching voices:', error);
        });
}

// Note: applySavedPreferences is now called in the main DOMContentLoaded event listener above