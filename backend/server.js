require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

const users = {};

// 🔹 Register User
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.status(400).json({ error: "User already exists" });

  users[username] = await bcrypt.hash(password, 10);
  res.json({ message: "User registered" });
});

// 🔹 Login User
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userPassword = users[username];

  if (!userPassword || !(await bcrypt.compare(password, userPassword))) {
    return res.status(400).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// 🔹 Socket.io
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("joinRoom", async ({ token, room }) => {
    try {
      const { username } = jwt.verify(token, process.env.JWT_SECRET);
      socket.join(room);
      console.log(`${username} joined room: ${room}`);

      const messages = await Message.find({ room }).sort("timestamp");
      socket.emit("chatHistory", messages);
      socket.to(room).emit("message", { username: "System", text: `${username} joined` });

      socket.username = username;
      socket.room = room;
    } catch (error) {
      console.error("Invalid token:", error);
      socket.disconnect();
    }
  });

  socket.on("sendMessage", async ({ text }) => {
    if (!socket.username || !socket.room) return;

    const message = new Message({ username: socket.username, room: socket.room, text });
    await message.save();

    io.to(socket.room).emit("receiveMessage", message);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
