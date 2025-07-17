import asyncio
import os
import edge_tts
from flask import Blueprint, request, jsonify, Response

tts_bp = Blueprint('tts', __name__)

# Define available voices
VOICES = {
    'male': [
        'en-AU-WilliamNeural',
        'en-GB-RyanNeural',
        'en-NZ-MitchellNeural',
        'en-US-GuyNeural',
        'en-CA-LiamNeural',
        'en-IN-PrabhatNeural'
    ],
    'female': [
        'en-AU-NatashaNeural',
        'en-GB-SoniaNeural',
        'en-US-AvaNeural',
        'en-US-JennyNeural',
        'en-CA-ClaraNeural',
        'en-IN-NeerjaNeural'
    ]
}

# Helper function to run async code
def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

# Async function to generate speech
async def generate_speech(text, voice_id):
    # Create a temporary file to store the audio
    # Use a unique identifier that includes voice_id to prevent conflicts
    unique_id = f"{voice_id}_{hash(text)}"
    temp_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'temp', f'speech_{unique_id}.mp3')
    os.makedirs(os.path.dirname(temp_file), exist_ok=True)
    
    # Initialize TTS with the selected voice
    communicate = edge_tts.Communicate(text, voice_id)
    
    # Save audio to file
    await communicate.save(temp_file)
    
    # Schedule file for deletion after 5 minutes
    # This ensures files don't accumulate but gives enough time for playback
    async def delete_file_after_delay():
        await asyncio.sleep(300)  # 5 minutes
        try:
            if os.path.exists(temp_file):
                os.remove(temp_file)
                print(f"Deleted temporary speech file: {temp_file}")
        except Exception as e:
            print(f"Error deleting temporary file: {e}")
    
    # Start the deletion task without awaiting it
    asyncio.create_task(delete_file_after_delay())
    
    return temp_file

@tts_bp.route('/api/tts', methods=['POST'])
def text_to_speech():
    try:
        data = request.json
        text = data.get('text', '')
        voice_id = data.get('voice', 'en-US-AvaNeural')  # Default voice
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Run the async function in a synchronous context
        temp_file = run_async(generate_speech(text, voice_id))
        
        # Return the URL to the audio file
        file_url = f'/static/temp/{os.path.basename(temp_file)}'
        return jsonify({'audio_url': file_url})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tts_bp.route('/api/tts/voices', methods=['GET'])
def get_voices():
    """Return the list of available voices"""
    return jsonify(VOICES)