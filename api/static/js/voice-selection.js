// Voice Selection Functionality

// Global DOM Elements - using var to avoid redeclaration issues
var selectVoiceBtn;
var voiceSelectionModal;
var closeVoiceModalBtn;
var voiceCategoryTabs;
var voiceOptionsLists;
var currentVoiceName;
var voiceCircleContainer;

// Smoke Particle System
class SmokeParticle {
    constructor(container) {
        this.container = container;
        this.element = document.createElement('div');
        this.element.className = 'smoke-particle';
        this.element.style.left = `${Math.random() * 100}%`;
        this.element.style.bottom = '0';
        this.element.style.opacity = Math.random() * 0.5 + 0.2;
        this.element.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
        
        // Add random hue rotation for colorful particles
        const hue = Math.floor(Math.random() * 360);
        this.element.style.setProperty('--hue', hue);
        
        this.container.appendChild(this.element);
        
        // Set random animation duration
        const duration = Math.random() * 2 + 2;
        this.element.style.animationDuration = `${duration}s`;
        
        // Remove particle after animation completes
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, duration * 1000);
    }
}

function initSmokeSystem(smokeContainer) {
    if (!smokeContainer) {
        smokeContainer = document.getElementById('smokeContainer');
        if (!smokeContainer) return;
    }
    
    // Generate initial particles
    for (let i = 0; i < 10; i++) {
        new SmokeParticle(smokeContainer);
    }
    
    // Continuously generate new particles
    setInterval(() => {
        if (document.getElementById('voice-selection-modal') && 
            document.getElementById('voice-selection-modal').classList.contains('active')) {
            new SmokeParticle(smokeContainer);
        }
    }, 300);
}

