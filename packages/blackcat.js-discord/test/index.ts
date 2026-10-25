import path from "node:path";

import { Client, CommandBuilder, CommandManager, ContextMenuManager, EventManager, SlashCommandManager, Discord } from "../src";
import ban from "./commands/Moderation/ban";
import toggle from "./commands/Admin/toggle";

// Token & ID lấy từ biến môi trường (xem .env.example). TUYỆT ĐỐI không hardcode token vào source.
try { process.loadEnvFile(); } catch { /* không có file .env: dùng biến môi trường của hệ thống */ }
const botToken = process.env.BOT_TOKEN;
if (!botToken) throw new Error("Thiếu BOT_TOKEN. Hãy copy .env.example thành .env và điền token.");

const config = {
    botToken,
    prefix: "!",
    guildID: (process.env.GUILD_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean),
};

const dir = (name: string) => path.join(import.meta.dirname, name);

const client = new Client<false>({
    discordClientOptions: {
        intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.MessageContent, Discord.GatewayIntentBits.GuildMembers],
        partials: [Discord.Partials.Channel, Discord.Partials.Message, Discord.Partials.Reaction, Discord.Partials.User],
        allowedMentions: {
            parse: ["users", "roles"],
            repliedUser: false
        },
    },
    config: config,
    eventManager: new EventManager({
        directory: dir("events"),
        scopes: ["client"],
        onLoad: (event) => {
            console.log(`${event.file} - ok`);
        },
        onError: (event) => {
            console.error(`${event.file}:`, event.error);
        }
    }),
    commandManager: new CommandManager({
        // directory: "./commands",
        prefix: config.prefix,
        // prefix: async(guildID) => {
        //     if(!guildID) return config.prefix;
        //     return config.prefix;
        // },
        mentionPrefixResponse: (prefix) => ({ content: `Prefix của tôi: ${prefix}` }),
        onLoad: (command) => console.log(`commands: ${command.commandName} - ok`),
        onError: (command) => console.error(`${command.file}:`, command.error),
    }),
    slashCommandManager: new SlashCommandManager({
        directory: dir("slashCommands"),
        guildID: config.guildID,
        reset: {
            guild: true
        },
        onLoad: (command) => console.log(`slashCommands: ${command.commandName} - ok`),
        onError: (command) => console.error(`${command.file}:`, command.error),
    }),
    // Context menu (chuột phải vào người dùng / tin nhắn). Được đăng ký CHUNG với slash command.
    contextMenuManager: new ContextMenuManager({
        directory: dir("contextMenus"),
        onLoad: (command) => console.log(`contextMenus: ${command.commandName} (${command.type}) - ok`),
        onError: (command) => console.error(`${command.file}:`, command.error),
    }),
});

const pings = new CommandBuilder({
    commandName: "ping",
    execute: (client, message, args) => {
        return message.reply({ content: `ping của tôi là ${client.discord.ws.ping}` });
    },  
});

client.commandManager.registerCommand([pings, ban, toggle]);

client.start();