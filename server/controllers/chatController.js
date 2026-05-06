/**
 * Chat Controller - Handles chat operations
 */
const ChatMessage = require('../models/ChatMessage');
const { v4: uuidv4 } = require('uuid');

class ChatController {
  constructor() {
    this.messages = new Map(); // Map<partyId, Array<ChatMessage>>
    this.messageHistory = 50; // Store last 50 messages per party
  }

  /**
   * Create a new message
   */
  createMessage(userId, username, partyId, content) {
    const messageId = uuidv4();
    const message = new ChatMessage(messageId, userId, username, partyId, content);

    // Initialize party messages if not exists
    if (!this.messages.has(partyId)) {
      this.messages.set(partyId, []);
    }

    // Add message and maintain history limit
    const partyMessages = this.messages.get(partyId);
    partyMessages.push(message);

    if (partyMessages.length > this.messageHistory) {
      partyMessages.shift();
    }

    console.log(`Chat message in party ${partyId}: ${username}: ${content}`);
    return message;
  }

  /**
   * Get chat history for a party
   */
  getChatHistory(partyId) {
    const messages = this.messages.get(partyId) || [];
    return messages.map(msg => msg.toJSON());
  }

  /**
   * Clear chat for a party
   */
  clearChatHistory(partyId) {
    this.messages.delete(partyId);
  }

  /**
   * Get message by ID
   */
  getMessageById(messageId, partyId) {
    const messages = this.messages.get(partyId) || [];
    return messages.find(msg => msg.messageId === messageId);
  }

  /**
   * Get latest N messages for a party
   */
  getLatestMessages(partyId, count = 20) {
    const messages = this.messages.get(partyId) || [];
    return messages.slice(-count).map(msg => msg.toJSON());
  }
}

module.exports = new ChatController();