// Initialize the voice bubble system
function initVoiceBubble() {
    const voiceBubble = document.getElementById('voiceBubble');
    const smokeContainer = document.getElementById('smokeContainer');
    
    if (voiceBubble && smokeContainer) {
        // Initialize smoke system
        initSmokeSystem(smokeContainer);
        
        // Load saved voice
        loadSavedVoice();
        
        console.log('Voice bubble initialized');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize global DOM elements
    voiceSelectionModal = document.getElementById('voice-selection-modal');
    closeVoiceModalBtn = document.getElementById('close-voice-modal');
    currentVoiceName = document.getElementById('current-voice-name');
    
    // Local DOM elements
    selectVoiceBtn = document.getElementById('select-voice-btn'); // Changed to global variable
    const voiceModalSelect = document.getElementById('voice-modal-select');
    const doneVoiceBtn = document.getElementById('done-voice-btn');
    const voiceBubble = document.getElementById('voiceBubble');
    const smokeContainer = document.getElementById('smokeContainer');
    
    // Initialize voice bubble system
    initVoiceBubble();
    
    console.log('Voice selection system initialized');
    
    // Open voice modal when clicking the select voice button
    if (selectVoiceBtn) {
        // Remove any existing event listeners first
        selectVoiceBtn.removeEventListener('click', openVoiceModal);
        // Add the event listener
        selectVoiceBtn.addEventListener('click', openVoiceModal);
    }
    
    // Close modal when clicking the close button
    if (closeVoiceModalBtn) {
        closeVoiceModalBtn.addEventListener('click', function() {
            closeVoiceModal();
        });
    }
    
    // Close modal when clicking the done button
    if (doneVoiceBtn) {
        doneVoiceBtn.addEventListener('click', function() {
            closeVoiceModal();
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === voiceSelectionModal) {
            closeVoiceModal();
        }
    });
    
    // Voice select change event in modal
    if (voiceModalSelect) {
        voiceModalSelect.addEventListener('change', function() {
            const selectedVoice = this.value;
            const selectedOption = this.options[this.selectedIndex];
            const voiceName = selectedOption.textContent;
            
            // Don't display voice name in the bubble as per user request
            if (currentVoiceName) {
                currentVoiceName.textContent = "";
            }
            
            // Save selected voice
            saveSelectedVoice(selectedVoice, voiceName);
            
            // Animate voice bubble
            animateVoiceBubble();
            
            // Play voice preview
            playVoicePreview(selectedVoice);
        });
    }
    
    // Voice bubble hover effects
voiceBubble.addEventListener('mouseenter', function() {
    document.documentElement.style.setProperty('--smoke-duration', '1.5s');
});

voiceBubble.addEventListener('mouseleave', function() {
    document.documentElement.style.setProperty('--smoke-duration', '2.5s');
});

// Voice category tab click events
voiceCategoryTabs.forEach(tab => {
    tab.addEventListener('click', function() {
        const category = this.getAttribute('data-category');
        switchVoiceCategory(category);
    });
});

// Function to create voice options dynamically
function createVoiceOptions() {
    // Voice data - you can expand this with more voices
    const voices = [
        { id: 'male-1', name: 'William (AU)', gender: 'male' },
        { id: 'male-2', name: 'James (US)', gender: 'male' },
        { id: 'male-3', name: 'Daniel (UK)', gender: 'male' },
        { id: 'male-4', name: 'Robert (CA)', gender: 'male' },
        { id: 'female-1', name: 'Emma (US)', gender: 'female' },
        { id: 'female-2', name: 'Olivia (UK)', gender: 'female' },
        { id: 'female-3', name: 'Sophia (AU)', gender: 'female' },
        { id: 'female-4', name: 'Ava (CA)', gender: 'female' }
    ];
    
    // Get the containers
    const allVoicesList = document.querySelector('.voice-options-list[data-category="all"]');
    const maleVoicesList = document.querySelector('.voice-options-list[data-category="male"]');
    const femaleVoicesList = document.querySelector('.voice-options-list[data-category="female"]');
    
    // Clear existing options
    if (allVoicesList) allVoicesList.innerHTML = '';
    if (maleVoicesList) maleVoicesList.innerHTML = '';
    if (femaleVoicesList) femaleVoicesList.innerHTML = '';
    
    // Create voice options
    voices.forEach(voice => {
        // Create voice option element
        const voiceOption = document.createElement('div');
        voiceOption.className = 'voice-option';
        voiceOption.setAttribute('data-voice', voice.id);
        
        // Create voice option content
        voiceOption.innerHTML = `
            <div class="voice-option-icon">
                <i class="fas fa-${voice.gender === 'male' ? 'male' : 'female'}"></i>
            </div>
            <div class="voice-option-info">
                <div class="voice-option-name">${voice.name}</div>
                <div class="voice-option-preview">
                    <button class="preview-btn" data-voice="${voice.id}">
                        <i class="fas fa-play"></i> Preview
                    </button>
                </div>
            </div>
        `;
        
        // Add click event listener
        voiceOption.addEventListener('click', function() {
            // Remove active class from all options
            document.querySelectorAll('.voice-option').forEach(opt => opt.classList.remove('active'));
            // Add active class to clicked option
            this.classList.add('active');
            
            // Get voice ID and name
            const voiceId = this.getAttribute('data-voice');
            const voiceName = this.querySelector('.voice-option-name').textContent;
            
            // Don't display voice name in the bubble as per user request
            if (currentVoiceName) {
                currentVoiceName.textContent = "";
            }
            
            // Save selected voice
            saveSelectedVoice(voiceId, voiceName);
            
            // Animate voice bubble
            animateVoiceBubble();
            
            // Play voice preview
            playVoicePreview(voiceId);
        });
        
        // Add preview button event listener
        const previewBtn = voiceOption.querySelector('.preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering the parent click event
                const voiceId = this.getAttribute('data-voice');
                playVoicePreview(voiceId);
            });
        }
        
        // Add to appropriate lists
        if (allVoicesList) allVoicesList.appendChild(voiceOption.cloneNode(true));
        
        if (voice.gender === 'male' && maleVoicesList) {
            maleVoicesList.appendChild(voiceOption.cloneNode(true));
        } else if (voice.gender === 'female' && femaleVoicesList) {
            femaleVoicesList.appendChild(voiceOption.cloneNode(true));
        }
    });
    
    // Add event listeners to the newly created elements
    document.querySelectorAll('.voice-option').forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            document.querySelectorAll('.voice-option').forEach(opt => opt.classList.remove('active'));
            // Add active class to clicked option
            this.classList.add('active');
            
            // Get voice ID and name
            const voiceId = this.getAttribute('data-voice');
            const voiceName = this.querySelector('.voice-option-name').textContent;
            
            // Don't display voice name in the bubble as per user request
            if (currentVoiceName) {
                currentVoiceName.textContent = "";
            }
            
            // Save selected voice
            saveSelectedVoice(voiceId, voiceName);
            
            // Animate voice bubble
            animateVoiceBubble();
            
            // Play voice preview
            playVoicePreview(voiceId);
        });
        
        // Add preview button event listener
        const previewBtn = option.querySelector('.preview-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering the parent click event
                const voiceId = this.getAttribute('data-voice');
                playVoicePreview(voiceId);
            });
        }
    });
}
    
    // Function to switch between voice categories
    function switchVoiceCategory(category) {
        // Update tabs
        voiceCategoryTabs.forEach(tab => {
            if (tab.getAttribute('data-category') === category) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update options lists
        voiceOptionsLists.forEach(list => {
            if (list.getAttribute('data-category') === category) {
                list.style.display = 'grid';
            } else {
                list.style.display = 'none';
            }
        });
    }



// Animate voice bubble
function animateVoiceBubble() {
    const voiceBubble = document.getElementById('voiceBubble');
    if (!voiceBubble) return;
    
    // Add temporary pulse animation
    voiceBubble.classList.add('pulse');
    
    // Temporarily change the blob shape
    const currentBorderRadius = voiceBubble.style.borderRadius;
    voiceBubble.style.borderRadius = '40% 60% 30% 70% / 50% 60% 40% 50%';
    
    // Generate extra smoke particles for animation effect
    const smokeContainer = document.getElementById('smokeContainer');
    if (smokeContainer) {
        // Create a burst of particles
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                new SmokeParticle(smokeContainer);
            }, i * 50); // Stagger the creation for a burst effect
        }
    }
    
    // Reset after animation completes
    setTimeout(() => {
        voiceBubble.classList.remove('pulse');
        voiceBubble.style.borderRadius = currentBorderRadius;
    }, 1000);
}

