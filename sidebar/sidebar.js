async function createRoom() {
  if (!this.newRoomName.trim()) return;
  try {
    const res = await fetch('https://matrix.org/_matrix/client/r0/createRoom', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`
      },
      body: JSON.stringify({ preset: 'private_chat', name: this.newRoomName.trim() })
    });
    const data = await res.json();
    if (data.room_id) {
      this.newRoomId = data.room_id;
      await this.fetchRoomsWithNames();
      this.newRoomName = '';
      this.switchRoom(data.room_id);
    }
  } catch (e) {
    alert('Error creating room: ' + e.message);
  }
}

async function fetchRoomsWithNames() {
  if (!this.accessToken) return;
  try {
    const res = await fetch('https://matrix.org/_matrix/client/r0/joined_rooms', {
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
    const data = await res.json();
    if (data.joined_rooms) {
      const rooms = await Promise.all(
        data.joined_rooms.map(async (roomId) => ({
          roomId,
          name: await this.getRoomName(roomId)
        }))
      );

      this.rooms = rooms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      // Auto-select first room after login (optional UX)
      if (!this.roomId && this.rooms.length > 0) {
        this.switchRoom(this.rooms[0].roomId);
      }
    }
  } catch (e) {
    console.error('Fetch rooms error:', e);
  }
}

// Leave (delete) a room: Matrix API /leave
async function leaveRoom(roomId) {
  if (!this.accessToken || !roomId) return;

  if (!confirm('Ви впевнені, що хочете покинути (видалити) кімнату?')) {
    return;
  }

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(roomId)}/leave`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    const data = await res.json();

    if (res.ok) {
      // Remove locally
      this.rooms = this.rooms.filter((r) => r.roomId !== roomId);

      // If it was the active room, reset state
      if (this.roomId === roomId) {
        this.roomId = '';
        this.currentRoomName = '';
        this.messages = [];
        this.lastSyncToken = '';
        this.roomMembers = [];
      }

      alert('Кімнату покинуто.');
      await this.fetchRoomsWithNames();
    } else {
      console.error('Leave failed:', data);
      alert('Не вдалося покинути кімнату: ' + (data.error || 'Невідома помилка'));
    }
  } catch (e) {
    console.error('Leave room error:', e);
    alert('Помилка: ' + e.message);
  }
}

// Switch between rooms (also reloads chat/messages + members)
function switchRoom(roomId) {
  if (roomId) this.roomId = roomId;

  // Update current room name (async)
  this.getRoomName(this.roomId).then((name) => {
    this.currentRoomName = name;
  });

  this.messages = [];
  this.lastSyncToken = '';
  this.roomMembers = [];

  this.fetchMessages();
  this.fetchRoomMembers(); // ← load room members
}
