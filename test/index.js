import { Client, Discord, chalk } from "../src/index.js";
import * as dotenv from "dotenv";
dotenv.config();

const client = new Client({
    discordClient: { // Tùy chọn cho Discord.Client
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
        developer: "788208207465938954" // ID discord của chủ bot.
    },
    commandHandler: { // Các tùy chọn mặc định của lệnh.
        setCurrentLanguage: "vi", // Ngôn ngữ mặc định khi chạy bot bạn có thể đổi qua vi hoặc en.
        messageCreate: true, // tùy chọn chạy messageCreate mặc định của modules.
        slashCommand: true, // bật hoặc tắt các lệnh slash.
        pathToCommand: { // tùy chọn mặc định dẫn đến thư mục lệnh.
            prefixCommand: "./test/PrefixCommands", // dẫn đến thư mục lệnh prefix bạn cũng có thể thêm boolean false để tắt nó.
            slashCommand: "./test/SlashCommands" // dẫn đến thư mục lệnh slash khi slashCommand được đặt thành false thì cái này sẽ vô dụng. 
        },
    },
});

client.on(Discord.Events.ClientReady, function (bot) {
    console.log(chalk.blue(`${bot.user.username} đã sắn sàng hoạt động`));
});
