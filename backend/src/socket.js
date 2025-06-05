const users = new Map();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userId) => {
      users.set(userId, socket.id);
      console.log('User joined:', userId);
    });

    socket.on('signal', ({ signal, to }) => {
      const targetSocketId = users.get(to);
      if (targetSocketId) {
        io.to(targetSocketId).emit('signal', signal);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of users.entries()) {
        if (socketId === socket.id) {
          users.delete(userId);
          break;
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });
}

module.exports = {
  setupSocketHandlers
}; 