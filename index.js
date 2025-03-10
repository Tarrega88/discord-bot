const { Client, GatewayIntentBits, Events, MessageType } = require('discord.js');
require('dotenv').config();
const token = process.env.TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ✅ Bot Toggle (Admin Control)
let botEnabled = true;

// ❌ Users Restricted from Manual Mentions
const restrictedUserIDs = ["1347655991319068693", "196127088435003392"]; // Replace with actual user IDs

// ⏳ Offense Tracking for Timeouts
const offenseTracker = new Map(); // { userID: count }

// 🔒 Allowed Server List (For Private Bots)
const allowedServers = ["1322821692938125412", "1347660414900637696"]; // Replace with actual server IDs

// 🚨 Prevent Unauthorized Server Access
client.on(Events.GuildCreate, (guild) => {
    if (!allowedServers.includes(guild.id)) {
        console.log(`Leaving unauthorized server: ${guild.name}`);
        guild.leave(); // Auto-leave unauthorized servers
    }
});

// 📌 Admin Message Command to Toggle Bot
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    const isAdmin = message.member.roles.cache.some(role => role.name === "Admin") || message.member?.permissions.has("ADMINISTRATOR");


    // ✅ Allow Admins to Toggle Bot
    if (isAdmin && message.content.toLowerCase() === "bot toggle") {
        botEnabled = !botEnabled;
        await new Promise(resolve => setTimeout(resolve, 100));
        return message.channel.send(`Bot is now **${botEnabled ? "enabled" : "disabled"}**.`);
    }

    if (isAdmin && message.content.toLowerCase() === "bot status") {
        await new Promise(resolve => setTimeout(resolve, 100));
        return message.channel.send(`Bot status: **${botEnabled ? "enabled" : "disabled"}**.`);
    }

    // ❌ If Bot is Disabled, Ignore Everything Else
    if (message.type === MessageType.Reply || isAdmin || !botEnabled) return;


    // ❌ Detect and Block Manual @Mentions
    const mentionedUsers = message.mentions.users;
    for (const user of mentionedUsers.values()) {
        if (restrictedUserIDs.includes(user.id)) {
            await message.delete();
            await message.channel.send(`${message.author}, manual mentions are not allowed.`);

            // ⏳ Track Offenses for Timeouts
            const userID = message.author.id;
            const offenses = (offenseTracker.get(userID) || 0) + 1;
            offenseTracker.set(userID, offenses);

            if (offenses === 1) {
                return message.channel.send(`${message.author}, this is a **warning**. Repeated @s will result in a timeout.`);
            } else if (offenses === 2) {
                await timeoutUser(message, 2); // Timeout for 2 minutes
            } else if (offenses === 3) {
                await timeoutUser(message, 5); // Timeout for 5 minutes
            } else if (offenses >= 4) {
                await timeoutUser(message, 15); // Timeout for 15 minutes
            }

            return;
        }
    }
});

// ⏳ Function to Timeout Users
async function timeoutUser(message, minutes) {
    const member = await message.guild.members.fetch(message.author.id);
    if (!member) return;

    const duration = minutes * 60 * 1000; // Convert minutes to milliseconds
    try {
        await member.timeout(duration, `Repeated @mention violations.`);
        message.channel.send(`${message.author} has been **timed out for ${minutes} minutes**.`);
    } catch (error) {
        console.error("Failed to timeout user:", error);
        message.channel.send(`Could not timeout ${message.author}. Missing permissions?`);
    }
}

// ✅ Bot Ready Message
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// 🚀 Login the Bot
client.login(token);
