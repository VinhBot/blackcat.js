import { Client as BlackCatClient, Discord, chalk } from "../lib/index.js";

const client = new BlackCatClient({
    discordClient: {
        allowedMentions: {
            parse: ["roles", "users", "everyone"],
            repliedUser: false,
        },
        partials: [Discord.Partials.User, Discord.Partials.Message, Discord.Partials.Reaction], // Object.keys(Discord.Partials), // get tất cả sự kiện mà partials
        intents: ["Guilds", "GuildMessages", "MessageContent", "GuildInvites", "GuildMembers", "GuildPresences", "GuildMessageReactions", "GuildVoiceStates"],// lấy tất cả sự kiện mà Discord.GatewayIntentBits có
    },
    // config.json
    config: {
        botToken: "ODgxNzA5MTQ2Njk1NjY3Nzcz.GMoXI8.GuSJ1-5qiA4jfDca6dfTo2Dbrp_3PgvVB7trA8",
        botPrefix: "!",
        developer: "788208207465938954",
    },
    // bảng điều khiển tùy chỉnh lệnh
    commandHandler: {
        setCurrentLanguage: "vi", // ngôn ngữ tùy chỉnh của gói. Hiện tại chỉ hỗ trợ 2 ngôn ngữ: vi: Tiếng Việt và en: Tiếng Anh
        prefixCommand: true, // bật hoặc tắt lệnh đang chạy với prefix
        slashCommand: false, // bật hoặc tắt lệnh slash
        pathToCommand: {
            prefixCommand: "./test/PrefixCommands", // path to prefix commands
            slashCommand: "./test/SlashCommands", // path to slash commands
        },
    },
});

client.on(Discord.Events.ClientReady, function(bot) {
    console.log(chalk.blue(`${bot.user.username} đã sắn sàng hoạt động`));
});