import { RegistrationClient, Partials, chalk } from "../src/blackcat.js"; // "blackcat.js"
import * as dotenv from "dotenv";
dotenv.config();
const client = new RegistrationClient({
    discordClient: { // Tùy chọn cho Discord.Client
        allowedMentions: {
            parse: ["roles", "users", "everyone"],
            repliedUser: false,
        },
        partials: [Partials.User, Partials.Message, Partials.Reaction], // Object.keys(Discord.Partials), // get tất cả sự kiện mà partials
        intents: ["Guilds", "GuildMessages", "MessageContent", "GuildInvites", "GuildMembers", "GuildPresences", "GuildMessageReactions", "GuildVoiceStates"],// lấy tất cả sự kiện mà Discord.GatewayIntentBits có
    },
    config: { // Các tùy chọn config mặc định.
        botToken: process.env.botToken || "token bot", // Mã token của bot.
        botPrefix: "!", // Prefix để chạy bot.
        developer: "788208207465938954" // ID discord của chủ bot.
    },
    commandHandler: { // Các tùy chọn mặc định của lệnh.
        setCurrentLanguage: "vi",
        prefixCommand: {
            messageCreate: false,
            pathToCommand: "./commands",
        },
        slashCommand: {
            restVersion: "10",
            pathToCommand: "./commands",
        },
        eventHandler: {
            eventFolder: ["Guilds"],
            pathToEvent: "./Events"
        }
    },
});

client.build({ login: false });