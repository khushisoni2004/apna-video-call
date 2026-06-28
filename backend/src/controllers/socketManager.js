import { Server } from 'socket.io';

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server, clientUrl = '*') => {
  const io = new Server(server, {
    cors: {
      origin: clientUrl === '*' ? '*' : clientUrl,
      methods: ['GET', 'POST'],
      allowedHeaders: ['*'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join-call', (path) => {
      if (!connections[path]) connections[path] = [];
      if (!connections[path].includes(socket.id)) connections[path].push(socket.id);

      timeOnline[socket.id] = new Date();

      connections[path].forEach((clientId) => {
        io.to(clientId).emit('user-joined', socket.id, connections[path]);
      });

      if (messages[path]) {
        messages[path].forEach((message) => {
          io.to(socket.id).emit('chat-message', message.data, message.sender, message.socketIdSender);
        });
      }
    });

    socket.on('signal', (toId, message) => {
      io.to(toId).emit('signal', socket.id, message);
    });

    socket.on('chat-message', (data, sender) => {
      const matchingRoom = Object.keys(connections).find((room) => connections[room].includes(socket.id));
      if (!matchingRoom) return;

      if (!messages[matchingRoom]) messages[matchingRoom] = [];
      messages[matchingRoom].push({ sender, data, socketIdSender: socket.id });

      connections[matchingRoom].forEach((clientId) => {
        io.to(clientId).emit('chat-message', data, sender, socket.id);
      });
    });

    socket.on('disconnect', () => {
      Object.keys(connections).forEach((room) => {
        if (!connections[room].includes(socket.id)) return;

        const updatedClients = connections[room].filter((clientId) => clientId !== socket.id);

        connections[room].forEach((clientId) => {
          io.to(clientId).emit('user-left', socket.id, updatedClients);
        });

        connections[room] = updatedClients;
        if (connections[room].length === 0) {
          delete connections[room];
          delete messages[room];
        }
      });

      delete timeOnline[socket.id];
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};
