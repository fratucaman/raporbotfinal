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
client.on('voiceStateUpdate', async (oldState, newState) => {
  const member = newState.member;
  if (!member) return;

  const userId = member.id;

  // 🔇 KENDİNİ SUSTURDU
  if (!oldState.selfMute && newState.selfMute) {
    activeMutes.set(userId, Date.now());

    try {
      await member.setNickname(`[RAPORDA] ${member.user.username}`);
    } catch {}

    if (!raporData[userId]) {
      raporData[userId] = {
        username: member.user.username,
        totalSeconds: 0
      };
    }
  }

  // 🔊 SUSTURMAYI AÇTI
  if (oldState.selfMute && !newState.selfMute) {
    const start = activeMutes.get(userId);
    if (!start) return;

    const duration = Math.floor((Date.now() - start) / 1000);
    raporData[userId].totalSeconds += duration;

    saveData();
    activeMutes.delete(userId);

    try {
      await member.setNickname(member.user.username);
    } catch {}

    console.log(
      `${member.user.username} RAPORDA ${formatTime(duration)} kaldı`
    );
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
