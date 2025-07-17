// Custom SVG Emojis for NumAI
const customEmojis = {
    // Basic emotions
    'smile': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>`,
    'thinking': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 15h8"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line><circle cx="17" cy="4" r="2"></circle></svg>`,
    'idea': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2v4"></path><path d="M12 12v4"></path><path d="M12 6a6 6 0 0 0-6 6c0 4 3 5 6 8 3-3 6-4 6-8a6 6 0 0 0-6-6z"></path></svg>`,
    'code': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
    'warning': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    'check': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    'star': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    'heart': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`,
    'info': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    'rocket': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>`,
    
    // Additional common emojis
    'pencil': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
    'thumbsup': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`,
    'thumbsdown': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>`,
    'fire': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>`,
    'bulb': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2v4"></path><path d="M12 12v4"></path><path d="M12 6a6 6 0 0 0-6 6c0 4 3 5 6 8 3-3 6-4 6-8a6 6 0 0 0-6-6z"></path></svg>`,
    
    // Body parts from user's list
    'eyes': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    'hand': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0 1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0 1a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5.5a8 8 0 0 0 8 8h0a8 8 0 0 0 8-8V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"></path></svg>`,
    'point_up': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6"></path><path d="M12 18v4"></path><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg>`,
    'ok_hand': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.24 6.15a1 1 0 0 0-1.47.38l-2.5 5.5a1 1 0 0 0 1.83.83l2.5-5.5a1 1 0 0 0-.36-1.2z"></path><path d="M14.73 13.31l-5.5-2.5a1 1 0 0 0-.83 1.83l5.5 2.5a1 1 0 0 0 .83-1.83z"></path><path d="M8.73 13.31l-1.5-.68a1 1 0 0 0-.83 1.83l1.5.68a1 1 0 0 0 .83-1.83z"></path><path d="M12.24 18.15a1 1 0 0 0-1.47.38l-2.5 5.5a1 1 0 0 0 1.83.83l2.5-5.5a1 1 0 0 0-.36-1.2z"></path></svg>`,
    'pray': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6"></path><path d="M12 18v4"></path><path d="M4 12h16"></path><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"></path><path d="M12 12a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"></path></svg>`,
    
    // Face expressions
    'hugging_face': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line><path d="M17 3.34a10 10 0 0 1 0 17.32"></path><path d="M7 3.34a10 10 0 0 0 0 17.32"></path></svg>`,
    'face_with_tears_of_joy': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line><path d="M19 4l-3 3"></path><path d="M5 4l3 3"></path></svg>`
};

// Function to replace emoji shortcodes with SVG
function replaceEmojis(text) {
    // Replace emoji shortcodes like :smile: with the corresponding SVG
    // Improved regex to match emoji codes more accurately
    return text.replace(/:([a-zA-Z0-9_-]+):/g, (match, code) => {
        // Check if we have this emoji in our collection
        if (customEmojis[code]) {
            return `<span class="custom-emoji" title="${code}">${customEmojis[code]}</span>`;
        }
        
        // Try alternative forms (for flexibility)
        const alternatives = {
            // Basic alternatives
            'thumbs_up': 'thumbsup',
            'thumbs_down': 'thumbsdown',
            'lightbulb': 'bulb',
            'light_bulb': 'bulb',
            'pen': 'pencil',
            'write': 'pencil',
            'flame': 'fire',
            'happy': 'smile',
            'smiley': 'smile',
            'grinning': 'grin',
            'think': 'thinking',
            'thought': 'thinking',
            'tick': 'check',
            'success': 'check',
            'done': 'check',
            'complete': 'check',
            'alert': 'warning',
            'caution': 'warning',
            'danger': 'warning',
            'information': 'info',
            'help': 'info',
            'love': 'heart',
            'like': 'heart',
            'code_block': 'code',
            'coding': 'code',
            'program': 'code',
            'launch': 'rocket',
            'spaceship': 'rocket',
            'important': 'star',
            'favorite': 'star',
            
            // Body part alternatives
            'eye': 'eyes',
            'look': 'eyes',
            'see': 'eyes',
            'lips': 'mouth',
            'speak': 'mouth',
            'smell': 'nose',
            'lick': 'tongue',
            'listen': 'ear',
            'hearing': 'ear',
            'feet': 'foot',
            'palm': 'hand',
            'finger': 'hand',
            'up': 'point_up',
            'down': 'point_down',
            'left': 'point_left',
            'right': 'point_right',
            'okay': 'ok_hand',
            'raise_hand': 'raised_hand',
            'victory': 'victory_hand',
            'peace': 'victory_hand',
            'fingers_crossed': 'crossed_fingers',
            'love_you': 'love_you_gesture',
            'applause': 'clap',
            'wave': 'waving_hand',
            'muscle': 'flexed_biceps',
            'strong': 'flexed_biceps',
            'self': 'selfie',
            'prayer': 'pray',
            'please': 'pray',
            'kneel': 'kneeling',
            'hug': 'hugging_face',
            
            // Face expression alternatives
            'zip': 'zipper_mouth_face',
            'silent': 'zipper_mouth_face',
            'money': 'money_mouth_face',
            'rich': 'money_mouth_face',
            'cover_mouth': 'face_with_hand_over_mouth',
            'shush': 'shushing_face',
            'quiet': 'shushing_face',
            'open_mouth': 'face_with_open_mouth',
            'gasp': 'face_with_open_mouth',
            'scream': 'face_screaming_in_fear',
            'fear': 'face_screaming_in_fear',
            'confused': 'confused_face',
            'disappointed': 'disappointed_face',
            'sad_face': 'disappointed_face',
            'worried': 'worried_face',
            'concern': 'worried_face',
            'steam': 'face_withSteam_from_nose',
            'angry_face': 'face_withSteam_from_nose',
            'joy': 'face_with_tears_of_joy',
            'laugh': 'face_with_tears_of_joy',
            'hearts': 'smiling_face_with_hearts',
            'love_face': 'smiling_face_with_hearts',
            'kiss': 'face_blowing_a_kiss',
            'blow_kiss': 'face_blowing_a_kiss',
            'cat': 'smiling_cat',
            'cat_smile': 'smiling_cat'
        };
        
        if (alternatives[code] && customEmojis[alternatives[code]]) {
            return `<span class="custom-emoji" title="${code}">${customEmojis[alternatives[code]]}</span>`;
        }
        
        // If still not found, return a more user-friendly representation
        // instead of showing the raw shortcode
        return `<span class="emoji-text">:${code}:</span>`;
    });
}

// Expose the replaceEmojis function to the global window object
// This allows it to be accessed from other scripts
window.replaceEmojis = replaceEmojis;