// Settings functionality

// DOM Elements
const settingsContainer = document.getElementById('settings-container');
const closeSettingsBtn = document.getElementById('close-settings');
const userInfoBtn = document.querySelector('.user-info');
const settingsTabs = document.querySelectorAll('.settings-tabs .tab');
const tabContents = document.querySelectorAll('.tab-content');
const themeOptions = document.querySelectorAll('.theme-option');
const voiceOptions = document.querySelectorAll('.voice-option');
const languageSelector = document.getElementById('language-selector');
const exportChatsBtn = document.getElementById('export-chats');
const deleteAllChatsBtn = document.getElementById('delete-all-chats');
const deleteAccountBtn = document.getElementById('delete-account');

// Initialize settings
document.addEventListener('DOMContentLoaded', () => {
    initializeSettings();
    initVoices();
    // initAutoSpeakToggle() is now called in applySavedPreferences
    
    // Log available elements for debugging
    console.log('Voice selection modal:', document.getElementById('voice-selection-modal'));
    console.log('Voice selection overlay:', document.getElementById('voice-selection-overlay'));
    
    // Handle the old voice selection overlay if it exists
    const voiceSelectionOverlay = document.getElementById('voice-selection-overlay');
    if (voiceSelectionOverlay) {
        console.log('Found old voice selection overlay, setting up event handlers');
        
        // Close voice selection overlay when clicking outside the container
        voiceSelectionOverlay.addEventListener('click', (e) => {
            if (e.target === voiceSelectionOverlay) {
                voiceSelectionOverlay.classList.remove('open');
                document.body.style.overflow = ''; // Restore scrolling
            }
        });
        
        // Close button for old overlay
        const closeVoiceSelectionBtn = document.getElementById('close-voice-selection');
        if (closeVoiceSelectionBtn) {
            closeVoiceSelectionBtn.addEventListener('click', () => {
                voiceSelectionOverlay.classList.remove('open');
                document.body.style.overflow = ''; // Restore scrolling
            });
        }
        
        // Done button for old overlay
        const voiceDoneBtnOld = document.getElementById('voice-done-btn');
        if (voiceDoneBtnOld) {
            voiceDoneBtnOld.addEventListener('click', () => {
                const voiceDropdownOld = document.getElementById('voice-dropdown');
                if (voiceDropdownOld && voiceDropdownOld.value) {
                    localStorage.setItem('selectedVoice', voiceDropdownOld.value);
                    voiceSelectionOverlay.classList.remove('open');
                    document.body.style.overflow = ''; // Restore scrolling
                } else {
                    alert('Please select a voice first.');
                }
            });
        }
    }
});

// Initialize auto-speak toggle
function initAutoSpeakToggle() {
    const autoSpeakToggle = document.getElementById('auto-speak-toggle');
    console.log('Auto-speak toggle element:', autoSpeakToggle);
    
    if (autoSpeakToggle) {
        // Load saved preference
        const autoSpeakEnabled = localStorage.getItem('autoSpeakEnabled') === 'true';
        autoSpeakToggle.checked = autoSpeakEnabled;
        console.log('Auto-speak initial state:', autoSpeakEnabled);
        
        // Get the toggle container element
        const toggleContainer = autoSpeakToggle.closest('.toggle-container');
        
        // Set initial ARIA state
        if (toggleContainer) {
            toggleContainer.setAttribute('aria-pressed', autoSpeakEnabled);
        }
        
        // Save preference when changed
        autoSpeakToggle.addEventListener('change', () => {
            localStorage.setItem('autoSpeakEnabled', autoSpeakToggle.checked);
            console.log(`Auto-speak ${autoSpeakToggle.checked ? 'enabled' : 'disabled'}`);
            
            // Update ARIA attributes for accessibility
            if (toggleContainer) {
                toggleContainer.setAttribute('aria-pressed', autoSpeakToggle.checked);
            }
        });
        
        // Also add click handler to the container for better UX
        if (toggleContainer) {
            toggleContainer.addEventListener('click', (e) => {
                // Don't toggle if clicking directly on the checkbox (it will handle itself)
                if (e.target !== autoSpeakToggle) {
                    autoSpeakToggle.checked = !autoSpeakToggle.checked;
                    // Trigger the change event
                    autoSpeakToggle.dispatchEvent(new Event('change'));
                }
            });
        }
    }
}

