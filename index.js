require("dotenv").config();

const { Client, GatewayIntentBits, Events, ChannelType } = require("discord.js");
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require("@discordjs/voice");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const VOICE_CHANNEL_ID = process.env.VOICE_CHANNEL_ID;

let reconnectTimer = null;

async function connectToVC() {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      console.error("Voice channel not found or the ID is not a voice channel.");
      return;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: true
    });

    console.log(`Joined VC: ${channel.name}`);

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      console.log("Disconnected. Attempting to reconnect...");

      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000)
        ]);
        console.log("Reconnection in progress.");
      } catch {
        try { connection.destroy(); } catch {}
        scheduleReconnect();
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      scheduleReconnect();
    });

  } catch (error) {
    console.error("VC error:", error.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToVC();
  }, 5000);
}

client.once(Events.ClientReady, async (bot) => {
  console.log(`Logged in as ${bot.user.tag}`);
  await connectToVC();
});

client.login(TOKEN);
