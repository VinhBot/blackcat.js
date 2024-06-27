const { RegistrationClient, Discord } = require("../src/blackcat.js");
const dotenv = require("dotenv");
dotenv.config();

const client = new RegistrationClient({
    discordClient: { // Tùy chọn cho Discord.Client.
        allowedMentions: {
            parse: ["roles", "users", "everyone"],
            repliedUser: false,
        },
        partials: [Discord.Partials.User, Discord.Partials.Message, Discord.Partials.Reaction], // Object.keys(Discord.Partials), // get tất cả sự kiện mà partials
        intents: ["Guilds", "GuildMessages", "MessageContent", "GuildInvites", "GuildMembers", "GuildPresences", "GuildMessageReactions", "GuildVoiceStates"],// lấy tất cả sự kiện mà Discord.GatewayIntentBits có
    },
    config: { // Các tùy chọn config mặc định.
        botToken: process.env.botToken, // Mã token của bot.
        botPrefix: "!", // Prefix để chạy bot.
        developer: "788208207465938954", // ID discord của chủ bot.
        prefixCommand: "sdsdsdsd"
    },
    commandHandler: { // Các tùy chọn mặc định của lệnh.
        setCurrentLanguage: "vi",
        prefixCommand: {
            messageCreate: false,
            pathToCommand: "./PrefixCommands",
        },
        slashCommand: {
            restVersion: "10",
            pathToCommand: "./SlashCommands",
        },
        eventHandler: {
            eventFolder: ["Guilds"],
            pathToEvent: "./Events"
        }
    },
});

client.build({ login: false, checkUpdate: true });