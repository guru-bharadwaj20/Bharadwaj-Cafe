import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// A single shared connection. The server rejects any socket without a valid
// token and derives the user's rooms from that token, so there is nothing for
// the client to "join" — subscriptions happen automatically on connect.
export const socket = io(SOCKET_URL, {
  autoConnect: false,
});

export const connectSocket = (token) => {
  if (!token) return;

  // Re-authenticate if the token changed (e.g. logging in as someone else).
  if (socket.connected && socket.auth?.token === token) return;
  if (socket.connected) socket.disconnect();

  socket.auth = { token };
  socket.connect();
};

export const disconnectSocket = () => {
  socket.auth = {};
  if (socket.connected) {
    socket.disconnect();
  }
};
