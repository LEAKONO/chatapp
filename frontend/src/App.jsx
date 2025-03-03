import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const socket = io("http://localhost:5000");

const ChatApp = () => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(""); // ✅ Track password
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const register = async () => {
    await axios.post("http://localhost:5000/register", { username, password });
    alert("Registered! Now login.");
    setPassword(""); // ✅ Clear password field
  };

  const login = async () => {
    try {
      const res = await axios.post("http://localhost:5000/login", { username, password });
      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      setUsername(jwtDecode(res.data.token).username);
      setPassword(""); // ✅ Clear password after login
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed! Check your credentials.");
    }
  };

  const joinRoom = () => {
    if (token && room) {
      socket.emit("joinRoom", { token, room });
      setRoom(""); 
    }
  };

  const sendMessage = () => {
    if (message) {
      socket.emit("sendMessage", { text: message });
      setMessage(""); 
    }
  };

  useEffect(() => {
    socket.on("receiveMessage", (data) => setMessages((prev) => [...prev, data]));
    socket.on("chatHistory", (history) => setMessages(history));

    return () => {
      socket.off("receiveMessage");
      socket.off("chatHistory");
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h2 className="text-3xl font-bold mb-6">Secure Private Chat</h2>

      <div className="bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md mb-6">
        <input
          type="text"
          placeholder="Username"
          className="w-full p-2 mb-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-4 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password} // ✅ Controlled input
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-between">
          <button onClick={register} className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded">
            Register
          </button>
          <button onClick={login} className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">
            Login
          </button>
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <input
          type="text"
          placeholder="Room ID"
          className="p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={room} 
          onChange={(e) => setRoom(e.target.value)}
        />
        <button onClick={joinRoom} className="bg-purple-500 hover:bg-purple-600 px-4 py-2 rounded">
          Join Room
        </button>
      </div>

      <div className="w-full max-w-md h-80 overflow-y-auto bg-gray-800 p-4 rounded-lg shadow-md mb-4">
        {messages.map((msg, index) => (
          <p key={index} className="mb-2">
            <strong className="text-green-400">{msg.username}:</strong> {msg.text}
          </p>
        ))}
      </div>

      <div className="flex space-x-4 w-full max-w-md">
        <input
          type="text"
          placeholder="Message..."
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={sendMessage} className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatApp;
