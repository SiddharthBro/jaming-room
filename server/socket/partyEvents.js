/**
 * Party Socket Events Handler
 */
const partyController = require('../controllers/partyController');
const chatController = require('../controllers/chatController');

module.exports = (io, socket) => {
  /**
   * Create Party Event
   */
  socket.on('create-party', (data, callback) => {
    try {
      const { userId, username, partyName } = data;

      const party = partyController.createParty(userId, username, partyName);
      party.addMember(userId, username, socket.id);

      socket.join(`party_${party.partyId}`);
      socket.join(`party_${party.partyId}_chat`);

      // Store party info in socket
      socket.partyId = party.partyId;
      socket.userId = userId;
      socket.username = username;

      callback({
        success: true,
        party: party.getPartyInfo(),
        message: 'Party created successfully'
      });

      console.log(`Host created party: ${party.partyId}`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Join Party Event
   */
  socket.on('join-party', (data, callback) => {
    try {
      const { partyId, userId, username } = data;

      const party = partyController.joinParty(partyId, userId, username, socket.id);

      socket.join(`party_${partyId}`);
      socket.join(`party_${partyId}_chat`);

      // Store party info in socket
      socket.partyId = partyId;
      socket.userId = userId;
      socket.username = username;

      // Get chat history for new member
      const chatHistory = chatController.getChatHistory(partyId);

      callback({
        success: true,
        party: party.getPartyInfo(),
        members: partyController.getPartyMembers(partyId),
        chatHistory: chatHistory,
        message: 'Joined party successfully'
      });

      // Notify other members
      io.to(`party_${partyId}`).emit('member-joined', {
        username: username,
        memberCount: party.getMemberCount(),
        members: partyController.getPartyMembers(partyId)
      });

      console.log(`User joined party: ${partyId} - ${username}`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Get Available Parties
   */
  socket.on('get-parties', (callback) => {
    try {
      const parties = partyController.getAllParties();
      callback({
        success: true,
        parties: parties
      });
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Get Party Details
   */
  socket.on('get-party', (data, callback) => {
    try {
      const { partyId } = data;
      const party = partyController.getParty(partyId);

      if (!party) {
        return callback({
          success: false,
          message: 'Party not found'
        });
      }

      callback({
        success: true,
        party: party.getPartyInfo(),
        members: partyController.getPartyMembers(partyId)
      });
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Play Music Event
   */
  socket.on('play-music', (data, callback) => {
    try {
      const { partyId, track } = data;

      // Only host can play music
      if (!partyController.isHost(partyId, socket.userId)) {
        return callback({
          success: false,
          message: 'Only host can control playback'
        });
      }

      partyController.updateCurrentTrack(partyId, track);
      partyController.updatePlayingState(partyId, true);

      io.to(`party_${partyId}`).emit('music-playing', {
        track: track,
        timestamp: Date.now()
      });

      callback({
        success: true,
        message: 'Music started'
      });

      console.log(`Music playing in party ${partyId}: ${track.title}`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Pause Music Event
   */
  socket.on('pause-music', (data, callback) => {
    try {
      const { partyId } = data;

      // Only host can pause music
      if (!partyController.isHost(partyId, socket.userId)) {
        return callback({
          success: false,
          message: 'Only host can control playback'
        });
      }

      partyController.updatePlayingState(partyId, false);

      io.to(`party_${partyId}`).emit('music-paused', {
        timestamp: Date.now()
      });

      callback({
        success: true,
        message: 'Music paused'
      });

      console.log(`Music paused in party ${partyId}`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Sync Music Time Event
   */
  socket.on('sync-music-time', (data, callback) => {
    try {
      const { partyId, currentTime } = data;

      io.to(`party_${partyId}`).emit('music-time-sync', {
        currentTime: currentTime,
        timestamp: Date.now()
      });

      callback({
        success: true,
        message: 'Time synced'
      });
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Add to Playlist
   */
  socket.on('add-to-playlist', (data, callback) => {
    try {
      const { partyId, track } = data;

      partyController.addToPlaylist(partyId, track);

      io.to(`party_${partyId}`).emit('playlist-updated', {
        track: track,
        playlistLength: partyController.getParty(partyId).getPlaylistLength()
      });

      callback({
        success: true,
        message: 'Track added to playlist'
      });

      console.log(`Track added to playlist in party ${partyId}: ${track.title}`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Disconnect from party
   */
  socket.on('disconnect', () => {
    if (socket.partyId) {
      const party = partyController.leaveParty(socket.partyId, socket.id);

      if (party) {
        // Notify remaining members
        io.to(`party_${socket.partyId}`).emit('member-left', {
          username: socket.username,
          memberCount: party.getMemberCount(),
          members: partyController.getPartyMembers(socket.partyId)
        });
      } else {
        // Party was deleted
        io.emit('party-deleted', {
          partyId: socket.partyId
        });
      }

      console.log(`User disconnected from party: ${socket.partyId}`);
    }
  });
};
