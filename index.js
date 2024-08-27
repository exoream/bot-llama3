const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Groq = require("groq-sdk");
require("dotenv").config();


const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox" ],
  },
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getGroqChatCompletion(prompt) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-70b-8192",
    });
    return (
      chatCompletion.choices[0]?.message?.content ||
      "Tidak ada respons dari model."
    );
  } catch (error) {
    console.error("Error:", error);
    return "Maaf, terjadi kesalahan saat memproses permintaan.";
  }
}

client.on("message", async (message) => {
  if (!message.fromMe) {
    const response = await getGroqChatCompletion(message.body);
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
