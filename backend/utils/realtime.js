/**
 * Socket.io room helpers.
 *
 * Nothing in this app should ever call `io.emit(...)`, which fans a payload
 * out to every connected client regardless of who they are. Orders and chat
 * messages contain names, phone numbers and addresses, so every broadcast is
 * addressed to a specific room instead.
 */

export const ADMIN_ROOM = 'role:admin';

export const userRoom = (userId) => `user:${userId}`;

/** Send to one customer, across all of their open tabs and devices. */
export const emitToUser = (io, userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
};

/** Send to staff only. */
export const emitToAdmins = (io, event, payload) => {
  if (!io) return;
  io.to(ADMIN_ROOM).emit(event, payload);
};
