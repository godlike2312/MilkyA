// Firebase Chat Configuration

// Using the same Firebase configuration as auth.js
// No need to initialize a separate Firebase app instance
// We'll use the existing Firebase app from auth.js

// Get the Firestore instance from the existing Firebase app
const chatDb = firebase.firestore();

// Enable offline persistence
try {
    chatDb.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('Firestore persistence enabled successfully');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a time
                console.warn('Firestore persistence could not be enabled: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                // The current browser does not support all of the features required for persistence
                console.warn('Firestore persistence is not available in this browser');
            } else {
                console.error('Error enabling Firestore persistence:', err);
            }
        });
} catch (e) {
    console.error('Exception when enabling Firestore persistence:', e);
}

// Function to generate a random UUID similar to the example format
function generateUUID() {
    // Generate a UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where x is any hexadecimal digit and y is one of 8, 9, A, or B
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).replace(/-/g, ''); // Remove hyphens to match the example format
}

// Function to create a new chat
async function createNewChat(userId, firstMessage = null) {
    try {
        const timestamp = firebase.firestore.FieldValue.serverTimestamp();
        const title = firstMessage ? generateChatTitle(firstMessage) : 'New Chat';
        
        // Generate a custom ID for the chat
        const customChatId = generateUUID();
        
        // Use the custom ID when creating the document
        const chatRef = chatDb.collection('chats').doc(customChatId);
        
        await chatRef.set({
            userId: userId,
            title: title,
            createdAt: timestamp,
            lastUpdated: timestamp,
            messageCount: 0
        });
        
        // If there's a first message, add it to the messages subcollection
        if (firstMessage) {
            await saveMessageToChat(customChatId, firstMessage);
        }
        
        return customChatId;
    } catch (error) {
        console.error('Error creating new chat:', error);
        return null;
    }
}

// Function to generate a title from the first message
function generateChatTitle(message) {
    // Limit title to first 30 characters of the message
    if (!message || !message.content) return 'New Chat';
    
    const content = message.content.trim();
    if (content.length <= 30) return content;
    return content.substring(0, 27) + '...';
}

// Function to save a message to a chat
async function saveMessageToChat(chatId, messageData) {
    try {
        const chatRef = chatDb.collection('chats').doc(chatId);
        const chat = await chatRef.get();
        
        if (!chat.exists) {
            console.error('Chat not found');
            return false;
        }
        
        // Add timestamp if not present
        if (!messageData.timestamp) {
            messageData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        // Add message to the messages subcollection
        await chatRef.collection('messages').add(messageData);
        
        // Update the parent chat document
        await chatRef.update({
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            messageCount: firebase.firestore.FieldValue.increment(1)
        });
        
        return true;
    } catch (error) {
        console.error('Error saving message:', error);
        return false;
    }
}

// Function to get all chats for a user
async function getUserChats(userId) {
    try {
        const chatsSnapshot = await chatDb.collection('chats')
            .where('userId', '==', userId)
            .orderBy('lastUpdated', 'desc')
            .get();
        
        const chats = [];
        chatsSnapshot.forEach(doc => {
            const chatData = doc.data();
            chats.push({
                id: doc.id,
                title: chatData.title,
                createdAt: chatData.createdAt,
                lastUpdated: chatData.lastUpdated,
                messageCount: chatData.messageCount || 0
            });
        });
        
        return chats;
    } catch (error) {
        console.error('Error getting user chats:', error);
        return [];
    }
}

// Function to get a specific chat (without messages)
async function getChat(chatId) {
    try {
        const chatDoc = await chatDb.collection('chats').doc(chatId).get();
        
        if (!chatDoc.exists) {
            console.error('Chat not found');
            return null;
        }
        
        return {
            id: chatDoc.id,
            ...chatDoc.data()
        };
    } catch (error) {
        console.error('Error getting chat:', error);
        return null;
    }
}

// Function to load messages for a specific chat
async function getChatMessages(chatId, limit = 50) {
    try {
        const messagesSnapshot = await chatDb.collection('chats').doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(limit)
            .get();
        
        const messages = [];
        messagesSnapshot.forEach(doc => {
            messages.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return messages;
    } catch (error) {
        console.error('Error getting chat messages:', error);
        return [];
    }
}

// Function to rename a chat
async function renameChat(chatId, newTitle) {
    try {
        await chatDb.collection('chats').doc(chatId).update({
            title: newTitle,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error renaming chat:', error);
        return false;
    }
}

// Function to delete a chat
async function deleteChat(chatId) {
    try {
        await chatDb.collection('chats').doc(chatId).delete();
        return true;
    } catch (error) {
        console.error('Error deleting chat:', error);
        return false;
    }
}