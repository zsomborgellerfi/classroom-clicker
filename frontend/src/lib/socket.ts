import { io, Socket } from "socket.io-client";

const DEFAULT_API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:3000/api";

const SOCKET_BASE_URL =
  (import.meta.env.VITE_SOCKET_URL as string | undefined) ||
  DEFAULT_API_URL.replace(/\/api\/?$/, "");

let socket: Socket | null = null;

export function connectSocket(token: string) {
  if (!SOCKET_BASE_URL) {
    return null;
  }

  if (socket) {
    socket.auth = { token };
    if (socket.disconnected) {
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_BASE_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
