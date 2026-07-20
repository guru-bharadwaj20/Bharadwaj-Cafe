import type { Server } from 'socket.io';
import type { Types } from 'mongoose';

/**
 * Socket.io room helpers.
 *
 * Nothing in this app should ever call `io.emit(...)`, which fans a payload
 * out to every connected client regardless of who they are. Orders and chat
 * messages contain names, phone numbers and addresses, so every broadcast is
 * addressed to a specific room instead.
 */

export const ADMIN_ROOM = 'role:admin';

export const userRoom = (userId: Types.ObjectId | string): string => `user:${userId.toString()}`;

/** Send to one customer, across all of their open tabs and devices. */
export const emitToUser = (
  io: Server | undefined,
  userId: Types.ObjectId | string | undefined | null,
  event: string,
  payload: unknown
): void => {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
};

/** Send to staff only. */
export const emitToAdmins = (io: Server | undefined, event: string, payload: unknown): void => {
  if (!io) return;
  io.to(ADMIN_ROOM).emit(event, payload);
};
