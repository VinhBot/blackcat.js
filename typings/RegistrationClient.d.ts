import { ClientOptions as DiscordClientOptions, Collection as DiscordCollection, Client as DiscordClient } from "discord.js";

// Khai báo giao diện mặc định của modules
interface BlackCatClientOptions {
    /**
     * Thiết lập tùy chọn cho Client của bạn
     * @see https://discord.js.org/docs/packages/discord.js/14.14.1/Client:Class
     */
    discordClient?: DiscordClientOptions;
    /**
     * Định dạng cấu hình cho bot
     */
    config: {
        /** token của bot. */
        botToken: string;
        /** Prefix của bot. */
        botPrefix: string;
        /** ID của chủ bot. */
        developer: string;
    },
}
/**
 * Giao diện `Promises` đại diện cho một lời hứa (promise) có thể xử lý 
 * kết quả thành công hoặc thất bại.
 */
interface Promises {
    /**
     * Phương thức `then` được gọi khi lời hứa (promise) được hoàn thành (resolved).
     * 
     * @example
     * ```javascript
     * promise.then((client) => {
     *     // Xử lý kết quả thành công
     *     return someValue;
     * }).catch((error) => {
     *     // Xử lý lỗi
     * });
     * ```
     */
    then<T>(onfulfilled?: ((value: RegistrationClient) => T | PromiseLike<T>) | undefined | null): Promise<T>;
    /**
     * Phương thức `catch` được gọi khi lời hứa (promise) bị từ chối (rejected).
     * 
     * @example
     * ```javascript
     * promise.then((client) => {
     *     // Xử lý kết quả thành công
     * }).catch((error) => {
     *     // Xử lý lỗi
     *     return someErrorValue;
     * });
     * ```
     */
    catch<T>(onrejected?: ((reason: Error) => T | PromiseLike<T>) | undefined | null): Promise<T>;
}
// khóa và kiểu giá trị, cho phép định nghĩa linh hoạt cho các mục đích.
interface ClientConfig {
    [key: string]: any;
}
// xác định cấu hình config mặc định.
interface DefaultConfig {
    botToken: string;
    botPrefix: string;
    developer: string;
}
/**
 * thiết lập các cài đặt mặc định của modules
 */
interface CommandHandlerOptions {
    /**
     * Tùy chọn ngôn nhữ cho modules bao gồm vi, en.
     */
    setCurrentLanguage: "vi" | "en";
    /**
     * Thiết lập các lệnh prefix.
     */
    prefixCommand: {
        /**
         * Sử dụng events messageCreate của modules.
         */
        messageCreate: boolean;
        /**
         * Đường dẫn đến thư mục lệnh của bạn.
         * @example 
         * pathToCommand: "./pathToFolder/",
         */
        pathToCommand: string;
    };
    /**
     * Thiết lập các lệnh slash.
     */
    slashCommand: {
        /**
         * Phiên bản bạn muốn sử dụng
         */
        restVersion?: "10" | "9";
        /**
         * Chỉ sử dụng lệnh slash ở trong guild nhất định.
         * @example 
         * guildCommands: "guildId",
         */
        guildCommands?: string;
        /**
         * Đường dẫn đến thư mục lệnh slash của bạn.
         * @example 
         * pathToCommand: "./pathToFolder/",
         */
        pathToCommand: string;
    };
    /**
     * Thiết lập các sự kiện của discord.js
     */
    eventHandler: {
        /**
         * Tên thư mục chứa các Events.
         */
        eventFolder: Array<any>;
        /**
         * Đường dẫn đến thư mục sự kiện của bạn.
         * @example
         * pathToEvent: "./pathToEvent",
         */
        pathToEvent: string;
    };
}
/**
 * 
 */
interface ClientOptions<Config extends ClientConfig> {
    /**
     * Thiết lập tùy chọn cho Client của bạn
     * @see https://discord.js.org/docs/packages/discord.js/14.14.1/Client:Class
     */
    discordClient?: DiscordClientOptions;
    /**
     * Định dạng cấu hình cho bot
     */
    config: Config | DefaultConfig,
    /**
     * thiết lập các cài đặt mặc định của modules
     */
    commandHandler: CommandHandlerOptions;
}
/**
 * Đăng ký và bắt đầu sử dụng discord api.
 */
export class RegistrationClient<T extends ClientConfig = ClientConfig> extends DiscordClient {
    /**
     * Collection lưu trữ danh sách các lệnh (/commands) theo tên.
     */
    public slashCommands: DiscordCollection<string, string>;
    /**
     * Collection lưu trữ thời gian cooldown của mỗi lệnh.
     */
    public cooldowns: DiscordCollection<string, number>;
    /**
     * Collection lưu trữ danh sách các lệnh theo tên.
     */
    public commands: DiscordCollection<string, string>;
    /**
     * Collection lưu trữ các bí danh của các lệnh.
     */
    public aliases: DiscordCollection<string, string>;
    /**
     * cấu hình config của bot.
     */
    public config: T | DefaultConfig;
    /**
     * Thiết lập các cài đặt mặc định cho bôj điều khiển lệnh.
     * @example 
     * .setCommandHandler({
     *      prefixCommand: {
     *          messageCreate: false,
     *          pathToCommand: "./commands/"
     *      },
     *      slashCommand: {
     *          restVersion: "10",
     *          guildCommands: "guildID",
     *          pathToCommand: "./commands"
     *      },
     *      eventHandler: {
     *          eventFolder: ["Guilds"],
     *          pathToEvent: "./Events"
     *      },  
     * });
     */
    public setCommandHandler(options: CommandHandlerOptions): Object;
    /**
     * Thực thi các cài đặt đã xác định.
     */
    public build(options: {
        /**
         * có hay không sử dụng login mặc định của modules
         */
        login: boolean;
        /**
         * In ra thông báo nếu có phiên bản mới.
         */
        checkUpdate: boolean;
    }): Promises;
    /**
     * Thiết lập token cho bot.
     */
    public setToken(options: string): String;
    /**
     * Chuyển đổi và đưa client sang dạng json.
     */
    public JSON(): Object;
    /**
     * Hàm constructor của lớp Client bao gồm 3 mục chính: discordClient, config, commandHandler
     * @example 
     * const { RegistrationClient, Discord } = require("blackcat.js");
     * const client = new RegistrationClient({
     *      discordClient: { // Tùy chọn cho Discord.Client
     *          allowedMentions: {
     *              parse: ["roles", "users", "everyone"],
     *              repliedUser: false,
     *          },
     *          partials: [Discord.Partials.User], 
     *          intents: ["Guilds", "GuildMessages"]
     *      },
     *      config: { // Các tùy chọn config mặc định.
     *          botToken: process.env.botToken || "token bot", // Mã token của bot.
     *          botPrefix: "!", // Prefix để chạy bot.
     *          developer: "DiscordID" // ID discord của chủ bot.
     *      },
     *      commandHandler: { // Các tùy chọn mặc định của lệnh.
     *          setCurrentLanguage: "vi", 
     *          prefixCommand: {
     *              messageCreate: false,
     *              pathToCommand: "./commands",
     *          },
     *          slashCommand: {
     *              restVersion: "10",
     *              guildCommands: "", // 
     *              pathToCommand: "./commands",
     *          },
     *          eventHandler: {
     *              eventFolder: ["Guilds"],
     *              pathToEvent: "./Events"
     *          }
     *      },
     * });
     * client.build({ login: true, checkUpdate: true });
     */
    constructor(options: ClientOptions<T>);
}