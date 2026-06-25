"use client";

import { io, type Socket } from "socket.io-client";
import { SERVER_URL, getToken } from "./api";

let socket: Socket | null = null;

/** Lazily create a singleton authenticated socket connection. */
export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
    });
  }
  // Refresh token in case it changed since creation.
  socket.auth = { token: getToken() };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
