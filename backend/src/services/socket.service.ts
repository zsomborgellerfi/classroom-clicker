import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";

import { UserRole } from "../enums/userRole";

type ClientToServerEvents = Record<string, never>;
type InterServerEvents = Record<string, never>;

export type QuizActivationPayload = {
  quizId: string;
  quizTitle: string;
  lessonId: string;
  lessonTitle: string;
  classId: string;
  className: string;
};

type SocketUser = {
  id: string;
  role: UserRole;
  name?: string;
};

type SocketData = {
  user?: SocketUser;
};

class SocketService {
  private io?: Server<ClientToServerEvents, Record<string, never>, InterServerEvents, SocketData>;

  initialize(server: HTTPServer) {
    if (this.io) {
      return this.io;
    }

    this.io = new Server<ClientToServerEvents, Record<string, never>, InterServerEvents, SocketData>(server, {
      cors: {
        origin: process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
      },
    });

    this.registerMiddleware();
    this.registerConnectionHandlers();

    return this.io;
  }

  private registerMiddleware() {
    this.io?.use((socket, next) => {
      try {
        const token =
          (socket.handshake.auth?.token as string | undefined) ||
          (socket.handshake.headers.authorization?.replace("Bearer ", "") as string | undefined);

        if (!token) {
          return next(new Error("Unauthorized"));
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return next(new Error("Server misconfiguration"));
        }

        const payload = jwt.verify(token, secret) as jwt.JwtPayload & {
          id: string;
          role: UserRole;
          name?: string;
        };

        socket.data.user = {
          id: payload.id,
          role: payload.role,
          name: payload.name,
        };

        return next();
      } catch (error) {
        return next(new Error("Unauthorized"));
      }
    });
  }

  private registerConnectionHandlers() {
    this.io?.on("connection", (socket: Socket<ClientToServerEvents, Record<string, never>, InterServerEvents, SocketData>) => {
      const user = socket.data.user;

      if (user?.role === UserRole.STUDENT) {
        socket.join(this.getStudentRoom(user.id));
      }
    });
  }

  emitQuizActivated(studentIds: string[], payload: QuizActivationPayload) {
    if (!this.io || studentIds.length === 0) {
      return;
    }

    studentIds.forEach((studentId) => {
      this.io?.to(this.getStudentRoom(studentId)).emit("quiz:activated", payload);
    });
  }

  private getStudentRoom(studentId: string) {
    return `student:${studentId}`;
  }
}

export default new SocketService();
