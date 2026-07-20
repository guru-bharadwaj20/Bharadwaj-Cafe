import 'socket.io';

/**
 * The handshake middleware pins these onto the socket from the verified JWT.
 * Declaring them here means room-joining code cannot silently read an
 * undeclared property.
 */
declare module 'socket.io' {
  interface Socket {
    userId: string;
    userRole: 'customer' | 'admin';
  }
}
