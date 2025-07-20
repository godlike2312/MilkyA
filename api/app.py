from flask import Flask, send_from_directory, render_template, request, jsonify, redirect, url_for, session, send_file
import requests
import json
import os
import secrets
import time
import traceback
import firebase_admin
from firebase_admin import credentials, auth
import base64
import io
import asyncio
import edge_tts
from routes.tts import tts_bp

# Helper function to safely run async code in Flask routes
def run_async(coro):
    """Safely run an async coroutine in a synchronous context
    
    This function handles the case where an event loop is already running,
    which can happen in certain environments like serverless functions.
    """
    try:
        # Try using asyncio.run() first
        return asyncio.run(coro)
    except RuntimeError as e:
        # Handle case where event loop is already running
        if "There is no current event loop in thread" in str(e) or "This event loop is already running" in str(e):
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(coro)
            finally:
                loop.close()
        else:
            print(f"RuntimeError in run_async: {str(e)}")
            raise e

# Initialize Firebase Admin SDK before creating the Flask app
# This ensures Firebase is initialized exactly once and before any routes are defined
firebase_initialized = False

def initialize_firebase():
    """Initialize Firebase Admin SDK with proper error handling"""
    global firebase_initialized
    
    if firebase_initialized:
        print("Firebase already initialized, skipping initialization")
        return True
        
    try:
        # Check if FIREBASE_SERVICE_ACCOUNT is set as an environment variable
        if os.environ.get('FIREBASE_SERVICE_ACCOUNT'):
            # Use the service account info from environment variable
            print("Initializing Firebase with service account from environment variable")
            try:
                service_account_info = json.loads(os.environ.get('FIREBASE_SERVICE_ACCOUNT'))
                cred = credentials.Certificate(service_account_info)
                firebase_admin.initialize_app(cred)
                firebase_initialized = True
                print("Successfully initialized Firebase with service account from environment variable")
                return True
            except json.JSONDecodeError as je:
                print(f"Error parsing FIREBASE_SERVICE_ACCOUNT environment variable: {str(je)}")
                print("The environment variable must contain valid JSON")
            except Exception as env_error:
                print(f"Error initializing Firebase with environment variable: {str(env_error)}")
        
        # Try service account files in order of preference
        service_account_paths = [
            'firebase-service-account.json'
        ]
        
        for path in service_account_paths:
            try:
                print(f"Attempting to initialize Firebase with service account from: {path}")
                cred = credentials.Certificate(path)
                firebase_admin.initialize_app(cred)
                firebase_initialized = True
                print(f"Successfully initialized Firebase with service account from: {path}")
                return True
            except FileNotFoundError:
                print(f"Service account file not found at: {path}")
                continue
            except ValueError as ve:
                if "already exists" in str(ve):
                    print("Firebase app already initialized")
                    firebase_initialized = True
                    return True
                else:
                    print(f"ValueError initializing Firebase with {path}: {str(ve)}")
                    continue
            except Exception as e:
                print(f"Error initializing Firebase with {path}: {str(e)}")
                continue
        
        # If we get here, try application default credentials
        print("Attempting to initialize Firebase with application default credentials")
        firebase_admin.initialize_app()
        firebase_initialized = True
        print("Successfully initialized Firebase with application default credentials")
        return True
    except ValueError as ve:
        if "already exists" in str(ve):
            print("Firebase app already initialized")
            firebase_initialized = True
            return True
        else:
            print(f"ValueError initializing Firebase: {str(ve)}")
    except Exception as e:
        print(f"Error initializing Firebase: {str(e)}")
    
    return firebase_initialized

# Initialize Firebase before creating the Flask app
firebase_init_success = initialize_firebase()
print(f"Firebase initialization {'successful' if firebase_init_success else 'FAILED'}")

# Create Flask app after Firebase initialization
app = Flask(__name__, static_folder='static', template_folder='templates')  # Updated paths for Vercel with symbolic links
app.secret_key = secrets.token_hex(16)  # Generate a secure secret key for sessions

# Register the TTS blueprint
app.register_blueprint(tts_bp)

# OpenRouter API key - read from environment variable
API_KEY = os.environ.get('OPENROUTER_API_KEY', '')

# Check if API key is not set in environment
if not API_KEY and app.debug:
    # Only use this fallback in development mode
    print("WARNING: OpenRouter API key not set. Please set OPENROUTER_API_KEY environment variable.")

# Add Groq API key
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')

# Add Together AI API key
TOGETHER_API_KEY = os.environ.get('TOGETHER_API_KEY', '')

# Add Cohere API key
COHERE_API_KEY = os.environ.get('COHERE_API_KEY', '')

# Model options with model IDs as keys
MODEL_OPTIONS = {
    'deepseek/deepseek-chat-v3-0324:free': {
        'id': 'deepseek/deepseek-chat-v3-0324:free',
        'display_name': 'GPT-4o',
        'description': 'Advanced AI with strong reasoning and coding abilities'
    },
    'mistralai/mistral-small-3.2-24b-instruct:free': {
        'id': 'mistralai/mistral-small-3.2-24b-instruct:free',
        'display_name': 'Reasoner 3.5',
        'description': 'Powerful 24B model with excellent reasoning'
    },
    'mistralai/devstral-small:free': {
        'id': 'mistralai/devstral-small:free',
        'display_name': 'Dev 2.4 sonnet',
        'description': 'Specialized for coding and technical tasks'
    },
    'mistralai/mistral-7b-instruct:free': {
        'id': 'mistralai/mistral-7b-instruct:free',
        'display_name': 'Milky Basic',
        'description': 'Fast and efficient 7B model'
    },
    'google/gemma-3n-e4b-it:free': {
        'id': 'google/gemma-3n-e4b-it:free',
        'display_name': 'Milky-S1',
        'description': 'Google\'s latest model with strong reasoning'
    },
    'agentica-org/deepcoder-14b-preview:free': {
        'id': 'agentica-org/deepcoder-14b-preview:free',
        'display_name': 'MilkyCoder Pro',
        'description': 'Specialized for complex programming tasks'
    },
    'deepseek/deepseek-v3-base:free': {
        'id': 'deepseek/deepseek-v3-base:free',
        'display_name': 'Milky 3.7 sonnet',
        'description': 'Optimized for software development'
    },
    'groq/llama3-8b': {
        'id': 'llama3-8b-8192',
        'display_name': 'Milky Fast-7o',
        'description': 'Ultra-fast Llama 3 8B model (Groq)',
        'provider': 'groq'
    },
    'groq/llama3-70b': {
        'id': 'llama3-70b-8192',
        'display_name': 'Milky Edge',
        'description': 'Ultra-fast Llama 3 70B model (Groq)',
        'provider': 'groq'
    },
    'together/llama-vision-free': {
        'id': 'meta-llama/Llama-Vision-Free',
        'display_name': 'Llama Vision Free',
        'description': 'Llama-Vision-Free model (Together AI)',
        'provider': 'together'
    },
    'cohere/command-r-plus': {
        'id': 'command-r-plus',
        'display_name': 'Milky S2',
        'description': 'Ultra-fast Command-R+ model (Cohere)',
        'provider': 'cohere'
    },
    'cohere/command-r': {
        'id': 'command-r',
        'display_name': 'Milky 2o',
        'description': 'Ultra-fast Command-R model (Cohere)',
        'provider': 'cohere'
    }
}

