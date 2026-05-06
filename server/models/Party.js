/**
 * Party Model - Manages party/room data
 */
class Party {
  constructor(partyId, hostId, partyName) {
    this.partyId = partyId;
    this.hostId = hostId;
    this.partyName = partyName;
    this.members = []; // Array of {userId, username, socketId}
    this.currentTrack = null; // {url, title, duration, startTime}
    this.isPlaying = false;
    this.currentTime = 0;
    this.playlist = []; // Array of tracks
    this.createdAt = new Date();
  }

  addMember(userId, username, socketId) {
    const member = { userId, username, socketId };
    this.members.push(member);
    return member;
  }

  removeMember(socketId) {
    const initialLength = this.members.length;
    this.members = this.members.filter(m => m.socketId !== socketId);
    return initialLength !== this.members.length;
  }

  getMemberBySocketId(socketId) {
    return this.members.find(m => m.socketId === socketId);
  }

  getMemberByUserId(userId) {
    return this.members.find(m => m.userId === userId);
  }

  setCurrentTrack(track) {
    this.currentTrack = {
      ...track,
      startTime: Date.now()
    };
  }

  setPlayingState(isPlaying) {
    this.isPlaying = isPlaying;
    if (isPlaying) {
      this.currentTrack.startTime = Date.now();
    }
  }

  addToPlaylist(track) {
    this.playlist.push(track);
  }

  getPlaylistLength() {
    return this.playlist.length;
  }

  getMemberCount() {
    return this.members.length;
  }

  getPartyInfo() {
    return {
      partyId: this.partyId,
      partyName: this.partyName,
      hostId: this.hostId,
      memberCount: this.getMemberCount(),
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      playlistLength: this.getPlaylistLength(),
      createdAt: this.createdAt
    };
  }
}

module.exports = Party;
