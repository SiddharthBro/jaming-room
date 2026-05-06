/**
 * Chat Socket Events Handler
 */
const chatController = require('../controllers/chatController');

module.exports = (io, socket) => {
  /**
   * Send Chat Message
   */
  socket.on('send-message', (data, callback) => {
    try {
      const { partyId, content } = data;
      const { userId, username } = socket;

      if (!partyId || !content.trim()) {
        return callback({
          success: false,
          message: 'Invalid message'
        });
      }

      // Sanitize content (basic)
      const sanitizedContent = content.trim().substring(0, 500);

      const message = chatController.createMessage(
        userId,
        username,
        partyId,
        sanitizedContent
      );

      // Broadcast message to party
      io.to(`party_${partyId}_chat`).emit('new-message', {
        messageId: message.messageId,
        userId: message.userId,
        username: message.username,
        content: message.content,
        timestamp: message.timestamp
      });

      callback({
        success: true,
        message: 'Message sent'
      });
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Get Chat History
   */
  socket.on('get-chat-history', (data, callback) => {
    try {
      const { partyId } = data;

      const history = chatController.getChatHistory(partyId);

      callback({
        success: true,
        messages: history
      });
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * User Typing Indicator
   */
  socket.on('user-typing', (data) => {
    try {
      const { partyId } = data;
      const { username } = socket;

      io.to(`party_${partyId}_chat`).emit('user-typing', {
        username: username,
        isTyping: true
      });
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  });

  /**
   * User Stopped Typing
   */
  socket.on('user-stop-typing', (data) => {
    try {
      const { partyId } = data;
      const { username } = socket;

      io.to(`party_${partyId}_chat`).emit('user-typing', {
        username: username,
        isTyping: false
      });
    } catch (error) {
      console.error('Stop typing error:', error);
    }
  });
};