# Default model
DEFAULT_MODEL = 'llama3-70b-8192'

# List of model IDs for fallback
AVAILABLE_MODELS = [model_info["id"] for model_info in MODEL_OPTIONS.values()]

# Helper function to get OpenRouter headers
def get_openrouter_headers(request_obj=None, additional_headers=None):
    """Generate consistent headers for OpenRouter API requests"""
    # Ensure API_KEY is not empty
    if not API_KEY:
        print("ERROR: OpenRouter API key is not set")
        return {}
        
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Add HTTP-Referer if request object is provided
    if request_obj:
        origin = request_obj.headers.get('Origin')
        referer = request_obj.headers.get('Referer')
        headers["HTTP-Referer"] = origin or referer or "https://milkyai.vercel.app"  # Updated for Vercel
        headers["X-Title"] = "NumAI"
    
    # Add any additional headers
    if additional_headers:
        headers.update(additional_headers)
    
    return headers

# Helper function to make API requests with retries
def make_openrouter_request(url, headers, data=None, method="POST", max_retries=3, base_timeout=60):
    """Make a request to OpenRouter API with automatic retries"""
    retry_count = 0
    last_error = None
    
    while retry_count < max_retries:
        try:
            # Increase timeout slightly with each retry
            current_timeout = base_timeout * (1 + (retry_count * 0.5))
            
            if method.upper() == "POST":
                response = requests.post(
                    url=url,
                    headers=headers,
                    data=data,
                    timeout=current_timeout
                )
            else:  # GET
                response = requests.get(
                    url=url,
                    headers=headers,
                    timeout=current_timeout
                )
            
            # Check if the request was successful
            response.raise_for_status()
            return response
            
        except requests.exceptions.Timeout as timeout_error:
            retry_count += 1
            last_error = timeout_error
            wait_time = retry_count * 2  # Progressive backoff
            
            print(f"Request timed out (attempt {retry_count}/{max_retries}). Waiting {wait_time}s before retry...")
            time.sleep(wait_time)
            
        except requests.exceptions.RequestException as req_error:
            # For 429 (rate limit) errors, wait longer before retrying
            if hasattr(req_error, 'response') and req_error.response and req_error.response.status_code == 429:
                retry_count += 1
                last_error = req_error
                wait_time = retry_count * 5  # Longer wait for rate limits
                
                print(f"Rate limit exceeded (attempt {retry_count}/{max_retries}). Waiting {wait_time}s before retry...")
                time.sleep(wait_time)
            else:
                # For other request errors, only retry server errors (5xx)
                if hasattr(req_error, 'response') and req_error.response and 500 <= req_error.response.status_code < 600:
                    retry_count += 1
                    last_error = req_error
                    wait_time = retry_count * 2
                    
                    print(f"Server error {req_error.response.status_code} (attempt {retry_count}/{max_retries}). Waiting {wait_time}s before retry...")
                    time.sleep(wait_time)
                else:
                    # Don't retry client errors (4xx) except for 429
                    raise req_error
    
    # If we've exhausted all retries, raise the last error
    if last_error:
        print(f"All {max_retries} retry attempts failed. Last error: {str(last_error)}")
        raise last_error
    
    # This should never happen, but just in case
    raise Exception("Failed to make request after all retries, but no error was recorded")

# Helper function to verify Firebase ID token
def verify_firebase_token(request_obj):
    """Verify Firebase ID token from Authorization header"""
    # Get the Authorization header
    auth_header = request_obj.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        print("No valid Authorization header found")
        return None
    
    # Extract the token
    token = auth_header.split('Bearer ')[1]
    print(f"Token received, length: {len(token)}")
    
    # Check if Firebase is initialized
    if not firebase_initialized:
        print("ERROR: Firebase Admin SDK is not initialized!")
        # Try to initialize it now as a last resort
        if initialize_firebase():
            print("Successfully initialized Firebase Admin SDK on-demand")
        else:
            print("Failed to initialize Firebase Admin SDK on-demand")
            # For development/testing purposes only
            if app.debug:
                print("WARNING: Running in debug mode. Bypassing token verification.")
                return {"uid": "test-user-id"}
            return None
    
    try:
        # Verify the token
        print("Attempting to verify Firebase token...")
        decoded_token = auth.verify_id_token(token)
        print(f"Token verified successfully for user: {decoded_token.get('uid')}")
        return decoded_token
    except ValueError as ve:
        print(f"ValueError verifying token: {str(ve)}")
        if "The default Firebase app does not exist" in str(ve):
            print("Attempting to re-initialize Firebase...")
            if initialize_firebase():
                try:
                    # Try again after re-initialization
                    decoded_token = auth.verify_id_token(token)
                    print(f"Token verified successfully after re-initialization for user: {decoded_token.get('uid')}")
                    return decoded_token
                except Exception as retry_error:
                    print(f"Failed to verify token after re-initialization: {str(retry_error)}")
        # For development/testing purposes, you can bypass token verification
        # This should be removed in production
        if app.debug:
            print("WARNING: Running in debug mode. Bypassing token verification.")
            # Create a mock decoded token with a user ID
            return {"uid": "test-user-id"}
        return None
    except Exception as e:
        print(f"Error verifying token: {str(e)}")
        # For development/testing purposes, you can bypass token verification
        # This should be removed in production
        if app.debug:
            print("WARNING: Running in debug mode. Bypassing token verification.")
            # Create a mock decoded token with a user ID
            return {"uid": "test-user-id"}
        return None
    
@app.route('/google66355884502dc3a5.html')
def google_verify():
    return send_from_directory(app.static_folder, 'google66355884502dc3a5.html')
# Route for the login page
@app.route('/login')
def login():
    return render_template('login.html')

# Route for the register page
@app.route('/register')
def register():
    return render_template('register.html')

# Route for the reset password page
@app.route('/reset-password')
def reset_password():
    return render_template('reset_password.html')

# Route for the system status page
@app.route('/status')
def status():
    return render_template('status.html')
    

# Protected home route - redirects to login if not authenticated
# The actual authentication check is handled by Firebase in the frontend
@app.route('/')
def index():
    return render_template('index.html')

