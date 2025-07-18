import asyncio
import os
import edge_tts
import base64
import traceback
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
    try:
        # Use asyncio.run() which is the recommended way to run async code
        # It automatically creates a new event loop and closes it at the end
        return asyncio.run(coro)
    except RuntimeError as e:
        # Handle case where event loop is already running
        if "There is no current event loop in thread" in str(e):
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(coro)
            finally:
                loop.close()
        else:
            print(f"RuntimeError in run_async: {str(e)}")
            raise e

# Async function to generate speech
async def generate_speech(text, voice_id):
    print(f"Starting speech generation with voice: {voice_id}")
    try:
        # Create a temporary file to store the audio
        # Use a unique identifier that includes voice_id to prevent conflicts
        unique_id = f"{voice_id}_{hash(text)}"
        
        # Use /tmp directory for Vercel serverless functions
        # This is the recommended location for temporary files in serverless environments
        tmp_dir = '/tmp' if os.path.exists('/tmp') else os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'temp')
        os.makedirs(tmp_dir, exist_ok=True)
        
        temp_file = os.path.join(tmp_dir, f'speech_{unique_id}.mp3')
        
        print(f"Generating speech to file: {temp_file}")
        
        # Initialize TTS with the selected voice
        communicate = edge_tts.Communicate(text, voice_id)
        
        # Save audio to file
        await communicate.save(temp_file)
        print(f"Successfully saved speech to: {temp_file}")
        
        # In serverless environments, we don't need to schedule deletion
        # as the /tmp directory is ephemeral and cleared between invocations
        # But we'll keep the logic for local development
        if not tmp_dir.startswith('/tmp'):
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
    except Exception as e:
        print(f"Error in generate_speech: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e

@tts_bp.route('/api/tts/health', methods=['GET'])
def health_check():
    """Simple health check endpoint to verify the TTS service is running"""
    return jsonify({
        'status': 'ok',
        'message': 'TTS service is running',
        'environment': 'serverless' if os.path.exists('/tmp') else 'local'
    })

@tts_bp.route('/api/tts', methods=['POST'])
def text_to_speech():
    try:
        print("TTS endpoint called")
        print(f"Python version: {os.sys.version}")
        print(f"Environment: {'serverless' if os.path.exists('/tmp') else 'local'}")
        
        # Check if request has JSON data
        if not request.is_json:
            print("Error: Request is not JSON")
            return jsonify({'error': 'Request must be JSON'}), 400
            
        data = request.json
        print(f"Request data: {data}")
        
        text = data.get('text', '')
        voice_id = data.get('voice', 'en-US-AvaNeural')  # Default voice
        
        if not text:
            print("Error: No text provided")
            return jsonify({'error': 'No text provided'}), 400
        
        print(f"Processing TTS request for voice: {voice_id}")
        print(f"Text to convert: {text[:50]}{'...' if len(text) > 50 else ''}")
        
        # Try a simpler approach for serverless environment
        try:
            # Run the async function in a synchronous context
            temp_file = run_async(generate_speech(text, voice_id))
            print(f"Speech generated successfully, saved to: {temp_file}")
            
            # Check if we're using the /tmp directory (serverless environment)
            if temp_file and temp_file.startswith('/tmp'):
                # In serverless environments, we need to serve the file directly
                # We'll return the file content as base64 encoded data
                try:
                    print(f"Reading file from {temp_file}")
                    with open(temp_file, 'rb') as f:
                        audio_data = f.read()
                        print(f"Read {len(audio_data)} bytes from file")
                        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
                        print("Successfully encoded audio to base64")
                        return jsonify({
                            'audio_data': audio_base64,
                            'content_type': 'audio/mpeg',
                            'is_base64': True
                        })
                except Exception as file_error:
                    print(f"Error reading audio file: {str(file_error)}")
                    traceback.print_exc()
                    return jsonify({'error': f'Error reading audio file: {str(file_error)}'}), 500
            elif temp_file:
                # For local development, return a URL to the static file
                file_url = f'/static/temp/{os.path.basename(temp_file)}'
                print(f"Returning file URL: {file_url}")
                return jsonify({'audio_url': file_url})
            else:
                print("Error: Failed to generate speech file")
                return jsonify({'error': 'Failed to generate speech'}), 500
                
        except Exception as speech_error:
            print(f"Error generating speech: {str(speech_error)}")
            traceback.print_exc()
            return jsonify({'error': f'Error generating speech: {str(speech_error)}'}), 500
        
    except Exception as e:
        print(f"Error in text_to_speech: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@tts_bp.route('/api/tts/voices', methods=['GET'])
def get_voices():
    """Return the list of available voices"""
    return jsonify(VOICES)