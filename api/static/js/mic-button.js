// Microphone button functionality
// Make sure sendMessage function is accessible
// Using window.sendMessageMic to avoid redeclaration issues
let sendMessageMic;

document.addEventListener('DOMContentLoaded', function() {
    // Get reference to the sendMessage function from the global scope
    sendMessageMic = window.sendMessage;
    const userInput = document.getElementById('user-input');
    const sendButton = document.querySelector('.send-btn');
    const chatContainer = document.querySelector('.chat-container');
    
    // Function to send voice query to AI and speak default response
    window.sendVoiceQueryToAI = function(text) {
        if (!text || text.trim() === '') return;
        
        // Set the recognized text in the input field
        userInput.value = text;
        
        // Speak the default response
        speakDefaultResponse();
        
        // Send the message to the AI
        if (typeof sendMessageMic === 'function') {
            sendMessageMic(text);
        } else {
            console.error('sendMessage function not found');
            // Fallback: trigger the send button click
            sendButton.click();
        }
        
        // Close the mic overlay
        document.querySelector('.mic-overlay').style.display = 'none';
    };
    
    // Function to speak the default response
    function speakDefaultResponse() {
        const defaultResponse = "Yes Sir, Finding Your Answer";
        
        // Get the selected voice from localStorage
        const savedVoice = localStorage.getItem('selectedVoice') || 'female-2';
        let voiceId = 'en-US-AvaNeural'; // Default voice
        
        // Map the voice option to Edge TTS voice ID
        switch(savedVoice) {
            case 'male-1':
                voiceId = 'en-AU-WilliamNeural';
                break;
            case 'male-2':
                voiceId = 'en-GB-RyanNeural';
                break;
            case 'male-3':
                voiceId = 'en-NZ-MitchellNeural';
                break;
            case 'male-4':
                voiceId = 'en-US-GuyNeural';
                break;
            case 'male-5':
                voiceId = 'en-CA-LiamNeural';
                break;
            case 'male-6':
                voiceId = 'en-IN-PrabhatNeural';
                break;
            case 'female-1':
                voiceId = 'en-AU-NatashaNeural';
                break;
            case 'female-2':
                voiceId = 'en-GB-SoniaNeural';
                break;
            case 'female-3':
                voiceId = 'en-US-AvaNeural';
                break;
            case 'female-4':
                voiceId = 'en-US-JennyNeural';
                break;
            case 'female-5':
                voiceId = 'en-CA-ClaraNeural';
                break;
            case 'female-6':
                voiceId = 'en-IN-NeerjaNeural';
                break;
        }
        
        // Call the Edge TTS API
        fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: defaultResponse,
                voice: voiceId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('TTS Error:', data.error);
                return;
            }
            
            // Play the audio
            const audio = new Audio(data.audio_url);
            audio.play();
        })
        .catch(error => {
            console.error('TTS API Error:', error);
        });
    }
    
    // Create microphone overlay
    const micOverlay = document.createElement('div');
    micOverlay.className = 'mic-overlay';
    micOverlay.style.display = 'none';
    micOverlay.innerHTML = `
        <button class="mic-close-btn" title="Close"><i class="fas fa-times"></i></button>
        <div class="mic-bubble">
            <i class="fas fa-microphone"></i>
        </div>
        <div class="mic-status"></div>
        <div class="mic-controls">
            <button id="mic-start-btn" class="mic-btn" title="Start listening"><i class="fas fa-microphone"></i></button>
        </div>
    `;
    
    // Add overlay to body
    document.body.appendChild(micOverlay);
    
    // Add link to CSS file
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '/static/css/mic-overlay.css';
    document.head.appendChild(cssLink);
    
    // Function to update send button icon based on text content
    function updateSendButtonIcon(hasText) {
        if (hasText) {
            sendButton.innerHTML = '<img src="/static/img/arrow-icon.svg" alt="Send" class="send-icon">';
            sendButton.classList.remove('mic-active');
            sendButton.setAttribute('data-tooltip', 'Send Message');
        } else {
            sendButton.innerHTML = '<i class="fas fa-microphone"></i>';
            sendButton.classList.add('mic-active');
            sendButton.setAttribute('data-tooltip', 'Voice Input');
        }
    }
    
    // Initialize the button state
    updateSendButtonIcon(userInput.value.trim().length > 0);
    
    // Update button when input changes
    userInput.addEventListener('input', function() {
        updateSendButtonIcon(this.value.trim().length > 0);
    });
    
    // Web Speech API setup
    let isListening = false;
    let recognition = null;
    let recognitionInitialized = false;
    
    // Initialize Web Speech Recognition
    function initSpeechRecognition() {
        if (recognitionInitialized) return;
        
        try {
            document.querySelector('.mic-status').textContent = 'Initializing voice recognition...';
            
            // Check if browser supports Web Speech API
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                throw new Error('Web Speech API not supported in this browser');
            }
            
            // Create speech recognition instance
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            
            // Configure recognition
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            
            // Set up recognition event handlers
            recognition.onresult = handleRecognitionResult;
            recognition.onerror = handleRecognitionError;
            recognition.onend = handleRecognitionEnd;
            
            recognitionInitialized = true;
            document.querySelector('.mic-status').textContent = 'Ready to listen';
        } catch (error) {
            document.querySelector('.mic-status').textContent = `Error: ${error.message}`;
            console.error('Speech recognition initialization error:', error);
        }
    }
    
    // Handle recognition results
    function handleRecognitionResult(event) {
        if (!isListening) return;
        
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Update the status with interim results
        if (interimTranscript !== '') {
            document.querySelector('.mic-status').textContent = interimTranscript + '...';
        }
        
        // Process final results
        if (finalTranscript !== '') {
            document.querySelector('.mic-status').textContent = finalTranscript;
            console.log('Recognized text:', finalTranscript);
        }
    }
    
    // Handle recognition errors
    function handleRecognitionError(event) {
        console.error('Speech recognition error:', event.error);
        document.querySelector('.mic-status').textContent = `Error: ${event.error}`;
        
        // Reset UI
        document.querySelector('.mic-bubble').style.transform = '';
        document.querySelector('.mic-bubble').classList.remove('listening');
        document.getElementById('mic-start-btn').querySelector('i').className = 'fas fa-microphone';
        document.getElementById('mic-start-btn').title = 'Start listening';
        
        isListening = false;
    }
    
    // Handle recognition end
    function handleRecognitionEnd() {
        // If we're still in listening mode but recognition ended, restart it
        if (isListening && recognition) {
            recognition.start();
        } else {
            // Reset UI
            document.querySelector('.mic-bubble').style.transform = '';
            document.querySelector('.mic-bubble').classList.remove('listening');
            document.getElementById('mic-start-btn').querySelector('i').className = 'fas fa-microphone';
            document.getElementById('mic-start-btn').title = 'Start listening';
        }
    }
    
    // Function to start listening
    async function startListening() {
        if (isListening) return;
        
        // Show listening state
        document.querySelector('.mic-bubble').classList.add('listening');
        document.querySelector('.mic-status').textContent = 'Initializing...';
        document.getElementById('mic-start-btn').querySelector('i').className = 'fas fa-pause';
        document.getElementById('mic-start-btn').title = 'Pause listening';
        
        try {
            // Initialize speech recognition if not already done
            if (!recognitionInitialized) {
                await initSpeechRecognition();
            }
            
            // Get user media for visualization (not needed for recognition but for visual feedback)
            const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Set up audio visualization
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(mediaStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            
            // Start recognition
            recognition.start();
            isListening = true;
            document.querySelector('.mic-status').textContent = 'Listening...';
            
            // Set up visualization loop
            const visualize = () => {
                if (!isListening) return;
                
                // Update visual feedback
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);
                
                // Calculate average frequency intensity
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                
                // Scale the bubble based on audio intensity
                const scale = 1 + (average / 256) * 0.5; // Scale between 1 and 1.5
                document.querySelector('.mic-bubble').style.transform = `scale(${scale})`;
                
                // Continue visualization
                requestAnimationFrame(visualize);
            };
            
            // Start visualization
            visualize();
            
            // Override the recognition onend to capture final result
            const originalOnEnd = recognition.onend;
            recognition.onend = function(event) {
                if (originalOnEnd) originalOnEnd(event);
                
                // If we're stopping intentionally, get the final result
                if (!isListening) {
                    const finalText = document.querySelector('.mic-status').textContent;
                    if (finalText && finalText !== 'Listening...' && !finalText.startsWith('Error:')) {
                        // Send the recognized text to the AI
                        sendVoiceQueryToAI(finalText);
                    }
                    
                    // Clean up audio context and media stream
                    if (audioContext) {
                        audioContext.close();
                    }
                    
                    if (mediaStream) {
                        mediaStream.getTracks().forEach(track => track.stop());
                    }
                }
            };
            
        } catch (err) {
            document.querySelector('.mic-status').textContent = 'Error: ' + err.message;
            console.error('Speech recognition error:', err);
            document.querySelector('.mic-bubble').classList.remove('listening');
            document.getElementById('mic-start-btn').querySelector('i').className = 'fas fa-microphone';
            document.getElementById('mic-start-btn').title = 'Start listening';
            isListening = false;
        }
    }
    
    // Function to stop listening
    function stopListening() {
        if (!isListening) return;
        
        isListening = false;
        
        if (recognition) {
            recognition.stop();
        }
        
        document.querySelector('.mic-bubble').style.transform = '';
        document.querySelector('.mic-bubble').classList.remove('listening');
        document.getElementById('mic-start-btn').querySelector('i').className = 'fas fa-microphone';
        document.getElementById('mic-start-btn').title = 'Start listening';
    }
    
    // Replace the send button click handler for mic functionality
    const originalClickHandler = sendButton.onclick;
    sendButton.onclick = function(event) {
        // If mic is active and clicked, show the mic overlay
        if (sendButton.classList.contains('mic-active')) {
            micOverlay.style.display = 'flex';
            // Start listening immediately when overlay is shown
            setTimeout(() => {
                startListening();
            }, 300);
            return false;
        }
        
        // Otherwise, let the original handler run
        if (originalClickHandler) {
            return originalClickHandler.call(this, event);
        }
    };
    
    // When a message is sent, reset to mic icon
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                // If a new message was added and input is empty, show mic icon
                if (userInput.value.trim().length === 0) {
                    updateSendButtonIcon(false);
                }
            }
        });
    });
    
    // Start observing the chat messages container
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        observer.observe(messagesContainer, { childList: true });
    }
    
    // Event listeners for overlay
    document.querySelector('.mic-close-btn').addEventListener('click', function() {
        stopListening();
        micOverlay.style.display = 'none';
    });
    
    document.getElementById('mic-start-btn').addEventListener('click', function() {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    });
});