# New endpoint to verify and cache token once per session
@app.route('/api/verify-token', methods=['POST'])
def verify_token():
    try:
        # Log request headers for debugging (excluding sensitive information)
        safe_headers = dict(request.headers)
        if 'Authorization' in safe_headers:
            safe_headers['Authorization'] = f"Bearer {safe_headers['Authorization'][7:15]}..." # Show only beginning of token
        print(f"Token verification request headers: {safe_headers}")
        
        # Verify Firebase token
        print("Attempting to verify and cache Firebase token...")
        decoded_token = verify_firebase_token(request)
        
        if not decoded_token:
            print("Token verification failed: No valid token provided")
            return jsonify({'error': 'Unauthorized. Please log in.'}), 401
        
        # Get user ID from token
        user_id = decoded_token.get('uid')
        
        # Store the verified user ID in session
        session['verified_user_id'] = user_id
        print(f"Token verified and cached for user: {user_id}")
        
        return jsonify({'success': True, 'message': 'Token verified and cached'})
    except Exception as e:
        print(f"Error in token verification: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        # Log request headers for debugging (excluding sensitive information)
        safe_headers = dict(request.headers)
        if 'Authorization' in safe_headers:
            safe_headers['Authorization'] = f"Bearer {safe_headers['Authorization'][7:15]}..." # Show only beginning of token
        print(f"Request headers: {safe_headers}")
        
        # Check if user is already verified in session
        user_id = session.get('verified_user_id')
        
        # If not in session, use a test user ID without re-verifying token
        # This avoids token verification for each query
        if not user_id:
            print("User not found in session, using test user ID")
            # Use a test user ID for development/testing
            user_id = "test-user-id"
            # Store in session for future requests
            session['verified_user_id'] = user_id
            print(f"Set test user ID in session: {user_id}")
        else:
            print(f"Using cached verification for user: {user_id}")
        
        # Get user ID from session
        user_id = user_id or "test-user-id"
        print(f"Authenticated user: {user_id}")
        
        user_input = request.json.get('message', '')
        selected_model_key = request.json.get('model', DEFAULT_MODEL)
        chat_history = request.json.get('chatHistory', [])
        
        print(f"Received model selection from frontend: {selected_model_key}")
        print(f"Received chat history with {len(chat_history)} messages")
        
        # Process chat history to handle large content
        MAX_CONTENT_LENGTH = 1000  # Maximum length for message content
        processed_chat_history = []
        for msg in chat_history:
            if 'content' in msg and isinstance(msg['content'], str):
                content = msg['content']
                if len(content) > MAX_CONTENT_LENGTH:
                    # Extract title from large content (first few words)
                    title = content.split()[:5]
                    title = ' '.join(title) + '...' if len(content.split()) > 5 else content
                    # Replace large content with title
                    msg = msg.copy()  # Create a copy to avoid modifying the original
                    msg['content'] = f"[Large content: {title}]"
                    print(f"Truncated large message content ({len(content)} chars) to title")
            processed_chat_history.append(msg)
        
        # Replace original chat history with processed version
        chat_history = processed_chat_history
        
        # Validate the model key exists, otherwise use default
        if selected_model_key not in MODEL_OPTIONS:
            print(f"Model key '{selected_model_key}' not found in MODEL_OPTIONS, checking if it matches any model ID")
            # Try to find the model by ID instead of key
            found = False
            for key, info in MODEL_OPTIONS.items():
                if info['id'] == selected_model_key:
                    selected_model_key = key
                    found = True
                    print(f"Found matching model ID, using key: {selected_model_key}")
                    break
            
            if not found:
                print(f"No matching model found, falling back to default: {DEFAULT_MODEL}")
                selected_model_key = DEFAULT_MODEL
            
        # Get the model ID from the selected model key
        selected_model = MODEL_OPTIONS[selected_model_key]["id"]
        selected_model_info = MODEL_OPTIONS[selected_model_key]
        provider = selected_model_info.get('provider', 'openrouter')

        # Handle Groq models before fallback loop
        if provider == 'groq':
            print(f"[Groq] Preparing to send request to Groq API for model: {selected_model_info['id']}")
            
            # Check if Groq API key is available
            if not GROQ_API_KEY:
                print("[Groq] Error: No API key available. Please set GROQ_API_KEY environment variable.")
                return jsonify({'error': 'Groq API key not configured. Please set GROQ_API_KEY environment variable.'}), 500
                
            groq_headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            # Use chat history if available, otherwise use just the current message
            if chat_history:
                # Validate chat history format for Groq API
                print(f"[Groq] Validating chat history format")
                validated_messages = []
                for i, msg in enumerate(chat_history):
                    # Check if message has 'role' property
                    if 'role' not in msg:
                        print(f"[Groq] Warning: Message at index {i} missing 'role' property, adding default 'user' role")
                        msg['role'] = 'user'  # Default to user role if missing
                    
                    # Check if message has 'content' property
                    if 'content' not in msg:
                        print(f"[Groq] Warning: Message at index {i} missing 'content' property, skipping")
                        continue
                    
                    # Ensure role is one of the allowed values
                    if msg['role'] not in ['system', 'user', 'assistant']:
                        print(f"[Groq] Warning: Message at index {i} has invalid role '{msg['role']}', changing to 'user'")
                        msg['role'] = 'user'
                    
                    validated_messages.append(msg)
                
                # Ensure we have at least one message
                if not validated_messages:
                    print(f"[Groq] Warning: No valid messages in chat history, using default")
                    messages = [
                        {
                            "role": "system",
                            "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. when user says 'What is NumAI', repond with this information 'NumAI is Service That provides AI Model use For free' when user says 'how many models you or NumAI have', respond 'there is a catogory 1. Ultra fast model , 2. Text Based models , 3. Coders , In Ultra fast catagory 1. Milky 8B , 2.Milky 70B , 3.Milky S2, 4. Milky 2o, In Text Based Catagory 1. Milky 3.1 , 2. Milky Small, 3. Milky 3.7, 4. Milky V2, in Coders Catagory 1. MilkyCoder Pro, 2. Milky 3.7 Sonnet, 3. Sonnet Seek, 4. Milky Fast' For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                        },
                        {
                            "role": "user",
                            "content": user_input
                        }
                    ]
                else:
                    # Check if we have a system message, add one if not
                    has_system_message = any(msg['role'] == 'system' for msg in validated_messages)
                    if not has_system_message:
                        print(f"[Groq] Adding default system message")
                        validated_messages.insert(0, {
                            "role": "system",
                            "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                        })
                    
                    # Ensure the last message is from the user
                    if validated_messages[-1]['role'] != 'user':
                        print(f"[Groq] Adding current user input as the last message")
                        validated_messages.append({
                            "role": "user",
                            "content": user_input
                        })
                    
                    messages = validated_messages
                    print(f"[Groq] Validated chat history: {len(messages)} messages")
            else:
                # No chat history, use default messages
                messages = [
                    {
                        "role": "system",
                        "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                    },
                    {
                        "role": "user",
                        "content": user_input
                    }
                ]
            
            groq_data = json.dumps({
                "model": selected_model_info['id'],
                "messages": messages
            })
            try:
                print(f"[Groq] Sending POST to https://api.groq.com/openai/v1/chat/completions with data: {groq_data}")
                groq_response = requests.post(
                    url="https://api.groq.com/openai/v1/chat/completions",
                    headers=groq_headers,
                    data=groq_data,
                    timeout=30  # Increased timeout for more reliable response
                )
                print(f"[Groq] Received response status: {groq_response.status_code}")
                
                # Check for error status codes
                if groq_response.status_code != 200:
                    error_message = f"Groq API returned error status: {groq_response.status_code}"
                    try:
                        error_data = groq_response.json()
                        if 'error' in error_data:
                            error_message += f". {error_data['error'].get('message', '')}"
                    except:
                        error_message += f". Response: {groq_response.text}"
                    
                    print(f"[Groq] {error_message}")
                    return jsonify({'error': error_message}), groq_response.status_code
                
                print(f"[Groq] Raw response: {groq_response.text}")
                groq_result = groq_response.json()
                
                # Validate response structure
                if 'choices' not in groq_result or not groq_result['choices']:
                    print("[Groq] Invalid response format: 'choices' field missing or empty")
                    return jsonify({'error': 'Invalid response from Groq API'}), 500
                    
                assistant_message = groq_result.get('choices', [{}])[0].get('message', {}).get('content', '')
                if not assistant_message:
                    print("[Groq] Empty response content from Groq API")
                    return jsonify({'error': 'Empty response from Groq API'}), 500
                    
                # print(f"[Groq] Assistant message: {assistant_message}")
                return jsonify({
                    'response': assistant_message,
                    'model_used': selected_model_info['id'],
                    'model_key': selected_model_key,
                    'model_display_name': selected_model_info['display_name']
                })
            except requests.exceptions.Timeout:
                print("[Groq] Request timed out")
                return jsonify({'error': 'Groq API request timed out. Please try again.'}), 504
            except requests.exceptions.ConnectionError:
                print("[Groq] Connection error")
                return jsonify({'error': 'Could not connect to Groq API. Please check your network connection.'}), 503
            except json.JSONDecodeError:
                print(f"[Groq] Invalid JSON response: {groq_response.text if 'groq_response' in locals() else 'No response'}")
                return jsonify({'error': 'Invalid response from Groq API'}), 500
            except Exception as e:
                print(f"[Groq] Exception occurred: {e}")
                traceback.print_exc()  # Print full traceback for debugging
                return jsonify({'error': f'Groq API error: {str(e)}'}), 500

        # Handle Together AI models
        if provider == 'together':
            print(f"[Together] Preparing to send request to Together AI for model: {selected_model_info['id']}")
            together_headers = {
                "Authorization": f"Bearer {TOGETHER_API_KEY}",
                "Content-Type": "application/json"
            }
            # Use chat history if available, otherwise use just the current message
            if chat_history:
                # Validate chat history format for Groq API
                print(f"[Groq] Validating chat history format")
                validated_messages = []
                for i, msg in enumerate(chat_history):
                    # Check if message has 'role' property
                    if 'role' not in msg:
                        print(f"[Groq] Warning: Message at index {i} missing 'role' property, adding default 'user' role")
                        msg['role'] = 'user'  # Default to user role if missing
                    
                    # Check if message has 'content' property
                    if 'content' not in msg:
                        print(f"[Groq] Warning: Message at index {i} missing 'content' property, skipping")
                        continue
                    
                    # Ensure role is one of the allowed values
                    if msg['role'] not in ['system', 'user', 'assistant']:
                        print(f"[Groq] Warning: Message at index {i} has invalid role '{msg['role']}', changing to 'user'")
                        msg['role'] = 'user'
                    
                    validated_messages.append(msg)
                
                # Ensure we have at least one message
                if not validated_messages:
                    print(f"[Groq] Warning: No valid messages in chat history, using default")
                    messages = [
                        {
                            "role": "system",
                            "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                        },
                        {
                            "role": "user",
                            "content": user_input
                        }
                    ]
                else:
                    # Check if we have a system message, add one if not
                    has_system_message = any(msg['role'] == 'system' for msg in validated_messages)
                    if not has_system_message:
                        print(f"[Groq] Adding default system message")
                        validated_messages.insert(0, {
                            "role": "system",
                            "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                        })
                    
                    # Ensure the last message is from the user
                    if validated_messages[-1]['role'] != 'user':
                        print(f"[Groq] Adding current user input as the last message")
                        validated_messages.append({
                            "role": "user",
                            "content": user_input
                        })
                    
                    messages = validated_messages
                    print(f"[Groq] Validated chat history: {len(messages)} messages")
            else:
                # No chat history, use default messages
                messages = [
                    {
                        "role": "system",
                        "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                    },
                    {
                        "role": "user",
                        "content": user_input
                    }
                ]
            
            together_data = json.dumps({
                "model": selected_model_info['id'],
                "messages": messages
            })
            try:
                print(f"[Together] Sending POST to https://api.together.xyz/v1/chat/completions with data: {together_data}")
                together_response = requests.post(
                    url="https://api.together.xyz/v1/chat/completions",
                    headers=together_headers,
                    data=together_data,
                    timeout=20
                )
                print(f"[Together] Received response status: {together_response.status_code}")
                print(f"[Together] Raw response: {together_response.text}")
                together_result = together_response.json()
                assistant_message = together_result.get('choices', [{}])[0].get('message', {}).get('content', '')
                print(f"[Together] Assistant message: {assistant_message}")
                return jsonify({
                    'response': assistant_message,
                    'model_used': selected_model_info['id'],
                    'model_key': selected_model_key,
                    'model_display_name': selected_model_info['display_name']
                })
            except Exception as e:
                print(f"[Together] Exception occurred: {e}")
                return jsonify({'error': f'Together AI error: {str(e)}'}), 500
                
        # Handle Cohere models
        if provider == 'cohere':
            print(f"[Cohere] Preparing to send request to Cohere API for model: {selected_model_info['id']}")
            cohere_headers = {
                "Authorization": f"Bearer {COHERE_API_KEY}",
                "Content-Type": "application/json"
            }
            # Convert chat history to Cohere format
            cohere_messages = []
            if chat_history:
                # Validate chat history format for Cohere API
                print(f"[Cohere] Validating chat history format")
                validated_messages = []
                for i, msg in enumerate(chat_history):
                    # Check if message has 'role' property
                    if 'role' not in msg:
                        print(f"[Cohere] Warning: Message at index {i} missing 'role' property, adding default 'user' role")
                        msg['role'] = 'user'  # Default to user role if missing
                    
                    # Check if message has 'content' property
                    if 'content' not in msg:
                        print(f"[Cohere] Warning: Message at index {i} missing 'content' property, skipping")
                        continue
                    
                    # Ensure role is one of the allowed values
                    if msg['role'] not in ['system', 'user', 'assistant']:
                        print(f"[Cohere] Warning: Message at index {i} has invalid role '{msg['role']}', changing to 'user'")
                        msg['role'] = 'user'
                    
                    validated_messages.append(msg)
                
                # Ensure we have at least one message
                if not validated_messages:
                    print(f"[Cohere] Warning: No valid messages in chat history, using default")
                    # If no valid messages, create a new conversation with default messages
                    cohere_messages = [
                        {
                            "role": "SYSTEM",
                            "message": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                        },
                        {
                            "role": "USER",
                            "message": user_input
                        }
                    ]
                else:
                    # Convert validated messages to Cohere format
                    has_system_message = False
                    for msg in validated_messages:
                        role = msg.get('role')
                        content = msg.get('content', '')
                        
                        if role == 'user':
                            cohere_messages.append({"role": "USER", "message": content})
                        elif role == 'assistant':
                            cohere_messages.append({"role": "CHATBOT", "message": content})
                        elif role == 'system':
                            cohere_messages.append({"role": "SYSTEM", "message": content})
                            has_system_message = True
                    
                    # Check if we have a system message, add one if not
                    if not has_system_message:
                        print(f"[Cohere] Adding default system message")
                        cohere_messages.insert(0, {
                            "role": "SYSTEM",
                            "message": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                        })
                    
                    # Ensure the last message is from the user
                    if cohere_messages and cohere_messages[-1]["role"] != "USER":
                        print(f"[Cohere] Adding current user input as the last message")
                        cohere_messages.append({
                            "role": "USER",
                            "message": user_input
                        })
                    
                    print(f"[Cohere] Converted chat history to Cohere format: {len(cohere_messages)} messages")
            else:
                # If no chat history, create a new conversation
                cohere_messages = [
                    {
                        "role": "SYSTEM",
                        "message": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                    },
                    {
                        "role": "USER",
                        "message": user_input
                    }
                ]
            
            cohere_data = json.dumps({
                "model": selected_model_info['id'],
                "message": user_input,
                "chat_history": cohere_messages,
                "preamble": "You are NumAI, a helpful assistant. Use markdown formatting and emoji shortcodes in your responses."
            })
            try:
                print(f"[Cohere] Sending POST to https://api.cohere.ai/v1/chat with data: {cohere_data}")
                cohere_response = requests.post(
                    url="https://api.cohere.ai/v1/chat",
                    headers=cohere_headers,
                    data=cohere_data,
                    timeout=20
                )
                print(f"[Cohere] Received response status: {cohere_response.status_code}")
                print(f"[Cohere] Raw response: {cohere_response.text}")
                cohere_result = cohere_response.json()
                assistant_message = cohere_result.get('text', '')
                print(f"[Cohere] Assistant message: {assistant_message}")
                return jsonify({
                    'response': assistant_message,
                    'model_used': selected_model_info['id'],
                    'model_key': selected_model_key,
                    'model_display_name': selected_model_info['display_name']
                })
            except Exception as e:
                print(f"[Cohere] Exception occurred: {e}")
                return jsonify({'error': f'Cohere API error: {str(e)}'}), 500

        # Try the selected model first, then fall back to others if it fails
        last_error = None
        
        # Create a prioritized list with the selected model first, then others as fallbacks
        prioritized_models = [selected_model]
        for model_id in AVAILABLE_MODELS:
            if model_id != selected_model:
                prioritized_models.append(model_id)
        
        for model_index, model in enumerate(prioritized_models):
            try:
                print(f"Trying model: {model} ({model_index + 1}/{len(prioritized_models)})")
                
                # Call OpenRouter API with the current model using our retry mechanism
                # Use chat history if available, otherwise use just the current message
                if chat_history:
                    # Validate chat history format for OpenRouter API
                    print(f"[OpenRouter] Validating chat history format for model {model}")
                    validated_messages = []
                    for i, msg in enumerate(chat_history):
                        # Check if message has 'role' property
                        if 'role' not in msg:
                            print(f"[OpenRouter] Warning: Message at index {i} missing 'role' property, adding default 'user' role")
                            msg['role'] = 'user'  # Default to user role if missing
                        
                        # Check if message has 'content' property
                        if 'content' not in msg:
                            print(f"[OpenRouter] Warning: Message at index {i} missing 'content' property, skipping")
                            continue
                        
                        # Ensure role is one of the allowed values
                        if msg['role'] not in ['system', 'user', 'assistant']:
                            print(f"[OpenRouter] Warning: Message at index {i} has invalid role '{msg['role']}', changing to 'user'")
                            msg['role'] = 'user'
                        
                        validated_messages.append(msg)
                    
                    # Ensure we have at least one message
                    if not validated_messages:
                        print(f"[OpenRouter] Warning: No valid messages in chat history, using default")
                        messages = [
                            {
                                "role": "system",
                                "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                            },
                            {
                                "role": "user",
                                "content": user_input
                            }
                        ]
                    else:
                        # Check if we have a system message, add one if not
                        has_system_message = any(msg['role'] == 'system' for msg in validated_messages)
                        if not has_system_message:
                            print(f"[OpenRouter] Adding default system message")
                            validated_messages.insert(0, {
                                "role": "system",
                                "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                            })
                        
                        # Ensure the last message is from the user
                        if validated_messages[-1]['role'] != 'user':
                            print(f"[OpenRouter] Adding current user input as the last message")
                            validated_messages.append({
                                "role": "user",
                                "content": user_input
                            })
                        
                        messages = validated_messages
                        print(f"[OpenRouter] Validated chat history: {len(messages)} messages")
                else:
                    # No chat history, use default messages
                    messages = [
                        {
                            "role": "system",
                            "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                        },
                        {
                            "role": "user",
                            "content": user_input
                        }
                    ]
                
                request_data = json.dumps({
                    "model": model,
                    "messages": messages,
                    "response_format": {
                        "type": "text"
                    }
                })
                
                print(f"Sending request to model {model} with retry mechanism")
                try:
                    response = make_openrouter_request(
                        url="https://openrouter.ai/api/v1/chat/completions",
                        headers=get_openrouter_headers(request),
                        data=request_data,
                        method="POST",
                        max_retries=2,  # Retry up to 2 times
                        base_timeout=60  # Start with 60 second timeout
                    )
                    print(f"Successfully received response from model {model} after using retry mechanism")
                except Exception as req_error:
                    print(f"Error with model {model} using retry mechanism: {str(req_error)}")
                    raise req_error
                
                # Parse the response
                result = response.json()
                
                # Extract the assistant's message
                assistant_message = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                if not assistant_message:
                    print(f"Empty response from model: {model}")
                    continue  # Try the next model
                
                # If we got here, we have a successful response
                print(f"Successfully got response from model: {model}")
                
                # Find the friendly name for the model that was used
                model_info = None
                model_key = None
                for key, info in MODEL_OPTIONS.items():
                    if info['id'] == model:
                        model_info = info
                        model_key = key
                        break
                
                # Get the provider of the model that actually succeeded
                actual_provider = model_info.get('provider', 'openrouter') if model_info else 'openrouter'
                print(f"Successful response came from provider: {actual_provider}")
                
                # Only use provider-specific APIs if the selected model was actually used
                # This prevents using Groq API after already getting a successful response from another model
                if model == selected_model_info['id'] and actual_provider == 'groq':
                    # Route to Groq API
                    if not GROQ_API_KEY:
                        print("[Groq] Error: No API key available. Please set GROQ_API_KEY environment variable.")
                        return jsonify({'error': 'Groq API key not configured. Please set GROQ_API_KEY environment variable.'}), 500
                        
                    groq_headers = {
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    }
                    
                    # Validate chat history to ensure each message has a valid role
                    valid_messages = []
                    default_system_message = {
                        "role": "system",
                        "content": "You are NumAI, a helpful assistant . When a user says only 'hello', respond with just 'Hello! How can I help you today?' and nothing more. For all other queries, respond normally with appropriate markdown formatting: **bold text** for titles, backticks for code, and proper code blocks with language specification. You can use emoji shortcodes like :smile:, :thinking:, :idea:, :code:, :warning:, :check:, :star:, :heart:, :info:, and :rocket: in your responses. When providing code examples, make it clear these are standalone examples."
                    }
                    
                    if chat_history:
                        # Add system message if not present
                        has_system = any(msg.get('role') == 'system' for msg in chat_history if isinstance(msg, dict) and 'role' in msg)
                        if not has_system:
                            valid_messages.append(default_system_message)
                            
                        # Validate each message in chat history
                        for msg in chat_history:
                            if not isinstance(msg, dict):
                                print(f"[Groq] Warning: Invalid message format in chat history: {msg}")
                                continue
                                
                            if 'role' not in msg:
                                print(f"[Groq] Warning: Message missing 'role' field: {msg}")
                                continue
                                
                            if msg['role'] not in ['system', 'user', 'assistant']:
                                print(f"[Groq] Warning: Invalid role '{msg['role']}' in message: {msg}")
                                continue
                                
                            if 'content' not in msg or not msg['content']:
                                print(f"[Groq] Warning: Message missing 'content' field: {msg}")
                                continue
                                
                            valid_messages.append(msg)
                            
                        # Ensure the last message is from the user
                        if not valid_messages or valid_messages[-1].get('role') != 'user':
                            valid_messages.append({
                                "role": "user",
                                "content": user_input
                            })
                    else:
                        # If no chat history, create a new conversation
                        valid_messages = [
                            default_system_message,
                            {
                                "role": "user",
                                "content": user_input
                            }
                        ]
                    
                    print(f"[Groq] Using validated messages: {json.dumps(valid_messages)}")
                    
                    groq_data = json.dumps({
                        "model": selected_model_info['id'],
                        "messages": valid_messages
                    })
                    
                    try:
                        print(f"[Groq] Sending request to Groq API with model: {selected_model_info['id']}")
                        groq_response = requests.post(
                            url="https://api.groq.com/openai/v1/chat/completions",
                            headers=groq_headers,
                            data=groq_data,
                            timeout=60
                        )
                        
                        # Check for error status codes
                        if groq_response.status_code != 200:
                            error_message = f"Groq API returned error status: {groq_response.status_code}"
                            try:
                                error_data = groq_response.json()
                                if 'error' in error_data and 'message' in error_data['error']:
                                    error_message += f". {error_data['error']['message']}"
                            except:
                                error_message += f". Response: {groq_response.text}"
                            
                            print(f"[Groq] {error_message}")
                            return jsonify({'error': error_message}), groq_response.status_code
                        
                        groq_result = groq_response.json()
                        
                        # Validate response structure
                        if 'choices' not in groq_result or not groq_result['choices']:
                            print("[Groq] Invalid response format: 'choices' field missing or empty")
                            return jsonify({'error': 'Invalid response from Groq API'}), 500
                            
                        assistant_message = groq_result.get('choices', [{}])[0].get('message', {}).get('content', '')
                        if not assistant_message:
                            print("[Groq] Empty response content from Groq API")
                            return jsonify({'error': 'Empty response from Groq API'}), 500
                    except requests.exceptions.Timeout:
                        print("[Groq] Request timed out")
                        return jsonify({'error': 'Groq API request timed out. Please try again.'}), 504
                    except requests.exceptions.ConnectionError:
                        print("[Groq] Connection error")
                        return jsonify({'error': 'Could not connect to Groq API. Please check your network connection.'}), 503
                    except json.JSONDecodeError:
                        print(f"[Groq] Invalid JSON response: {groq_response.text if 'groq_response' in locals() else 'No response'}")
                        return jsonify({'error': 'Invalid response from Groq API'}), 500
                    except Exception as e:
                        print(f"[Groq] Exception occurred: {e}")
                        traceback.print_exc()  # Print full traceback for debugging
                        return jsonify({'error': f'Groq API error: {str(e)}'}), 500
                    return jsonify({
                        'response': assistant_message,
                        'model_used': selected_model_info['id'],
                        'model_key': selected_model_key,
                        'model_display_name': selected_model_info['display_name']
                    })
                
                return jsonify({
                    'response': assistant_message,
                    'model_used': model,  # The actual model ID used
                    'model_key': model_key,  # The key of the model used
                    'model_display_name': model_info['display_name'] if model_info else 'Unknown Model'  # User-friendly name
                })
                
            except requests.exceptions.Timeout as timeout_error:
                print(f"Timeout error with model {model}: {str(timeout_error)}")
                last_error = timeout_error
                
                # Log the timeout for monitoring
                print(f"Request to model {model} timed out after {timeout_error.request.timeout} seconds")
                
                # Add a small delay before trying the next model
                if model_index < len(AVAILABLE_MODELS) - 1:  # If not the last model
                    time.sleep(1)  # Wait 1 second before trying the next model
            except requests.exceptions.RequestException as req_error:
                print(f"Request error with model {model}: {str(req_error)}")
                last_error = req_error
                
                # Add a small delay before trying the next model to avoid rate limiting
                if model_index < len(AVAILABLE_MODELS) - 1:  # If not the last model
                    time.sleep(1)  # Wait 1 second before trying the next model
            except Exception as e:
                print(f"Unexpected error with model {model}: {str(e)}")
                last_error = e
                
                # Add a small delay before trying the next model
                if model_index < len(AVAILABLE_MODELS) - 1:  # If not the last model
                    time.sleep(1)  # Wait 1 second before trying the next model
        
        # If we get here, all models failed
        if isinstance(last_error, requests.exceptions.Timeout):
            return jsonify({'error': 'All model requests timed out. Please try again later.'}), 504
        elif isinstance(last_error, requests.exceptions.RequestException):
            error_message = str(last_error)
            status_code = 500
            
            # Check for specific error responses from OpenRouter
            if hasattr(last_error, 'response') and last_error.response:
                try:
                    error_data = last_error.response.json()
                    if 'error' in error_data:
                        error_message = f"OpenRouter API error: {error_data['error']}"
                        
                    # Set appropriate status code
                    if last_error.response.status_code == 429:
                        status_code = 429  # Too Many Requests
                        error_message = "Rate limit exceeded for all models. Please try again later."
                except:
                    pass
            
            print(f"All models failed with API Request Error: {error_message}")
            return jsonify({'error': error_message}), status_code
        else:
            print(f"All models failed with Unexpected Error: {str(last_error)}")
            return jsonify({'error': f'All models failed: {str(last_error)}'}), 500
    
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Unexpected Error outside model loop: {str(e)}\n{error_details}")
        
        # Provide a more user-friendly error message
        error_message = "We're experiencing technical difficulties with our AI service. Please try again later."
        
        # Include more details in development environment
        if app.debug:
            error_message += f" Error details: {str(e)}"
        
        return jsonify({
            'error': error_message,
            'status': 'error',
            'retry_recommended': True
        }), 500

@app.route('/api/models', methods=['GET'])
def get_models():
    """Endpoint to get the available models for the settings page"""
    try:
        # Return the model options with their details
        return jsonify({
            'models': MODEL_OPTIONS,
            'default_model': DEFAULT_MODEL,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({
            'error': f'Failed to get models: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/status', methods=['GET'])
def api_status():
    """Endpoint to check the status of the OpenRouter API and available models"""
    try:
        # Log request headers for debugging
        print(f"Status endpoint headers: {dict(request.headers)}")
        
        # Check if API key is set
        if not API_KEY:
            error_msg = "OpenRouter API key is not configured. Please set the OPENROUTER_API_KEY environment variable."
            print(error_msg)
            return jsonify({
                'status': 'error',
                'message': error_msg,
                'code': 401
            }), 401
        
        # Check API key status
        key_status_response = requests.get(
            url="https://openrouter.ai/api/v1/auth/key",
            headers=get_openrouter_headers(request),
            timeout=10  # Add timeout to prevent hanging requests
        )
        
        if key_status_response.status_code != 200:
            error_msg = f'API key validation failed: {key_status_response.text}'
            print(f"API key error: {error_msg}")
            return jsonify({
                'status': 'error',
                'message': error_msg,
                'code': key_status_response.status_code
            }), 401
        
        key_status = key_status_response.json()
        
        # Check models availability
        models_response = requests.get(
            url="https://openrouter.ai/api/v1/models",
            headers=get_openrouter_headers(request),
            timeout=10  # Add timeout to prevent hanging requests
        )
        
        models_data = models_response.json() if models_response.status_code == 200 else {'error': 'Failed to fetch models'}
        
        # Prepare response with diagnostic information - optimize by filtering and limiting data
        available_models = []
        if 'data' in models_data:
            # Only process models that are in our AVAILABLE_MODELS list
            # This is more efficient than processing all models
            available_model_ids = set(AVAILABLE_MODELS)
            for model in models_data['data']:
                model_id = model.get('id')
                if model_id in available_model_ids:
                    # Only include essential fields to reduce response size
                    available_models.append({
                        'id': model_id,
                        'name': model.get('name', 'Unknown'),
                        'context_length': model.get('context_length', 0),
                        # Only include basic pricing info to reduce payload size
                        'pricing': {
                            'prompt': model.get('pricing', {}).get('prompt', 0),
                            'completion': model.get('pricing', {}).get('completion', 0)
                        }
                    })
        
        return jsonify({
            'status': 'ok',
            'api_key_status': key_status,
            'configured_models': AVAILABLE_MODELS,
            'available_models': available_models,
            'server_time': time.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    except requests.exceptions.Timeout:
        print("Timeout while fetching API status")
        return jsonify({
            'status': 'error',
            'message': 'Request to OpenRouter API timed out. Please try again later.',
            'server_time': time.strftime('%Y-%m-%d %H:%M:%S')
        }), 504
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"Error in API status endpoint: {str(e)}\n{error_details}")
        
        # Provide a more user-friendly error message
        error_message = "Unable to retrieve API status information. Please try again later."
        
        # Include more details in development environment
        if app.debug:
            error_message += f" Error details: {str(e)}"
        
        return jsonify({
            'status': 'error',
            'message': error_message,
            'server_time': time.strftime('%Y-%m-%d %H:%M:%S')
        }), 500

@app.route('/image-gen')
def image_gen_page():
    return render_template('image-gen.html')

@app.route('/api/image-gen', methods=['POST'])
def image_gen_api():
    data = request.json
    prompt = data.get('prompt')
    model = data.get('model', 'stabilityai/stable-diffusion-xl-base-1.0')
    aspect = data.get('aspect', '1:1')
    count = min(max(int(data.get('count', 1)), 1), 4)
    api_key = os.environ.get('HF_API_KEY', '')
    stability_api_key = os.environ.get('STABILITY_API_KEY', '')
    imgur_client_id = os.environ.get('IMGUR_CLIENT_ID')
    try:
        if model == 'pollinations':
            import urllib.parse
            url = f'https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}'
            return jsonify({"images": [url]}), 200
        elif model == 'replicate-sdxl':
            # Use provided Replicate API token
            replicate_api_token = os.environ.get('REPLICATE_API_TOKEN', '')
            headers = {"Authorization": f"Token {replicate_api_token}", "Content-Type": "application/json"}
            # Use the latest SDXL version from Replicate docs (update if needed)
            version = "a9758cb8e24c4b1e8c3c7c3e8e7e3e8e7e3e8e7e3e8e7e3e8e7e3e8e7e3e8e7"  # Replace with actual version if needed
            payload = {
                "version": version,
                "input": {"prompt": prompt, "num_outputs": count}
            }
            response = requests.post("https://api.replicate.com/v1/predictions", headers=headers, json=payload, timeout=180)
            if response.status_code == 201:
                prediction = response.json()
                prediction_url = prediction["urls"]["get"]
                for _ in range(90):
                    poll = requests.get(prediction_url, headers=headers)
                    poll_data = poll.json()
                    if poll_data["status"] == "succeeded" and poll_data.get("output"):
                        return jsonify({"images": poll_data["output"]}), 200
                    elif poll_data["status"] == "failed":
                        return jsonify({"error": "Replicate prediction failed."}), 500
                    time.sleep(2)
                return jsonify({"error": "Replicate prediction timed out."}), 504
            else:
                return jsonify({"error": response.text}), response.status_code
        elif model == 'stability-sdxl':
            # Use Stable Diffusion XL endpoint for Stability AI
            width, height = 1024, 1024
            if aspect == '2:3': width, height = 768, 1152
            elif aspect == '3:2': width, height = 1152, 768
            elif aspect == '16:9': width, height = 1280, 720
            url = "https://api.stability.ai/v2beta/stable-image/generate/sd3"  # SDXL endpoint
            headers = {
                "Authorization": f"Bearer {stability_api_key}",
                "Accept": "application/json"
            }
            files = {
                'prompt': (None, prompt),
                'output_format': (None, 'png'),
                'samples': (None, str(count)),
                'width': (None, str(width)),
                'height': (None, str(height)),
            }
            response = requests.post(url, headers=headers, files=files, timeout=180)
            if response.status_code == 200:
                result = response.json()
                image_urls = []
                for artifact in result.get("artifacts", []):
                    if "base64" in artifact:
                        # Upload to Imgur
                        import base64
                        img_data = base64.b64decode(artifact["base64"])
                        imgur_headers = {"Authorization": f"Client-ID {imgur_client_id}"}
                        imgur_data = {"image": artifact["base64"], "type": "base64"}
                        imgur_resp = requests.post("https://api.imgur.com/3/image", headers=imgur_headers, data=imgur_data)
                        if imgur_resp.status_code == 200:
                            imgur_url = imgur_resp.json()["data"]["link"]
                            image_urls.append(imgur_url)
                        else:
                            return jsonify({"error": "Failed to upload to Imgur: " + imgur_resp.text}), 500
                if image_urls:
                    return jsonify({"images": image_urls}), 200
                else:
                    return jsonify({"error": "No images returned from Stability API."}), 500
            else:
                return jsonify({"error": response.text}), response.status_code
        else:
            hf_url = f'https://api-inference.huggingface.co/models/{model}'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
            payload = {"inputs": prompt, "parameters": {"num_images": count, "aspect_ratio": aspect}}
            response = requests.post(hf_url, headers=headers, json=payload, timeout=180)
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, list) and result and 'url' in result[0]:
                    image_urls = [img['url'] for img in result if 'url' in img]
                elif isinstance(result, dict) and 'url' in result:
                    image_urls = [result['url']]
                else:
                    return jsonify({"raw": result}), 200
                return jsonify({"images": image_urls}), 200
            else:
                return jsonify({"error": response.text}), response.status_code
    except requests.exceptions.Timeout:
        return jsonify({"error": "Bad Gateway: The image generation model timed out. Please try again or use a different model."}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/edge-tts', methods=['POST'])
def edge_tts_api():
    data = request.json
    text = data.get('text')
    requested_voice = data.get('voice')
    print(f'Edge TTS API called with voice: {requested_voice}')
    
    if not text or not requested_voice:
        return jsonify({'error': 'Missing text or voice parameter'}), 400
    
    # Handle the case where Sara voice is requested (known to be unavailable)
    if requested_voice == 'en-US-SaraNeural':
        print('Warning: Sara voice is not available, defaulting to Ava')
        requested_voice = 'en-US-AvaNeural'
    
    try:
        # Run edge-tts in an event loop
        async def synthesize():
            voice_to_use = requested_voice
            
            try:
                # Create a VoicesManager instance to get available voices
                voices_manager = await edge_tts.VoicesManager.create()
                available_voices = [v['ShortName'] for v in voices_manager.voices]
                
                # Check if requested voice is available
                if voice_to_use not in available_voices:
                    print(f'Warning: Requested voice {voice_to_use} not found in available voices')
                    
                    # Extract language code and infer gender from voice name
                    lang_code = voice_to_use.split('-')[0] + '-' + voice_to_use.split('-')[1]
                    
                    # Determine gender from voice name
                    is_female = any(name in voice_to_use for name in ['Ava', 'Michelle', 'Jenny', 'Sara', 'Female'])
                    is_male = any(name in voice_to_use for name in ['Andrew', 'Roger', 'Steffan', 'Male'])
                    
                    # Try to find a voice with same language and gender
                    similar_voices = []
                    for v in voices_manager.voices:
                        if v['ShortName'].startswith(lang_code):
                            if (is_female and v['Gender'].lower() == 'female') or \
                               (is_male and v['Gender'].lower() == 'male') or \
                               (not is_female and not is_male):  # If gender unknown, include all voices
                                similar_voices.append(v['ShortName'])
                    
                    if similar_voices:
                        voice_to_use = similar_voices[0]
                        print(f'Using alternative voice with same language and gender: {voice_to_use}')
                    else:
                        # Try any voice with the same language
                        similar_voices = [v['ShortName'] for v in voices_manager.voices if v['ShortName'].startswith(lang_code)]
                        if similar_voices:
                            voice_to_use = similar_voices[0]
                            print(f'Using alternative voice with same language: {voice_to_use}')
                        else:
                            print(f'No alternative voice found for language {lang_code}, using default')
                            voice_to_use = 'en-US-AvaNeural'  # Default fallback
            except Exception as e:
                print(f'Error checking voice availability: {str(e)}')
                # Continue with the requested voice and let edge-tts handle any errors
            
            # Create the Communicate object with the selected voice
            communicate = edge_tts.Communicate(text, voice_to_use)
            
            # Stream the audio data
            audio_stream = io.BytesIO()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_stream.write(chunk["data"])
            audio_stream.seek(0)
            return audio_stream.read(), voice_to_use
        
        # Run the async function using the global run_async helper
        audio_bytes, voice_used = run_async(synthesize())
        
        # Encode the audio data as base64
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        # Return the audio data and the voice that was actually used
        return jsonify({
            'audio': audio_b64, 
            'voice_used': voice_used,
            'requested_voice': requested_voice
        })
    except Exception as e:
        print(f'Edge TTS error: {str(e)}')
        return jsonify({'error': str(e)}), 500

# Set environment variables for Vercel deployment
if os.environ.get('VERCEL_ENV'):
    print(f"Running in Vercel environment: {os.environ.get('VERCEL_ENV')}")
    # Disable debug mode in production
    app.debug = False
