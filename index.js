const { Client, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const DATA_FILE = "./rapor-data.json";

// kayıtlı süreler
let data = {};
if (fs.existsSync(DATA_FILE)) {
  data = JSON.parse(fs.readFileSync(DATA_FILE));
}

// anlık susturulanlar
const activeMutes = {};

// yardımcı
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}s ${m}dk ${s}sn`;
}

// VOICE TAKİBİ
client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const userId = member.id;

  // SUSTURMA BAŞLADI
  if (
    !oldState.selfMute &&
    newState.selfMute &&
    newState.channelId
  ) {
    activeMutes[userId] = {
      start: Date.now(),
      nickname: member.displayName
    };

    // RAPORDA ekle
    if (!member.displayName.startsWith("RAPORDA |")) {
      member.setNickname(`RAPORDA | ${member.displayName}`).catch(() => {});
    }
    return;
  }

  // SUSTURMA BİTTİ
  const leftServer = oldState.channelId && !newState.channelId;
  const micOpened = oldState.selfMute && !newState.selfMute;

  if (activeMutes[userId] && (leftServer || micOpened)) {
    const seconds = Math.floor(
      (Date.now() - activeMutes[userId].start) / 1000
    );

    if (!data[userId]) {
      data[userId] = {
        username: member.user.username,
        totalSeconds: 0
      };
    }

    data[userId].totalSeconds += seconds;
    saveData();

    // nick eski haline dönsün
    member.setNickname(activeMutes[userId].nickname).catch(() => {});

    delete activeMutes[userId];
  }
});

// KOMUT: !rapor
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.content !== "!rapor") return;

  const sorted = Object.values(data)
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  if (sorted.length === 0) {
    return message.channel.send("📊 Henüz RAPORDA verisi yok.");
  }

  let reply = "📊 **RAPORDA LEADERBOARD**\n\n";
  sorted.forEach((u, i) => {
  let medal = "";
  if (i === 0) medal = "🥇 ";
  if (i === 1) medal = "🥈 ";
  if (i === 2) medal = "🥉 ";

  reply += `${medal}**${i + 1}.** ${u.username} — ${formatTime(u.totalSeconds)}\n`;

  });

  message.channel.send(reply);
});

// BOT AÇILIŞ
client.once("ready", () => {
  console.log(`✅ Bot aktif: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

