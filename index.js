console.log("🚀 BOT DOSYASI ÇALIŞTI");

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Geçici mute başlangıçları
const activeMutes = new Map();

// Kalıcı rapor verileri
let raporData = {};
if (fs.existsSync("rapor-data.json")) {
  raporData = JSON.parse(fs.readFileSync("rapor-data.json"));
}

function saveData() {
  fs.writeFileSync("rapor-data.json", JSON.stringify(raporData, null, 2));
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}sa ${m}dk ${s}sn`;
}

client.once('ready', () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

// 🔊 SES DURUMU
client.on("voiceStateUpdate", (oldState, newState) => {
  const userId = newState.id;

  if (!activeMutes[userId]) {
    activeMutes[userId] = { start: null };
  }

  // 🔴 susturma başladı
  if (
    !oldState.selfMute &&
    newState.selfMute &&
    newState.channelId
  ) {
    activeMutes[userId].start = Date.now();
    return;
  }

  // 🟢 susturma bitti
  if (
    oldState.selfMute &&
    (
      !newState.selfMute ||
      !newState.channelId ||
      oldState.channelId !== newState.channelId
    )
  ) {
    stopMuteAndSave(userId);
  }
});

// 📊 LEADERBOARD KOMUTU
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content !== "!rapor") return;

  const sorted = Object.values(raporData)
    .sort((a, b) => b.totalSeconds - a.totalSeconds)
    .slice(0, 10);

  if (sorted.length === 0) {
    return message.channel.send("📭 Henüz RAPORDA verisi yok.");
  }

  let reply = "📊 **RAPORDA LEADERBOARD**\n\n";
  sorted.forEach((u, i) => {
    reply += `**${i + 1}.** ${u.username} — ${formatTime(u.totalSeconds)}\n`;
  });

  message.channel.send(reply);
});

client.login(process.env.DISCORD_TOKEN);


