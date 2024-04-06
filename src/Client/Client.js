// Import Modules
import Discord from "discord.js";
import chalk from "chalk";
// Import Files
import { MessageCreate } from "../Guilds/MessageCreate.js";
import slashCommands from "../Handlers/slashCommands.js";
import commandHander from "../Handlers/Commands.js";

export class Client extends Discord.Client {
    constructor (options) {
        super(options.discordClient || {
            allowedMentions: {
                parse: [
                    Discord.AllowedMentionsTypes.User,
                    Discord.AllowedMentionsTypes.Role, 
                    Discord.AllowedMentionsTypes.Everyone
                ],
                repliedUser: false,
            },
            partials: [Object.keys(Discord.Partials)],
            intents: ["Guilds", "GuildMessages", "MessageContent", "GuildMembers", "GuildVoiceStates"],
        });
        // Khởi tạo các Discord.Collection để lưu trữ giá trị
        this.slashCommands = new Discord.Collection(); // Khởi tạo một Discord.Collection để lưu trữ slash commands.
        this.cooldowns = new Discord.Collection(); // Khởi tạo một Discord Collection để quản lý cooldown của lệnh.
        this.commands = new Discord.Collection(); // Khởi tạo một Discord Collection để lưu trữ các lệnh thông thường.
        this.aliases = new Discord.Collection(); // Khởi tạo một Discord Collection để lưu trữ các bí danh của lệnh.
        // Các tùy chọn cấu hình config.
        this.config = options.config;
        // bảng điều khiển tùy chỉnh lệnh
        this.setEventHandler(options.commandHandler);
        // khởi chạy bot
        if (!this.config.botToken) {
            console.error(chalk.blue("[BlackCat.JS]: ") + chalk.red("Bạn chưa set token cho bot"));
        } else this.login(this.config.botToken);
    };
    // thiết lập sự kiện
    async setEventHandler(options = {}) {
        this.currentLanguage = options.setCurrentLanguage || "vi"; // đặt ngôn ngữ hiện tại của package mặc định sẽ là vi
        // sử dụng command prefix
        commandHander(this, options); // nó sẽ tự chạy khi đầu vào là một string ( có đường dẫn đến folder commands);
        if (options.messageCreate) { // khởi chạy sự kiện message
            this.on(Discord.Events.MessageCreate, (message) => MessageCreate(this, message));
        };
        // 
        if(options.slashCommand) return slashCommands(this, options);
    };
};