import asyncio
import edge_tts
import os
import sys

async def main():
    print("Available Edge TTS English Voices:")
    print("-" * 50)
    
    try:
        # Create a VoicesManager instance using the static create method
        voices_manager = await edge_tts.VoicesManager.create()
        
        # Get all voices
        all_voices = voices_manager.voices
        
        # Filter for English US voices
        en_us_voices = []
        male_voices = []
        female_voices = []
        
        print("All English US voices:")
        for voice in all_voices:
            if 'en-US' in voice['ShortName']:
                en_us_voices.append(voice['ShortName'])
                print(f"{voice['ShortName']} - {voice['Gender']} - {voice['FriendlyName']}")
                
                if voice['Gender'].lower() == 'male':
                    male_voices.append(voice['ShortName'])
                elif voice['Gender'].lower() == 'female':
                    female_voices.append(voice['ShortName'])
        
        print("\nTotal English voices:", len(en_us_voices))
        print("Male voices:", len(male_voices))
        for v in male_voices:
            print(f"  - {v}")
        print("Female voices:", len(female_voices))
        for v in female_voices:
            print(f"  - {v}")
        
        # Check if our listed voices exist
        our_voices = [
            'en-US-AndrewNeural',
            'en-US-RogerNeural',
            'en-US-SteffanNeural',
            'en-US-AvaNeural',
            'en-US-MichelleNeural',
            'en-US-AvaMultilingualNeural',
            'en-US-JennyNeural',
            'en-US-SaraNeural'
        ]
        
        print("\nChecking our listed voices:")
        for voice in our_voices:
            if voice in en_us_voices:
                print(f"{voice} - Available")
            else:
                print(f"{voice} - NOT AVAILABLE")
        
        # Update app.py with the correct API usage
        should_update = input("\nDo you want to update app.py with the correct Edge TTS API usage? (y/n): ")
        if should_update.lower() == 'y':
            app_py_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'api', 'app.py')
            if os.path.exists(app_py_path):
                with open(app_py_path, 'r') as f:
                    content = f.read()
                
                # Update the Edge TTS API code
                updated_content = content.replace(
                    "async def synthesize():\n            communicate = edge_tts.Communicate(text, voice)",
                    "async def synthesize():\n            # Check if the requested voice is valid\n            voices_manager = await edge_tts.VoicesManager.create()\n            available_voices = [v['ShortName'] for v in voices_manager.voices]\n            \n            # Check if requested voice is available\n            if voice not in available_voices:\n                print(f'Warning: Requested voice {voice} not found in available voices')\n                # Find a similar voice (same language and gender)\n                lang_code = voice.split('-')[0] + '-' + voice.split('-')[1]\n                gender = 'Female' if any(g in voice for g in ['Ava', 'Michelle', 'Jenny', 'Sara']) else 'Male'\n                similar_voices = [v['ShortName'] for v in voices_manager.voices if v['ShortName'].startswith(lang_code) and v['Gender'] == gender]\n                if similar_voices:\n                    voice = similar_voices[0]\n                    print(f'Using alternative voice: {voice}')\n                else:\n                    # Try any voice with the same language\n                    similar_voices = [v['ShortName'] for v in voices_manager.voices if v['ShortName'].startswith(lang_code)]\n                    if similar_voices:\n                        voice = similar_voices[0]\n                        print(f'Using alternative voice with same language: {voice}')\n                    else:\n                        print(f'No alternative voice found for language {lang_code}, using default')\n                        voice = 'en-US-AvaNeural'  # Default fallback\n            \n            communicate = edge_tts.Communicate(text, voice)"
                )
                
                with open(app_py_path, 'w') as f:
                    f.write(updated_content)
                
                print(f"Updated {app_py_path} with correct Edge TTS API usage")
            else:
                print(f"Could not find {app_py_path}")
    except Exception as e:
        print(f"Error: {e}")
        print("\nTrying alternative approach...")
        
        # Try direct API call
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get("https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4") as response:
                voices = await response.json()
                
                # Filter for English US voices
                en_us_voices = []
                male_voices = []
                female_voices = []
                
                print("All English US voices:")
                for voice in voices:
                    if 'en-US' in voice.get('ShortName', ''):
                        en_us_voices.append(voice['ShortName'])
                        gender = voice.get('Gender', 'Unknown')
                        print(f"{voice['ShortName']} - {gender} - {voice.get('FriendlyName', 'Unknown')}")
                        
                        if gender.lower() == 'male':
                            male_voices.append(voice['ShortName'])
                        elif gender.lower() == 'female':
                            female_voices.append(voice['ShortName'])
                
                print("\nTotal English voices:", len(en_us_voices))
                print("Male voices:", len(male_voices))
                for v in male_voices:
                    print(f"  - {v}")
                print("Female voices:", len(female_voices))
                for v in female_voices:
                    print(f"  - {v}")
                
                # Check if our listed voices exist
                our_voices = [
                    'en-US-AndrewNeural',
                    'en-US-RogerNeural',
                    'en-US-SteffanNeural',
                    'en-US-AvaNeural',
                    'en-US-MichelleNeural',
                    'en-US-AvaMultilingualNeural',
                    'en-US-JennyNeural',
                    'en-US-SaraNeural'
                ]
                
                print("\nChecking our listed voices:")
                for voice in our_voices:
                    if voice in en_us_voices:
                        print(f"{voice} - Available")
                    else:
                        print(f"{voice} - NOT AVAILABLE")

if __name__ == "__main__":
    asyncio.run(main())