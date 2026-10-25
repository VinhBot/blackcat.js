import path from "node:path";
import { GatewayIntentBits, Partials } from "discord.js";
import { Client, CommandManager, ContextMenuManager, EventManager, SlashCommandManager } from "blackcat.js-discord";
// Nạp biến môi trường từ file .env (Node >= 20.12). Bỏ qua nếu không có file.
try {
    process.loadEnvFile();
}
catch {
    /* dùng biến môi trường của hệ thống */
}
const botToken = process.env.BOT_TOKEN;
if (!botToken)
    throw new Error("Thiếu BOT_TOKEN. Hãy điền token vào file .env (xem .env.example).");
const config = {
    botToken,
    prefix: process.env.PREFIX ?? "!",
    // Để trống = đăng ký slash command toàn cục (có thể mất tới ~1 giờ để hiện). Điền ID guild để thấy ngay khi dev.
    guildIDs: (process.env.GUILD_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean),
};
// Đường dẫn tuyệt đối tới thư mục con của src/ — chạy từ đâu cũng được.
const dir = (name) => path.join(import.meta.dirname, name);
const client = new Client({
    discordClientOptions: {
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
        partials: [Partials.Channel, Partials.Message],
        allowedMentions: { parse: ["users", "roles"], repliedUser: false },
    },
    config,
    // 🎧 Event: src/events/<scope>/*.js
    eventManager: new EventManager({
        directory: dir("events"),
        scopes: ["client"],
        onLoad: (event) => console.log(`✅ event: ${event.eventName}`),
        onError: (event) => console.error(`❌ event ${event.file}:`, event.error),
    }),
    // 💬 Message command (prefix): src/commands/<category>/*.js
    commandManager: new CommandManager({
        directory: dir("commands"),
        prefix: config.prefix,
        onLoad: (command) => console.log(`✅ command: ${command.commandName}`),
        onError: (command) => console.error(`❌ command ${command.file}:`, command.error),
    }),
    // ⚡ Slash command: src/slashCommands/<category>/*.js
    slashCommandManager: new SlashCommandManager({
        directory: dir("slashCommands"),
        guildID: config.guildIDs,
        onLoad: (command) => console.log(`✅ slash: /${command.commandName}`),
        onError: (command) => console.error(`❌ slash ${command.file}:`, command.error),
    }),
    // 🖱️ Context menu (chuột phải vào người dùng / tin nhắn): src/contextMenus/<type>/*.js
    // Được đăng ký chung với slash command.
    contextMenuManager: new ContextMenuManager({
        directory: dir("contextMenus"),
        onLoad: (command) => console.log(`✅ context menu: ${command.commandName} (${command.type})`),
        onError: (command) => console.error(`❌ context menu ${command.file}:`, command.error),
    }),
});
await client.start();
