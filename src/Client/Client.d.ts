import Discord, { ClientOptions, Collection } from "discord.js";
// Khai báo giao diện mặc định của modules
interface Options {
    /**
     * @param {Discord.Client} discordClient - sự kiện tùy chọn client của bạn 
     */
    discordClient?: ClientOptions,
    /**
     * @param {string} botToken - Token Của bot https://discord.com/developers/applications/
     * @param {string} botPrefix - Prefix của bot
     * @param {string} developer - ID của chủ bot 
     */
    config: {
        botToken: string;
        botPrefix: string;
        developer: string;
    },
    /**
     * @param {Object} commandHandler - Các tùy chọn mặc định
     */
    commandHandler: {
        /**
         * @param {string} setCurrentLanguage - Tùy chọn ngôn ngữ của package bao gồm vi và en.
         */
        setCurrentLanguage: string;
        /**
         * @param {boolean} slashCommand - Bật hoặc tắt chế độ slashCommand của package.
         */
        slashCommand: boolean;
        /**
         * @param {boolean} messageCreate - Bật hoặc tắt chế độ messageCreate của package.
         */
        messageCreate: boolean;
        /**
         * @param {string} pathToCommand - Các tùy chọn đường dẫn đến thư mục lệnh.
         */
        pathToCommand: {
            /**
             * @param {string | boolean | undefined} pathToCommand - Đường dẫn đến thư mục lệnh prefix của bạn.
             */
            prefixCommand: string | boolean | undefined;
            /**
             * @param {string} slashCommand - Đường dẫn đến thư mục lệnh slash của bạn.
             */
            slashCommand: string;
        }
    }
}
// 
/**
 * Định nghĩa lớp Client kế thừa từ Discord.Client
 */
export class Client extends Discord.Client {
    /**
     * Collection lưu trữ danh sách các lệnh (/commands) theo tên
     * @param {Collection<string, string>}
     */
    public slashCommands: Collection<string, string>;
    /**
     * Collection lưu trữ thời gian cooldown của mỗi lệnh
     * @param {Collection<string, number>}
     */
    public cooldowns: Collection<string, number>;
    /**
     * Collection lưu trữ danh sách các lệnh theo tên
     * @param {Collection<string, string>}
     */
    public commands: Collection<string, string>;
    /**
     * Collection lưu trữ các bí danh của các lệnh
     * @param {Collection<string, string>}
     */
    public aliases: Collection<string, string>;
    /**
     * Cấu hình của bot, bao gồm thông tin token, prefix và nhà phát triển
     * @param {string} botToken - Token Của bot https://discord.com/developers/applications/
     * @param {string} botPrefix - Prefix của bot
     * @param {string} developer - ID của chủ bot 
     */
    public config: {
        botToken: string;
        botPrefix: string;
        developer: string;
    };
    /**
     * Hàm constructor của lớp Client bao gồm 3 mục chính: discordClient, config, commandHandler
     * @param {Object} options
     */
    constructor(options: Options) {
        // Gọi constructor của Discord.Client với các tùy chọn được cung cấp
        super(options.discordClient || {
            allowedMentions: {
                parse: Array<Discord.AllowedMentionsTypes>,
                repliedUser: Boolean,
            },
            partials: [],
            intents: [],
        })
    }
}