// Open voice modal
function openVoiceModal() {
    if (voiceSelectionModal) {
        // Make sure the modal is visible first
        voiceSelectionModal.style.display = 'flex';
        // Reset any previous state
        voiceSelectionModal.classList.remove('active');
        // Force a reflow before adding the active class for animation
        void voiceSelectionModal.offsetWidth;
        // Add active class after a short delay to ensure animation works
        setTimeout(() => {
            voiceSelectionModal.classList.add('active');
        }, 10);
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Load the saved voice for the modal
        loadSavedVoiceForModal();
        
        console.log('Voice modal opened');
    }
}

// Close voice modal
function closeVoiceModal() {
    if (voiceSelectionModal) {
        // Remove active class to trigger fade-out animation
        voiceSelectionModal.classList.remove('active');
        // Wait for animation to complete before hiding the modal
        setTimeout(() => {
            voiceSelectionModal.style.display = 'none';
            // Reset body overflow
            document.body.style.overflow = '';
        }, 300);
        
        console.log('Voice modal closed');
    }
}

// Play voice preview
function playVoicePreview(voiceId) {
    const previewText = "Hi There How can i Help you Today";
    const voiceKey = getVoiceKey(voiceId);
    
    if (voiceKey) {
        const voiceBubble = document.getElementById('voiceBubble');
        
        // Call Edge TTS API to play preview
        fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: previewText,
                voice: voiceKey
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.audio_url) {
                const audio = new Audio(data.audio_url);
                
                // Add event listener for when audio is ready to play
                audio.addEventListener('canplaythrough', function() {
                    // Start speaking animation right before playing audio
                    if (voiceBubble) {
                        voiceBubble.classList.add('speaking');
                    }
                    // Play the audio immediately after adding the speaking class
                    audio.play();
                }, { once: true });
                
                // Preload the audio
                audio.load();
                
                // Remove speaking animation when audio ends
                audio.onended = function() {
                    if (voiceBubble) {
                        voiceBubble.classList.remove('speaking');
                    }
                };
            }
        })
        .catch(error => {
            console.error('Error playing voice preview:', error);
            // Remove speaking animation on error
            if (voiceBubble) {
                voiceBubble.classList.remove('speaking');
            }
        });
    }
}

// Save selected voice
function saveSelectedVoice(voiceId, voiceName) {
    localStorage.setItem('selectedVoice', voiceId);
    localStorage.setItem('selectedVoiceName', voiceName);
    
    // Update main settings UI
    updateVoiceSettingsUI(voiceName);
    
    console.log(`Voice saved: ${voiceId} - ${voiceName}`);
}

