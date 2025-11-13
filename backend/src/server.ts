import http from "http";
import path from "path";
import dotenv from "dotenv";

import app from "./app";
import socketService from "./services/socket.service";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
  override: false,
});

const port = process.env.PORT || 3000;

const server = http.createServer(app);

socketService.initialize(server);

server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
