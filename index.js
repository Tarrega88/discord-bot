const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const RESTRICTED_USERS = ["1347655991319068693", "196127088435003392"]; // Replace with actual user IDs

let isBotActive = true; // Default: Moderation is ON

const TIMEOUTS = {
    1: 0, // First offense - warning only
    2: 5 * 60 * 1000, // 10 minutes
    3: 15 * 60 * 1000 // 30 minutes
};

const userOffenses = new Map(); // Store user offenses

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Required for timeouts
    ],
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    // ✅ ADMIN TOGGLE FEATURE
    if (message.content.trim().toLowerCase() === "bot toggle") {
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            isBotActive = !isBotActive;
            await message.channel.send(`Bot moderation is now **${isBotActive ? "ON" : "OFF"}**.`);
        } else {
            await message.channel.send("You do not have permission to toggle the bot.");
        }
        return;
    }

    // ✅ STOP MODERATING IF BOT IS TOGGLED OFF
    if (!isBotActive) return;

    // ✅ DELETE MESSAGES & APPLY TIMEOUTS IF BOT IS ACTIVE
    const mentionedUsers = message.mentions.users.map(user => user.id);
    if (RESTRICTED_USERS.some(id => mentionedUsers.includes(id))) {
        await message.delete(); // Delete the message

        const userId = message.author.id;
        let offenses = userOffenses.get(userId) || 0;
        offenses += 1;
        userOffenses.set(userId, offenses);

        console.log(`User ${message.author.tag} has ${offenses} offenses.`); // Debug log

        if (offenses === 1) {
            await message.channel.send(`${message.author}, warning: You cannot mention that user. Further attempts will result in a timeout.`);
        } else {
            const timeoutDuration = TIMEOUTS[offenses] || TIMEOUTS[3];
            try {
                await message.member.timeout(timeoutDuration, `Mentioned a restricted user (Offense ${offenses})`);
                await message.channel.send(`${message.author}, you have been timed out for ${timeoutDuration / (60 * 1000)} minutes.`);
            } catch (err) {
                console.error("Failed to timeout user:", err);
            }
        }
    }
});

client.login(TOKEN);