// Initialize voice options
function initVoices() {
    // Wait for voices to be loaded
    if (typeof speechSynthesis !== 'undefined') {
        speechSynthesis.onvoiceschanged = function() {
            const voices = window.speechSynthesis.getVoices();
            console.log('Total voices available:', voices.length);
            
            // Look for Mozilla DeepVoice voices
            const mozillaVoices = voices.filter(v => v.name.includes('Mozilla') || v.name.includes('DeepVoice'));
            console.log('Mozilla DeepVoice voices found:', mozillaVoices.length);
            
            if (mozillaVoices.length > 0) {
                console.log('Mozilla DeepVoice voices:', mozillaVoices.map(v => v.name).join(', '));
            }
            
            // Load saved voice preference
            loadSavedVoice();
        };
        
        // Trigger initial voice loading
        speechSynthesis.getVoices();
    }
}

// Function to populate the voice dropdown with available voices
function populateVoiceDropdown() {
    const voiceDropdown = document.getElementById('voice-modal-select');
    if (!voiceDropdown) return;
    
    // Remove en-US-SaraNeural from options if it exists (not available)
    for (let i = 0; i < voiceDropdown.options.length; i++) {
        if (voiceDropdown.options[i].value === 'en-US-SaraNeural') {
            voiceDropdown.remove(i);
            break;
        }
    }
    
    // Set the selected voice if one is saved
    const savedVoice = localStorage.getItem('selectedVoice');
    if (savedVoice) {
        // If the saved voice is en-US-SaraNeural (which is not available), default to Ava
        if (savedVoice === 'en-US-SaraNeural') {
            localStorage.setItem('selectedVoice', 'en-US-AvaNeural');
            voiceDropdown.value = 'en-US-AvaNeural';
        } else {
            voiceDropdown.value = savedVoice;
        }
    } else {
        // Set default voice to Ava
        const defaultVoice = 'en-US-AvaNeural';
        voiceDropdown.value = defaultVoice;
        localStorage.setItem('selectedVoice', defaultVoice);
    }
    
    // Trigger change event to update the current voice name display
    const event = new Event('change');
    voiceDropdown.dispatchEvent(event);
}

// Animate voice blob with audio analyzer
function animateVoiceBlob() {
    const voiceBlob = document.querySelector('.voice-blob');
    if (voiceBlob) {
        voiceBlob.style.animation = 'none';
        setTimeout(() => {
            voiceBlob.style.animation = 'pulse 2s infinite ease-in-out';
        }, 10);
    }
}

// Set up audio analyzer for voice visualization
function setupAudioAnalyzer(audioElement) {
    try {
        // Clean up any existing audio context to prevent memory leaks
        if (audioContext) {
            // Suspend the context first to stop audio processing
            if (audioContext.state === 'running') {
                try {
                    audioContext.suspend();
                } catch (e) {
                    console.warn('Could not suspend audio context:', e);
                }
            }
            
            // Try to close the existing context if possible
            try {
                audioContext.close();
            } catch (e) {
                console.warn('Could not close audio context:', e);
            }
            
            // Reset the context
            audioContext = null;
        }
        
        // Create a fresh audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Stop any existing visualization
        stopAudioVisualization();
        
        // Create media element source
        const source = audioContext.createMediaElementSource(audioElement);
        
        // Create analyzer
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        // Connect source to analyzer and then to destination
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        // Get the voice bubble element - fixed selector to match HTML structure
        const voiceBubble = document.querySelector('.voice-bubble');
        
        // Start visualization
        function visualize() {
            if (!analyser) return;
            
            animationFrameId = requestAnimationFrame(visualize);
            
            // Get frequency data
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average frequency
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            // Scale for visualization (0-100%)
            const scale = 1 + (average / 255) * 0.5; // Scale between 1x and 1.5x
            
            // Apply scale to voice bubble
            if (voiceBubble) {
                voiceBubble.style.transform = `scale(${scale})`;
                console.log('Applying transform scale:', scale);
            } else {
                console.warn('Voice bubble element not found');
            }
        }
        
        // Start visualization
        visualize();
        
    } catch (error) {
        console.error('Error setting up audio analyzer:', error);
    }
}

