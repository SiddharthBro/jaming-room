/**
 * Party Controller - Handles party operations
 */
const Party = require('../models/Party');
const { v4: uuidv4 } = require('uuid');

class PartyController {
  constructor() {
    this.parties = new Map(); // Map<partyId, Party>
  }

  /**
   * Create a new party
   */
  createParty(hostId, hostUsername, partyName) {
    const partyId = uuidv4().slice(0, 8).toUpperCase(); // Short party ID
    const party = new Party(partyId, hostId, partyName);
    this.parties.set(partyId, party);
    
    console.log(`Party created: ${partyId} by ${hostUsername}`);
    return party;
  }

  /**
   * Get party by ID
   */
  getParty(partyId) {
    return this.parties.get(partyId);
  }

  /**
   * Get all active parties (for discovery)
   */
  getAllParties() {
    return Array.from(this.parties.values()).map(party => party.getPartyInfo());
  }

  /**
   * Join a party
   */
  joinParty(partyId, userId, username, socketId) {
    const party = this.getParty(partyId);
    if (!party) {
      throw new Error('Party not found');
    }

    // Check if user already in party
    if (party.getMemberByUserId(userId)) {
      throw new Error('User already in party');
    }

    party.addMember(userId, username, socketId);
    console.log(`${username} joined party ${partyId}`);
    return party;
  }

  /**
   * Leave a party
   */
  leaveParty(partyId, socketId) {
    const party = this.getParty(partyId);
    if (!party) {
      return null;
    }

    const member = party.getMemberBySocketId(socketId);
    party.removeMember(socketId);

    // Delete party if it's empty or host left
    if (party.getMemberCount() === 0 || member?.userId === party.hostId) {
      this.parties.delete(partyId);
      console.log(`Party ${partyId} deleted`);
      return null;
    }

    // Assign new host if current host left
    if (member?.userId === party.hostId && party.getMemberCount() > 0) {
      party.hostId = party.members[0].userId;
      console.log(`New host assigned in party ${partyId}`);
    }

    console.log(`${member?.username || 'User'} left party ${partyId}`);
    return party;
  }

  /**
   * Update current track
   */
  updateCurrentTrack(partyId, track) {
    const party = this.getParty(partyId);
    if (!party) {
      throw new Error('Party not found');
    }

    party.setCurrentTrack(track);
    return party.currentTrack;
  }

  /**
   * Update playing state
   */
  updatePlayingState(partyId, isPlaying) {
    const party = this.getParty(partyId);
    if (!party) {
      throw new Error('Party not found');
    }

    party.setPlayingState(isPlaying);
    return party.isPlaying;
  }

  /**
   * Add track to playlist
   */
  addToPlaylist(partyId, track) {
    const party = this.getParty(partyId);
    if (!party) {
      throw new Error('Party not found');
    }

    party.addToPlaylist(track);
    return track;
  }

  /**
   * Get party members
   */
  getPartyMembers(partyId) {
    const party = this.getParty(partyId);
    if (!party) {
      return [];
    }

    return party.members;
  }

  /**
   * Check if user is host
   */
  isHost(partyId, userId) {
    const party = this.getParty(partyId);
    return party && party.hostId === userId;
  }

  /**
   * Get party member by socket ID
   */
  getPartyMemberBySocketId(partyId, socketId) {
    const party = this.getParty(partyId);
    if (!party) {
      return null;
    }

    return party.getMemberBySocketId(socketId);
  }
}

module.exports = new PartyController();
