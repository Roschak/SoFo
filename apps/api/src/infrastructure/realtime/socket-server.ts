import type { Server } from 'socket.io';

let server: Server | null = null;

/** Registers the Socket.IO server instance once the gateway initializes. */
export function setSocketServer(instance: Server | null): void {
  server = instance;
}

/** Returns the live server, or null before gateway init (broadcasts no-op). */
export function getSocketServer(): Server | null {
  return server;
}
