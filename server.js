const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const rooms = {}; // { roomId: { users: {socketId: username}, password: '...', ... } }
const users = {};
const voiceUsers = {}; // { roomId: Set(socketId) }
const speakingState = {}; // { roomId: Set(username) }

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, username, password }) => {
    // Password protection logic
    if (!rooms[roomId]) rooms[roomId] = { users: {}, password: '' };
    if (rooms[roomId].password && rooms[roomId].password !== password) {
      socket.emit('password-incorrect');
      return;
    }
    socket.join(roomId);
    socket.roomId = roomId;
    socket.username = username;
    rooms[roomId].users[socket.id] = username;
    // Remove any previous user with the same name in this room (by socket id)
    if (!users[roomId]) users[roomId] = [];
    users[roomId] = users[roomId].filter(u => u.name !== username);
    users[roomId].push({ name: username, color: getRandomColor(), drawing: false });
    io.to(roomId).emit('user-list', users[roomId]);
    socket.to(roomId).emit('chat', { user: 'System', message: `${username} joined!` });

    // Handle drawing
    socket.on('draw', (data) => {
      const roomUsers = users[socket.roomId] || [];
      const user = roomUsers.find(u => u.name === socket.username);
      if (user) user.drawing = true;
      socket.to(socket.roomId).emit('draw', data);
      io.to(socket.roomId).emit('user-list', roomUsers);
      setTimeout(() => {
        if (user) user.drawing = false;
        io.to(socket.roomId).emit('user-list', roomUsers);
      }, 800);
    });

    // Handle chat
    socket.on('chat', (msg) => {
      const time = Date.now();
      io.to(socket.roomId).emit('chat', { user: socket.username, message: msg, time });
    });

    // Handle typing
    socket.on('typing', (isTyping) => {
      io.to(socket.roomId).emit('typing', isTyping ? socket.username : '');
    });

    // Handle speaking
    socket.on('speaking', ({ roomId, username, isSpeaking }) => {
      if (!speakingState[roomId]) speakingState[roomId] = new Set();
      if (isSpeaking) {
        speakingState[roomId].add(username);
      } else {
        speakingState[roomId].delete(username);
      }
      io.to(roomId).emit('speaking-users', Array.from(speakingState[roomId]));
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      if (rooms[socket.roomId]) {
        socket.to(socket.roomId).emit('chat', { user: 'System', message: `${socket.username} left.` });
        delete rooms[socket.roomId].users[socket.id];
        // Remove user from users[roomId] by name
        if (users[socket.roomId]) {
          users[socket.roomId] = users[socket.roomId].filter(u => u.name !== socket.username);
          io.to(socket.roomId).emit('user-list', users[socket.roomId]);
        }
        if (Object.keys(rooms[socket.roomId].users).length === 0) delete rooms[socket.roomId];
      }
      // Clean up voice users
      if (voiceUsers[socket.roomId]) {
        voiceUsers[socket.roomId].delete(socket.id);
        io.to(socket.roomId).emit('voice-users', Array.from(voiceUsers[socket.roomId]));
        if (voiceUsers[socket.roomId].size === 0) delete voiceUsers[socket.roomId];
      }
      // Clean up speaking state
      if (speakingState[socket.roomId]) {
        speakingState[socket.roomId].delete(socket.username);
        io.to(socket.roomId).emit('speaking-users', Array.from(speakingState[socket.roomId]));
        if (speakingState[socket.roomId].size === 0) delete speakingState[socket.roomId];
      }
    });
  });
  // Set room password
  socket.on('set-room-password', ({ roomId, password }) => {
    if (!rooms[roomId]) rooms[roomId] = { users: {}, password: '' };
    rooms[roomId].password = password;
    socket.emit('password-set', { success: true });
  });

  // --- WebRTC Voice Chat Signaling ---
  socket.on('voice-join', (roomId, username) => {
    if (!voiceUsers[roomId]) voiceUsers[roomId] = new Set();
    voiceUsers[roomId].add(socket.id);
    socket.join(roomId);
    // Notify all users in the room of current voice users
    io.to(roomId).emit('voice-users', Array.from(voiceUsers[roomId]));
  });

  socket.on('voice-leave', (roomId, username) => {
    if (voiceUsers[roomId]) {
      voiceUsers[roomId].delete(socket.id);
      io.to(roomId).emit('voice-users', Array.from(voiceUsers[roomId]));
    }
  });

  socket.on('voice-offer', ({ to, offer }) => {
    io.to(to).emit('voice-offer', { from: socket.id, offer });
  });

  socket.on('voice-answer', ({ to, answer }) => {
    io.to(to).emit('voice-answer', { from: socket.id, answer });
  });

  socket.on('voice-ice', ({ to, candidate }) => {
    io.to(to).emit('voice-ice', { from: socket.id, candidate });
  });

  // --- Sticky Notes and Images Sync ---
  socket.on('sticky-add', data => {
    socket.to(socket.roomId).emit('sticky-add', data);
  });
  socket.on('sticky-move', data => {
    socket.to(socket.roomId).emit('sticky-move', data);
  });
  socket.on('sticky-edit', data => {
    socket.to(socket.roomId).emit('sticky-edit', data);
  });
  socket.on('sticky-delete', data => {
    socket.to(socket.roomId).emit('sticky-delete', data);
  });
  socket.on('image-add', data => {
    socket.to(socket.roomId).emit('image-add', data);
  });
  socket.on('image-move', data => {
    socket.to(socket.roomId).emit('image-move', data);
  });
  socket.on('image-resize', data => {
    socket.to(socket.roomId).emit('image-resize', data);
  });
  socket.on('image-delete', data => {
    socket.to(socket.roomId).emit('image-delete', data);
  });
  socket.on('undo-drawing', data => {
    socket.to(socket.roomId).emit('undo-drawing', data);
  });
  socket.on('redo-drawing', data => {
    socket.to(socket.roomId).emit('redo-drawing', data);
  });
  socket.on('image-lock', data => {
    socket.to(socket.roomId).emit('image-lock', data);
  });
  socket.on('image-unlock', data => {
    socket.to(socket.roomId).emit('image-unlock', data);
  });
  socket.on('page-add', data => {
    socket.to(socket.roomId).emit('page-add', data);
  });
  socket.on('page-change', data => {
    socket.to(socket.roomId).emit('page-change', data);
  });
});

function getRandomColor() {
  const colors = [
    '#7c3aed', '#6366f1', '#059669', '#f59e42', '#f43f5e', '#eab308', '#0ea5e9', '#14b8a6', '#f472b6', '#a21caf'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); 