// Update voice settings UI
function updateVoiceSettingsUI(voiceName) {
    // Update voice select dropdown in modal
    const voiceModalSelect = document.getElementById('voice-modal-select');
    const savedVoice = localStorage.getItem('selectedVoice') || 'male-1';
    if (voiceModalSelect) {
        voiceModalSelect.value = savedVoice;
    }
    
    // Update any other UI elements that need to reflect the voice change
    const voiceSettingDisplay = document.getElementById('voice-setting-display');
    if (voiceSettingDisplay) {
        voiceSettingDisplay.textContent = voiceName;
    }
}

// Load saved voice
function loadSavedVoice() {
    const savedVoice = localStorage.getItem('selectedVoice') || 'male-1';
    const savedVoiceName = localStorage.getItem('selectedVoiceName') || 'William (AU)';
    
    // Update the voice select dropdown in modal
    const voiceModalSelect = document.getElementById('voice-modal-select');
    if (voiceModalSelect) {
        voiceModalSelect.value = savedVoice;
    }
    
    // Don't display voice name in the bubble as per user request
    if (currentVoiceName) {
        currentVoiceName.textContent = "";
    }
    
    console.log(`Loaded saved voice: ${savedVoiceName} (${savedVoice})`);
    return savedVoice;
}

// Get voice key based on voice ID
function getVoiceKey(voiceId) {
    // Map voice IDs to actual voice keys used by Edge TTS
    const voiceMap = {
        'male-1': 'en-AU-WilliamNeural',
        'male-2': 'en-GB-RyanNeural',
        'male-3': 'en-NZ-MitchellNeural',
        'male-4': 'en-US-GuyNeural',
        'male-5': 'en-CA-LiamNeural',
        'male-6': 'en-IN-PrabhatNeural',
        'female-1': 'en-AU-NatashaNeural',
        'female-2': 'en-GB-SoniaNeural',
        'female-3': 'en-US-AvaNeural',
        'female-4': 'en-US-JennyNeural',
        'female-5': 'en-CA-ClaraNeural',
        'female-6': 'en-IN-NeerjaNeural'
    };
    
    return voiceMap[voiceId] || 'en-US-GuyNeural'; // Default to Guy if not found
}

// Map voice IDs to Edge TTS voice keys - This is now handled by getVoiceKey function
// Keeping this for backward compatibility
var voiceIdToEdgeTTSMap = {
    'male-1': 'en-AU-WilliamNeural',
    'male-2': 'en-GB-RyanNeural',
    'male-3': 'en-NZ-MitchellNeural',
    'male-4': 'en-US-GuyNeural',
    'male-5': 'en-CA-LiamNeural',
    'male-6': 'en-IN-PrabhatNeural',
    'female-1': 'en-AU-NatashaNeural',
    'female-2': 'en-GB-SoniaNeural',
    'female-3': 'en-US-AvaNeural',
    'female-4': 'en-US-JennyNeural',
    'female-5': 'en-CA-ClaraNeural',
    'female-6': 'en-IN-NeerjaNeural'
};

// Update main settings UI
function updateMainSettingsUI(voiceId) {
    // This function updates the main settings UI to reflect the selected voice
    // It's similar to the setVoice function in settings.js
    const mainVoiceOptions = document.querySelectorAll('.voice-option');
    
    mainVoiceOptions.forEach(option => {
        if (option.getAttribute('data-voice') === voiceId) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
}

// Load saved voice for modal
function loadSavedVoiceForModal() {
    const savedVoice = localStorage.getItem('selectedVoice') || 'female-2';
    
    // Find the option element for the saved voice
    const savedVoiceOption = document.querySelector(`.voice-option[data-voice="${savedVoice}"]`);
    
    if (savedVoiceOption) {
        try {
            // Update active state
            const allVoiceOptions = document.querySelectorAll('.voice-option');
            allVoiceOptions.forEach(opt => opt.classList.remove('active'));
            savedVoiceOption.classList.add('active');
            
            // Update current voice name
            const voiceName = savedVoiceOption.querySelector('.voice-option-name').textContent;
            if (currentVoiceName) {
                currentVoiceName.textContent = voiceName;
            }
            
            // Switch to the correct category
            const category = savedVoice.startsWith('male') ? 'male' : 'female';
            switchVoiceCategory(category);
        } catch (error) {
            console.error('Error loading saved voice:', error);
        }
    } else {
        console.log(`No saved voice option found for '${savedVoice}'`);
    }
}


});
