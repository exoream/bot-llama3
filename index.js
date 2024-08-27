const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Groq = require("groq-sdk");
require("dotenv").config();

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox"],
  },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MAX_HISTORY_AGE = 30 * 60 * 1000;
const chatHistories = {};


function cleanupOldHistories() {
  const now = Date.now();
  for (const userId in chatHistories) {
    chatHistories[userId] = chatHistories[userId].filter(
      (item) => now - item.timestamp < MAX_HISTORY_AGE
    );
    if (chatHistories[userId].length === 0) {
      delete chatHistories[userId];
    }
  }
}

setInterval(cleanupOldHistories, 5 * 60 * 1000);

async function getGroqChatCompletion(userId, prompt) {
  try {
    const now = Date.now();
    const history = chatHistories[userId] || [];

    chatHistories[userId] = history.filter(item => now - item.timestamp < MAX_HISTORY_AGE);

    history.push({ role: "user", content: prompt, timestamp: now });

    // Kirim riwayat ke model
    const chatCompletion = await groq.chat.completions.create({
      messages: history.map(({ role, content }) => ({ role, content })),
      model: "llama3-70b-8192",
    });

    const response = chatCompletion.choices[0]?.message?.content || "Tidak ada respons dari model.";
    history.push({ role: "assistant", content: response, timestamp: now });

    chatHistories[userId] = history;

    return response;
  } catch (error) {
    console.error("Error:", error);
    return "Maaf, terjadi kesalahan saat memproses permintaan.";
  }
}

client.on("message", async (message) => {
  if (!message.fromMe) {
    const userId = message.from;
    const response = await getGroqChatCompletion(userId, message.body);
    message.reply(response);
  }
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.initialize();
