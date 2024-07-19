// #region ::: IMPORTS :::
import { createClient } from "@vercel/postgres";
import express, { Request, Response } from "express";
import { config } from "dotenv";
import { Server } from "socket.io";
import { createServer } from "http";
import cors from "cors";
import path from "path";

config();

const PORT = process.env.PORT || 3000;

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const client = createClient({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
  express.json()
);

io.on("connection", (socket) => {
  socket.on("message-sent", (message) => {
    client.query(
      `INSERT INTO messages (content) VALUES ($1)`,
      [message],
      (error) => {
        if (!error) io.emit("message-received", message);
      }
    );
  });
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

app.get("/", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/api/messages", (req: Request, res: Response) => {
  client.query("SELECT * FROM messages", (error, response) => {
    if (error) res.status(500).json({ error });
    else res.status(200).json(response.rows);
  });
});

app.post("/api/messages", (req: Request, res: Response) => {
  const { content } = req.body;
  client.query(
    `INSERT INTO messages (content) VALUES ($1)`,
    [content],
    (error) => {
      if (error) res.status(500).json({ error });
      else res.status(200).json({ message: "Message created successfully" });
    }
  );
});

server.listen(PORT, () => {
  console.log(`Server API is running http://localhost:${PORT}`);
});