const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// 🔧 Environment Variables from Render
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID || "628092591"; // Your Telegram user ID
const BOT_USERNAME = process.env.BOT_USERNAME || "@MineConfessBot";
const BOT_ID = process.env.BOT_ID || "7315387499";

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const bannedUsers = new Set(); // In-memory (reset after restart)

app.get("/", (req, res) => {
  res.send("Confession bot is running 🔥");
});

app.post("/", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.sendStatus(200);

  const userId = msg.from?.id;
  const text = msg.text || msg.caption || "";

  // ❌ Reject banned users
  if (bannedUsers.has(userId)) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: userId,
      text: "❌ You are banned from sending confessions.",
    });
    return res.sendStatus(200);
  }

  // 🔐 Admin reply-based /ban command
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

  // ✅ Handle photos
  if (msg.photo) {
    const photo = msg.photo.at(-1).file_id;
    await axios.post(`${TELEGRAM_API}/sendPhoto`, {
      chat_id: CHAT_ID,
      photo: photo,
      caption: msg.caption || "",
    });
    return res.sendStatus(200);
  }

  // ✅ Handle documents
  if (msg.document) {
    await axios.post(`${TELEGRAM_API}/sendDocument`, {
      chat_id: CHAT_ID,
      document: msg.document.file_id,
      caption: msg.caption || "",
    });
    return res.sendStatus(200);
  }

  // ✅ Handle text confession
  if (msg.text) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `📩 New Confession:\n\n${msg.text}`,
    });

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: userId,
      text: "✅ Your confession has been sent anonymously.",
    });

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Confession Bot running on port " + PORT);
});
