const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// 🌐 Environment Variables
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID || "628092591"; // Your Telegram user ID
const BOT_USERNAME = process.env.BOT_USERNAME || "@MineConfessBot";
const BOT_ID = process.env.BOT_ID || "7315387499";

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const bannedUsers = new Set(); // In-memory list

app.get("/", (req, res) => {
  res.send("🚀 Confession bot is running.");
});

app.post("/", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const userId = msg.from?.id;
  const text = msg.text || msg.caption || "";

  // 🔐 Block banned users
  if (bannedUsers.has(userId)) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: userId,
      text: "❌ You are banned from sending confessions.",
    });
    return res.sendStatus(200);
  }

  // ✅ Admin reply-to-ban command
  if (
    userId === ADMIN_ID &&
    text === "/ban" &&
    msg.reply_to_message?.forward_from
  ) {
    const target = msg.reply_to_message.forward_from;
    const bannedId = target.id;
    const bannedUsername = target.username ? `@${target.username}` : "No username";

    bannedUsers.add(bannedId);

    const banMessage = `👤 #BANNED_USER

Bot: ${BOT_USERNAME} [ ${BOT_ID} ]
User ID: ${bannedId}
Name: ${bannedUsername}`;

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: banMessage,
    });

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: ADMIN_ID,
      text: `✅ User ${bannedUsername} (${bannedId}) has been banned.`,
    });

    return res.sendStatus(200);
  }

  // ✅ Handle text
  if (msg.text) {
    // Send to channel
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `📩 New Confession:\n\n${msg.text}`,
    });

    // Forward to admin (preserves sender info)
    await axios.post(`${TELEGRAM_API}/forwardMessage`, {
      chat_id: ADMIN_ID,
      from_chat_id: userId,
      message_id: msg.message_id,
    });

    // Confirm to sender
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: userId,
      text: "✅ Your confession has been sent anonymously.",
    });

    return res.sendStatus(200);
  }

  // ✅ Handle photo
  if (msg.photo) {
    const photo = msg.photo.at(-1).file_id;

    // Send to channel
    await axios.post(`${TELEGRAM_API}/sendPhoto`, {
      chat_id: CHAT_ID,
      photo,
      caption: msg.caption || "",
    });

    // Forward to admin
    await axios.post(`${TELEGRAM_API}/forwardMessage`, {
      chat_id: ADMIN_ID,
      from_chat_id: userId,
      message_id: msg.message_id,
    });

    return res.sendStatus(200);
  }

  // ✅ Handle document
  if (msg.document) {
    await axios.post(`${TELEGRAM_API}/sendDocument`, {
      chat_id: CHAT_ID,
      document: msg.document.file_id,
      caption: msg.caption || "",
    });

    await axios.post(`${TELEGRAM_API}/forwardMessage`, {
      chat_id: ADMIN_ID,
      from_chat_id: userId,
      message_id: msg.message_id,
    });

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// 🟢 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ Confession Bot running on port " + PORT);
});
