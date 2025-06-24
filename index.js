const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

// Load environment variables
const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const BOT_USERNAME = process.env.BOT_USERNAME || "@MineConfessBot";
const BOT_ID = process.env.BOT_ID || "7315387499";

// Load banned users from file
let bannedUsers = new Set();
const BAN_FILE = "banned.json";

if (fs.existsSync(BAN_FILE)) {
  try {
    const data = fs.readFileSync(BAN_FILE, "utf8");
    bannedUsers = new Set(JSON.parse(data));
  } catch (err) {
    console.error("❌ Failed to read banned.json:", err.message);
  }
}

function saveBans() {
  fs.writeFileSync(BAN_FILE, JSON.stringify([...bannedUsers]));
}

app.get("/", (req, res) => {
  res.send("🤖 Confession Bot is running");
});

app.post("/", async (req, res) => {
  const body = req.body;

  // Handle Ban Button Click
  if (body.callback_query) {
    const query = body.callback_query;
    const fromAdmin = query.from.id === ADMIN_ID;

    if (fromAdmin && query.data.startsWith("ban:")) {
      const [_, bannedId, bannedUsername] = query.data.split(":");
      if (parseInt(bannedId) === ADMIN_ID) {
        await axios.post(`${TELEGRAM_API}/answerCallbackQuery`, {
          callback_query_id: query.id,
          text: "❌ You cannot ban yourself!",
          show_alert: true,
        });
        return res.sendStatus(200);
      }

      bannedUsers.add(parseInt(bannedId));
      saveBans();

      const banMessage = `👤 #BANNED_USER

Bot: ${BOT_USERNAME} [ ${BOT_ID} ]
User ID: ${bannedId}
Name: @${bannedUsername}`;

      await axios.post(`${TELEGRAM_API}/sendMessage`, {
        chat_id: CHANNEL_ID,
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

  // Block banned users
  if (bannedUsers.has(userId)) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: userId,
      text: "🚫 You are banned from sending confessions.",
    });
    return res.sendStatus(200);
  }

  // === TEXT ===
  if (msg.text) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHANNEL_ID,
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

  // === PHOTO ===
  if (msg.photo) {
    const photo = msg.photo.at(-1).file_id;

    await axios.post(`${TELEGRAM_API}/sendPhoto`, {
      chat_id: CHANNEL_ID,
      photo,
      caption: msg.caption || "",
    });

    if (userId !== ADMIN_ID) {
      await axios.post(`${TELEGRAM_API}/sendPhoto`, {
        chat_id: ADMIN_ID,
        photo,
        caption: `📷 Photo confession from @${username} (${userId})`,
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

  // === DOCUMENT ===
  if (msg.document) {
    await axios.post(`${TELEGRAM_API}/sendDocument`, {
      chat_id: CHANNEL_ID,
      document: msg.document.file_id,
      caption: msg.caption || "",
    });

    if (userId !== ADMIN_ID) {
      await axios.post(`${TELEGRAM_API}/sendDocument`, {
        chat_id: ADMIN_ID,
        document: msg.document.file_id,
        caption: `📁 File confession from @${username} (${userId})`,
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
  console.log(`🚀 Confession Bot is running on port ${PORT}`);
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bot is running on port ${PORT}`);
});
