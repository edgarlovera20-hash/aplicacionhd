import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

export function subscribeToDashboardUpdates(callback: any) {
  socket.on("dashboard_update", callback);
}
