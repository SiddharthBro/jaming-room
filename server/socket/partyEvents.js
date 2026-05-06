/**
 * Party Socket Events Handler with YouTube Sync
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
   * Play YouTube Music Event
   * Sends server timestamp for synchronized playback
   */
  socket.on('play-youtube', (data, callback) => {
    try {
      const { partyId, youtubeUrl, videoTitle, videoDuration, videoId } = data;

      // Only host can play music
      if (!partyController.isHost(partyId, socket.userId)) {
        return callback({
          success: false,
          message: 'Only host can control playback'
        });
      }

      const track = {
        type: 'youtube',
        youtubeUrl: youtubeUrl,
        videoId: videoId,
        title: videoTitle,
        duration: videoDuration,
        addedBy: socket.username
      };

      partyController.updateCurrentTrack(partyId, track);
      partyController.updatePlayingState(partyId, true);

      // Server timestamp for perfect sync
      const serverTimestamp = Date.now();

      // Broadcast to all party members with server timestamp
      io.to(`party_${partyId}`).emit('youtube-play', {
        youtubeUrl: youtubeUrl,
        videoId: videoId,
        videoTitle: videoTitle,
        videoDuration: videoDuration,
        serverTimestamp: serverTimestamp,
        hostId: socket.userId,
        currentTime: 0
      });

      callback({
        success: true,
        message: 'YouTube video started',
        serverTimestamp: serverTimestamp
      });

      console.log(`YouTube playing in party ${partyId}: ${videoTitle}`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Pause YouTube Event
   */
  socket.on('pause-youtube', (data, callback) => {
    try {
      const { partyId, currentTime } = data;

      // Only host can pause music
      if (!partyController.isHost(partyId, socket.userId)) {
        return callback({
          success: false,
          message: 'Only host can control playback'
        });
      }

      partyController.updatePlayingState(partyId, false);

      const serverTimestamp = Date.now();

      // Broadcast pause to all party members
      io.to(`party_${partyId}`).emit('youtube-paused', {
        currentTime: currentTime,
        serverTimestamp: serverTimestamp,
        pausedAt: currentTime
      });

      callback({
        success: true,
        message: 'YouTube video paused'
      });

      console.log(`YouTube paused in party ${partyId} at ${currentTime}s`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Resume YouTube Event
   */
  socket.on('resume-youtube', (data, callback) => {
    try {
      const { partyId, currentTime } = data;

      // Only host can resume music
      if (!partyController.isHost(partyId, socket.userId)) {
        return callback({
          success: false,
          message: 'Only host can control playback'
        });
      }

      partyController.updatePlayingState(partyId, true);

      const serverTimestamp = Date.now();

      // Broadcast resume to all party members
      io.to(`party_${partyId}`).emit('youtube-resumed', {
        currentTime: currentTime,
        serverTimestamp: serverTimestamp
      });

      callback({
        success: true,
        message: 'YouTube video resumed'
      });

      console.log(`YouTube resumed in party ${partyId}`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Sync YouTube Time - Critical for perfect synchronization
   * Host sends periodic time updates to keep all clients in sync
   */
  socket.on('sync-youtube-time', (data, callback) => {
    try {
      const { partyId, currentTime } = data;

      const serverTimestamp = Date.now();

      // Broadcast time sync to all party members
      io.to(`party_${partyId}`).emit('youtube-time-sync', {
        currentTime: currentTime,
        serverTimestamp: serverTimestamp,
        tolerance: 500 // Tolerance in milliseconds (±0.5 seconds)
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
   * Seek YouTube - Host seeks to specific position
   */
  socket.on('seek-youtube', (data, callback) => {
    try {
      const { partyId, seekTime } = data;

      // Only host can seek
      if (!partyController.isHost(partyId, socket.userId)) {
        return callback({
          success: false,
          message: 'Only host can seek'
        });
      }

      const serverTimestamp = Date.now();

      // Broadcast seek to all party members
      io.to(`party_${partyId}`).emit('youtube-seek', {
        seekTime: seekTime,
        serverTimestamp: serverTimestamp
      });

      callback({
        success: true,
        message: 'Seeked to ' + seekTime + 's'
      });

      console.log(`YouTube seeked in party ${partyId} to ${seekTime}s`);
    } catch (error) {
      callback({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Change YouTube Video - Host changes to next/previous video
   */
  socket.on('change-youtube-video', (data, callback) => {
    try {
      const { partyId, youtubeUrl, videoTitle, videoDuration, videoId } = data;

      // Only host can change video
      if (!partyController.isHost(partyId, socket.userId)) {
        return callback({
          success: false,
          message: 'Only host can change video'
        });
      }

      const track = {
        type: 'youtube',
        youtubeUrl: youtubeUrl,
        videoId: videoId,
        title: videoTitle,
        duration: videoDuration,
        addedBy: socket.username
      };

      partyController.updateCurrentTrack(partyId, track);

      const serverTimestamp = Date.now();

      // Broadcast video change to all party members
      io.to(`party_${partyId}`).emit('youtube-video-changed', {
        youtubeUrl: youtubeUrl,
        videoId: videoId,
        videoTitle: videoTitle,
        videoDuration: videoDuration,
        serverTimestamp: serverTimestamp,
        currentTime: 0
      });

      callback({
        success: true,
        message: 'Video changed'
      });

      console.log(`YouTube video changed in party ${partyId}: ${videoTitle}`);
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
      const { partyId, youtubeUrl, videoTitle, videoDuration, videoId } = data;

      const track = {
        type: 'youtube',
        youtubeUrl: youtubeUrl,
        videoId: videoId,
        title: videoTitle,
        duration: videoDuration,
        addedBy: socket.username
      };

      partyController.addToPlaylist(partyId, track);

      io.to(`party_${partyId}`).emit('playlist-updated', {
        track: track,
        playlistLength: partyController.getParty(partyId).getPlaylistLength()
      });

      callback({
        success: true,
        message: 'Track added to playlist'
      });

      console.log(`Track added to playlist in party ${partyId}: ${videoTitle}`);
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
