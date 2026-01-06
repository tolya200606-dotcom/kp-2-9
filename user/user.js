// Join a room by ID (e.g. !roomId:matrix.org)
async function joinRoom() {
  if (!this.accessToken || !this.joinRoomId.trim()) return;

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/join/${encodeURIComponent(this.joinRoomId.trim())}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({})
      }
    );

    const data = await res.json();
    if (data.room_id) {
      this.joinRoomId = '';
      await this.fetchRoomsWithNames();
      this.switchRoom(data.room_id);
    } else {
      this.error = 'Join room failed: ' + (data.error || 'Unknown error');
    }
  } catch (e) {
    this.error = 'Join room error: ' + e.message;
  }
}

// Invite a user into the currently selected room
async function inviteUserToRoom() {
  if (!this.accessToken || !this.roomId || !this.inviteUser.trim()) return;

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/invite`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ user_id: this.inviteUser.trim() })
      }
    );

    const data = await res.json();
    if (data.errcode) {
      this.error = 'Invite failed: ' + (data.error || data.errcode);
    } else {
      this.inviteUser = '';
      // After inviting, refresh the members list
      this.fetchRoomMembers();
    }
  } catch (e) {
    this.error = 'Invite error: ' + e.message;
  }
}

// Fetch members joined to the selected room
async function fetchRoomMembers() {
  if (!this.accessToken || !this.roomId) return;

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/joined_members`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );
    const data = await res.json();

    // data.joined — object { "@user:matrix.org": { display_name: "...", avatar_url: "..." } }
    this.roomMembers = Object.entries(data.joined || {}).map(([userId, info]) => ({
      userId,
      displayName: info.display_name || userId.split(':')[0].substring(1),
      avatarUrl: info.avatar_url
    }));
  } catch (e) {
    console.error('Error fetching room members:', e);
  }
}

// Kick a user from the currently selected room: Matrix API /kick
async function kickUser(userId) {
  if (!this.accessToken || !this.roomId || !userId) return;

  if (!confirm(`Викинути користувача ${userId} з кімнати?`)) {
    return;
  }

  try {
    const res = await fetch(
      `https://matrix.org/_matrix/client/r0/rooms/${encodeURIComponent(this.roomId)}/kick`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ user_id: userId })
      }
    );

    const data = await res.json();

    if (res.ok) {
      this.roomMembers = this.roomMembers.filter((m) => m.userId !== userId);
      alert(`Користувач ${userId} викинутий з кімнати.`);
      await this.fetchRoomMembers();
    } else {
      console.error('Kick failed:', data);
      alert('Не вдалося викинути користувача: ' + (data.error || 'Невідома помилка'));
    }
  } catch (e) {
    console.error('Kick error:', e);
    alert('Помилка: ' + e.message);
  }
}