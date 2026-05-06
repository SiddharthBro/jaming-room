/**
 * ChatMessage Model - Manages chat messages
 */
class ChatMessage {
  constructor(messageId, userId, username, partyId, content) {
    this.messageId = messageId;
    this.userId = userId;
    this.username = username;
    this.partyId = partyId;
    this.content = content;
    this.timestamp = new Date();
  }

  toJSON() {
    return {
      messageId: this.messageId,
      userId: this.userId,
      username: this.username,
      partyId: this.partyId,
      content: this.content,
      timestamp: this.timestamp
    };
  }
}

module.exports = ChatMessage;
