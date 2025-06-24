const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHANNEL_ID;
const ADMIN_ID = process.env.ADMIN_ID || "628092591"; // Your Telegram user ID
const BOT_USERNAME = process.env.BOT_USERNAME || "@MineConfessBot";
const BOT_ID = process.env.BOT_ID || "7315387499";

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const bannedUsers = new Set();

app.get("/", (req, res) => {
  res.send("🤖 Confession Bot is Running");
});

app.post("/", async (req, res) => {
  const body = req.body;

  // Handle inline button (ban)
  if (body.callback_query) {
    const query = body.callback_query;
    const fromAdmin = query.from.id === ADMIN_ID;

    if (fromAdmin && query.data.startsWith("ban:")) {
      const [_, bannedId, bannedUsername] = query.data.split(":");
      bannedUsers.add(parseInt(bannedId));

      const banMessage = `👤 #BANNED_USER

Bot: ${BOT_USERNAME} [ ${BOT_ID} ]
User ID: ${bannedId}
Name: @${bannedUsername}`;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: CHAT_ID,
        text: banMessage,
      });

      await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
        callback_query_id: query.id,
        text: `✅ User @${bannedUsername} has been banned.`,
      });

      return res.sendStatus(200);
    }

    return res.sendStatus(200);
  }

  const msg = body.message;
  if (!msg) return res.sendStatus(200);

  const userId = msg.from?.id;
  const username = msg.from?.username || "unknown";
  const text = msg.text || msg.caption || "";

  // ❌ Block banned users
  if (bannedUsers.has(userId)) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: userId,
      text: "🚫 You are banned from sending confessions.",
    });
    return res.sendStatus(200);
  }

  // ✅ Handle text confession
  if (msg.text) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: `📩 New Confession:\n\n${msg.text}`,
    });

    if (userId !== ADMIN_ID) {
      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: ADMIN_ID,
        text: `📬 Confession from @${username} (${userId}):\n\n${msg.text}`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚫 Ban",
                callback_data: `ban:${userId}:${username}`,
              },
            ],
          ],
        },
      });
    }

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: userId,
      text: "✅ Your confession has been sent anonymously.",
    });

    return res.sendStatus(200);
  }

  // ✅ Handle photo confession
  if (msg.photo) {
    const photo = msg.photo.at(-1).file_id;

    await axios.post(`${TELEGRAM_API}/sendPhoto`, {
      chat_id: CHAT_ID,
      photo,
      caption: msg.caption || "",
    });

    if (userId !== ADMIN_ID) {
      await axios.post(`${TELEGRAM_API}/sendPhoto`, {
        chat_id: ADMIN_ID,
        photo,
        caption: `📷 Confession from @${username} (${userId})`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚫 Ban",
                callback_data: `ban:${userId}:${username}`,
              },
            ],
          ],
        },
      });
    }

    return res.sendStatus(200);
  }

  // ✅ Handle document confession
  if (msg.document) {
    await axios.post(`${TELEGRAM_API}/sendDocument`, {
      chat_id: CHAT_ID,
      document: msg.document.file_id,
      caption: msg.caption || "",
    });

    if (userId !== ADMIN_ID) {
      await axios.post(`${TELEGRAM_API}/sendDocument`, {
        chat_id: ADMIN_ID,
        document: msg.document.file_id,
        caption: `📁 Confession from @${username} (${userId})`,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🚫 Ban",
                callback_data: `ban:${userId}:${username}`,
              },
            ],
          ],
        },
      });
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot is running on port ${PORT}`);
});
