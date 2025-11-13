import http from "http";

import app from "./app";
import socketService from "./services/socket.service";

const port = process.env.PORT || 3000;

const server = http.createServer(app);

socketService.initialize(server);

server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