// Stop audio visualization
function stopAudioVisualization() {
    // Cancel any animation frame
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        console.log('Animation frame canceled');
    }
    
    // Reset voice bubble transform
    const voiceBubble = document.querySelector('.voice-bubble');
    if (voiceBubble) {
        voiceBubble.style.transform = 'scale(1)';
    }
    
    // Clean up audio context resources
    if (analyser) {
        try {
            // Disconnect the analyser if it's connected
            analyser.disconnect();
        } catch (e) {
            console.warn('Could not disconnect analyser:', e);
        }
        analyser = null;
    }
    
    // Suspend the audio context to stop audio processing
    if (audioContext) {
        if (audioContext.state === 'running') {
            try {
                audioContext.suspend();
                console.log('Audio context suspended');
            } catch (e) {
                console.warn('Could not suspend audio context:', e);
            }
        }
        // We don't close the context here as it might be reused,
        // but we ensure it's suspended to stop audio processing
    }
}
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

            // Update active state
            voiceOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');

            // Play a sample of the selected voice
            previewVoice(voice);
        });
    });

    // Language selection
    if (languageSelector) {
        languageSelector.addEventListener('change', () => {
            const language = languageSelector.value;
            setLanguage(language);
        });
    }

    // Advanced tab voice selection
    const selectVoiceBtn = document.getElementById('select-voice-btn');
    const voiceDoneBtn = document.getElementById('done-voice-btn');
    const voiceDropdown = document.getElementById('voice-modal-select');
    const voiceSelectionModal = document.getElementById('voice-selection-modal');
    const closeVoiceModalBtn = document.getElementById('close-voice-modal');
    const currentVoiceNameElement = document.getElementById('current-voice-name');
    const voiceBubble = document.getElementById('voiceBubble');
    const smokeContainer = document.getElementById('smokeContainer');

    // Function to create smoke particles
    function createSmokeParticles() {
        if (!smokeContainer) return;

        // Clear existing particles
        smokeContainer.innerHTML = '';

        // Create new particles
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'smoke-particle';

            const left = Math.random() * 100;
            const bottom = Math.random() * 20;
            const duration = 2 + Math.random() * 2;
            const delay = Math.random() * 1.5;
            const hue = Math.random() * 60 - 30;

            particle.style.left = `${left}%`;
            particle.style.bottom = `${bottom}%`;
            particle.style.setProperty('--smoke-duration', `${duration}s`);
            particle.style.animationDelay = `${delay}s`;
            particle.style.setProperty('--hue', hue);

            smokeContainer.appendChild(particle);
        }
    }

    // Function to close voice modal and stop any playing audio
    function closeVoiceModal() {
        // Stop any playing voice preview
        stopOngoingVoicePreview();
        
        if (voiceSelectionModal) {
            voiceSelectionModal.classList.remove('active');
            setTimeout(() => {
                voiceSelectionModal.style.display = 'none';
            }, 300);
            document.body.style.overflow = '';
        } else {
            const voiceSelectionOverlay = document.getElementById('voice-selection-overlay');
            if (voiceSelectionOverlay) {
                voiceSelectionOverlay.classList.remove('open');
                document.body.style.overflow = '';
            }
        }
    }
    
    // Add keyboard event listener for Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            // Check if voice modal is open
            if (voiceSelectionModal && (voiceSelectionModal.style.display === 'flex' || voiceSelectionModal.classList.contains('active'))) {
                closeVoiceModal();
            }
        }
    });
    
    if (selectVoiceBtn) {
        console.log('Select voice button found:', selectVoiceBtn);
        selectVoiceBtn.addEventListener('click', () => {
            console.log('Select voice button clicked');
            populateVoiceDropdown();

            const currentVoice = localStorage.getItem('selectedVoice') || 'en-US-AvaNeural';
            console.log('Current voice:', currentVoice);

            if (currentVoiceNameElement) {
                const voiceOption = Array.from(voiceDropdown.options).find(option => option.value === currentVoice);
                currentVoiceNameElement.textContent = voiceOption ? voiceOption.textContent : 'Select a voice';
            }

            createSmokeParticles();

            if (voiceSelectionModal) {
                voiceSelectionModal.style.display = 'flex';
                setTimeout(() => {
                    voiceSelectionModal.classList.add('active');
                }, 10);
                document.body.style.overflow = 'hidden';
            } else {
                const voiceSelectionOverlay = document.getElementById('voice-selection-overlay');
                if (voiceSelectionOverlay) {
                    const oldVoiceDropdown = document.getElementById('voice-dropdown');
                    if (oldVoiceDropdown) {
                        const savedVoice = localStorage.getItem('selectedVoice');
                        if (savedVoice) {
                            oldVoiceDropdown.value = savedVoice;
                        }
                    }

                    voiceSelectionOverlay.classList.add('open');
                    document.body.style.overflow = 'hidden';
                } else {
                    console.error('Neither voice selection modal nor overlay found');
                }
            }
        });
    }

    if (closeVoiceModalBtn) {
        closeVoiceModalBtn.addEventListener('click', closeVoiceModal);
    }

    if (voiceDropdown) {
        voiceDropdown.addEventListener('change', () => {
            const selectedVoice = voiceDropdown.value;
            if (selectedVoice && currentVoiceNameElement) {
                const selectedOption = voiceDropdown.options[voiceDropdown.selectedIndex];
                currentVoiceNameElement.textContent = selectedOption.textContent;

                previewVoice(selectedVoice);

                if (voiceBubble) {
                    voiceBubble.classList.add('pulse');
                    setTimeout(() => {
                        voiceBubble.classList.remove('pulse');
                    }, 1000);
                }

                createSmokeParticles();
            }
        });
    }

    if (voiceDoneBtn) {
        voiceDoneBtn.addEventListener('click', () => {
            const selectedVoice = voiceDropdown.value;
            if (selectedVoice) {
                // Stop any playing voice preview
                stopOngoingVoicePreview();
                
                setVoice(selectedVoice);

                const successMessage = document.createElement('div');
                successMessage.className = 'voice-success-message';
                successMessage.textContent = 'Voice settings saved!';
                document.querySelector('.voice-modal-content').appendChild(successMessage);

                setTimeout(() => {
                    successMessage.remove();
                    closeVoiceModal();
                }, 1500);
            } else {
                alert('Please select a voice first.');
            }
        });
    }

    // Removed duplicate event listener for voiceDropdown change
    // The functionality is already handled by the previous event listener above

    // Close voice selection modal when clicking outside the container
    if (voiceSelectionModal) {
        voiceSelectionModal.addEventListener('click', (e) => {
            if (e.target === voiceSelectionModal) {
                voiceSelectionModal.classList.remove('active');
                setTimeout(() => {
                    voiceSelectionModal.style.display = 'none';
                }, 300);
                document.body.style.overflow = '';
            }
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
    
    // Update UI to show active voice
    document.querySelectorAll('.voice-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const selectedOption = document.querySelector(`.voice-option[data-voice="${voiceId}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }
    
    // Preview the selected voice with debounce to prevent duplicate calls
    previewVoiceDebounced(voiceId);
}

// Global variables to track voice preview state
let previewVoiceTimeout = null;
let isPreviewInProgress = false;
let lastPreviewedVoice = null;

/**
 * Debounce function to prevent multiple rapid calls
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce delay in milliseconds
 * @returns {Function} - The debounced function
 */
function debounce(func, wait) {
    return function(...args) {
        const context = this;
        if (previewVoiceTimeout) {
            clearTimeout(previewVoiceTimeout);
        }
        previewVoiceTimeout = setTimeout(() => {
            previewVoiceTimeout = null;
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Debounced version of the preview function with a longer delay
 * This ensures we don't make multiple API calls in quick succession
 */
const previewVoiceDebounced = debounce(function(voiceId) {
    // Only call if not already in progress or if it's a different voice
    if (!isPreviewInProgress || lastPreviewedVoice !== voiceId) {
        previewVoice(voiceId);
    }
}, 500); // 500ms debounce time

// Audio context and analyzer variables
let audioContext;
let analyser;
let dataArray;
let animationFrameId;

/**
 * Function to stop any ongoing voice preview
 * This ensures only one voice plays at a time
 */
function stopOngoingVoicePreview() {
    // Stop visualization first
    stopAudioVisualization();
    
    // Stop audio playback with more thorough cleanup
    if (window.previewAudio) {
        console.log('Stopping currently playing audio');
        // Force immediate pause
        window.previewAudio.pause();
        // Remove all event listeners
        window.previewAudio.onended = null;
        window.previewAudio.onplay = null;
        window.previewAudio.onpause = null;
        window.previewAudio.onerror = null;
        window.previewAudio.oncanplay = null;
        
        // Set current time to end to ensure it stops
        try {
            window.previewAudio.currentTime = window.previewAudio.duration || 0;
        } catch (e) {
            console.log('Could not set currentTime, audio might be in an invalid state');
        }
        
        // Clean up source
        if (window.previewAudio.src) {
            URL.revokeObjectURL(window.previewAudio.src);
        }
        
        // Set src to empty to ensure it stops loading
        window.previewAudio.src = '';
        window.previewAudio.load(); // Force reload with empty source
        window.previewAudio = null;
    }
    
    // Cancel any speech synthesis
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // Reset the voice blob state
    const voiceBlob = document.querySelector('.voice-bubble');
    if (voiceBlob) {
        voiceBlob.classList.remove('loading');
        voiceBlob.style.transform = '';
    }
    
    // Reset the preview flag
    isPreviewInProgress = false;
    console.log('Voice preview stopped completely');
}

/**
 * Function to preview the selected voice using Edge TTS
 * Includes safeguards to prevent duplicate API calls
 */
function previewVoice(voiceId) {
    // If there's already a voice preview in progress, stop it first
    if (isPreviewInProgress) {
        console.log('Stopping previous voice preview before starting new one');
        // Force stop any ongoing preview
        stopOngoingVoicePreview();
    }
    
    // Track the voice being previewed
    lastPreviewedVoice = voiceId;
    
    // Set flag to indicate preview is in progress
    isPreviewInProgress = true;
    const previewText = "Hi There How can i help You";
    
    // Stop any currently playing audio and animation
    stopAudioVisualization();
    
    // Stop any currently playing audio
    if (window.previewAudio) {
        window.previewAudio.pause();
        window.previewAudio.onended = null; // Remove event listener
        window.previewAudio.onplay = null; // Remove event listener
        window.previewAudio = null;
    }
    
    // Stop any currently playing speech synthesis
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // Show loading state on the blob
    const voiceBlob = document.querySelector('.voice-blob');
    if (voiceBlob) {
        voiceBlob.classList.add('loading');
    }
    
    // Make a request to the server to generate speech using Edge TTS
    fetch('/api/edge-tts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: previewText,
            voice: voiceId
        })
    })
    .then(response => response.json())
    .then(data => {
        // Create audio from base64 data
        const audioData = atob(data.audio);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < audioData.length; i++) {
            uint8Array[i] = audioData.charCodeAt(i);
        }
        
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Make sure any previous audio is fully stopped
        stopOngoingVoicePreview();
        
        // Create a new audio element
        const audio = new Audio();
        
        // Set up all event handlers before setting the source
        audio.onplay = () => {
            console.log('Audio started playing, activating audio analyzer');
            setupAudioAnalyzer(audio);
        };
        
        audio.onended = () => {
            console.log('Audio ended naturally, stopping audio analyzer');
            stopAudioVisualization();
            
            // Clean up
            if (audio.src) {
                URL.revokeObjectURL(audio.src);
            }
            window.previewAudio = null;
            
            // Reset the preview in progress flag
            isPreviewInProgress = false;
        };
        
        audio.onerror = (e) => {
            console.error('Audio playback error:', e);
            stopAudioVisualization();
            
            // Clean up on error
            if (audio.src) {
                URL.revokeObjectURL(audio.src);
            }
            window.previewAudio = null;
            isPreviewInProgress = false;
        };
        
        audio.onpause = () => {
            console.log('Audio paused, stopping visualization');
            stopAudioVisualization();
        };
        
        // Store the audio instance globally so we can stop it later
        window.previewAudio = audio;
        
        // Set the source after all event handlers are set up
        audio.src = audioUrl;
        
        // Play the audio with better error handling
        audio.play().catch(e => {
            console.error('Error playing audio:', e);
            stopAudioVisualization();
            
            // Clean up on play error
            if (audio.src) {
                URL.revokeObjectURL(audio.src);
            }
            window.previewAudio = null;
            isPreviewInProgress = false;
        });
        
        // Remove loading state
        if (voiceBlob) {
            voiceBlob.classList.remove('loading');
        }
    })
    .catch(error => {
        console.error('Error previewing voice:', error);
        
        // Reset the voice blob state
        if (voiceBlob) {
            voiceBlob.classList.remove('loading');
        }
        
        // Reset the preview in progress flag on error
        isPreviewInProgress = false;
        
        // Fallback to browser's speech synthesis if Edge TTS fails
        const utterance = new SpeechSynthesisUtterance(previewText);
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.name.includes('Female') || v.name.includes('female'));
        
        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        }
        
        // Start waveform animation for fallback voice
        if (waveformContainer) {
            console.log('Starting waveform for fallback voice');
            waveformContainer.classList.add('playing');
        }
        
        utterance.onend = () => {
            console.log('Speech synthesis ended, stopping waveform');
            // Stop waveform animation when speech ends
            if (waveformContainer) {
                waveformContainer.classList.remove('playing');
            }
        };
        
        window.speechSynthesis.speak(utterance);
        
        // Remove loading state
        if (voiceBlob) {
            voiceBlob.classList.remove('loading');
        }
    });
}
// Load saved voice preference
function loadSavedVoice() {
    const savedVoice = localStorage.getItem('selectedVoice') || 'en-US-AvaNeural'; // Default to Ava
    const voiceOption = document.querySelector(`[data-voice="${savedVoice}"]`);
    if (voiceOption) {
        setVoice(savedVoice);
    }
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
    
    // Initialize auto-speak toggle
    initAutoSpeakToggle();
}

// Initialize speech synthesis voices
function initVoices() {
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = function() {
                window.speechSynthesis.getVoices();
            };
        }
    }
}

// Apply saved preferences on page load
document.addEventListener('DOMContentLoaded', applySavedPreferences);