// Get room name (m.room.name) by roomId
async function getRoomName(roomId) {
  if (!this.accessToken || !roomId) return roomId;

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );
    if (!res.ok) return roomId;
    const data = await res.json();
    return data.name || roomId;
  } catch {
    return roomId;
  }
}

// Send a plain text message to the current room
async function sendMessage() {
  if (!this.accessToken || !this.roomId) return;
  const body = (this.newMessage || '').trim();
  if (!body) return;

  try {
    const txnId = Date.now();
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/send/m.room.message/${txnId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ msgtype: 'm.text', body })
      }
    );
    const data = await res.json();
    if (data.errcode) {
      this.error = 'Send failed: ' + (data.error || data.errcode);
      return;
    }

    this.newMessage = '';
    await this.fetchMessages();
  } catch (e) {
    this.error = 'Send message error: ' + e.message;
  }
}

// Fetch new messages using /sync (incremental via lastSyncToken)
async function fetchMessages() {
  if (!this.accessToken || !this.roomId) return;

  try {
    const params = new URLSearchParams();
    params.set('timeout', '0');
    if (this.lastSyncToken) params.set('since', this.lastSyncToken);
    // Keep the response smaller
    params.set(
      'filter',
      JSON.stringify({ room: { timeline: { limit: 20 }, state: { lazy_load_members: true } } })
    );

    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/sync?${params.toString()}`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );

    const data = await res.json();
    if (data.errcode) {
      this.error = 'Sync failed: ' + (data.error || data.errcode);
      return;
    }

    // Update token for next incremental sync
    if (data.next_batch) this.lastSyncToken = data.next_batch;

    // Extract timeline events for the current room
    const join = data.rooms && data.rooms.join && data.rooms.join[this.roomId];
    const events = (join && join.timeline && join.timeline.events) ? join.timeline.events : [];

    const newMessages = events
      .filter((e) => e.type === 'm.room.message' && e.content && e.content.msgtype === 'm.text')
      .map((e) => ({
        eventId: e.event_id,
        sender: e.sender,
        body: e.content.body,
        timestamp: e.origin_server_ts
      }));

    // Append messages (since token ensures they are new)
    this.messages = [...this.messages, ...newMessages];
  } catch (e) {
    console.error('Fetch messages error:', e);
  }
}