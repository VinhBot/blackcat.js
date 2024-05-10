import { EmojiIdentifierResolvable as DiscordEmojiIdentifierResolvable, PermissionsString as DiscordPermissionsString, ClientOptions as DiscordClientOptions, ClientEvents as DiscordClientEvents, ButtonStyle as DiscordButtonStyle, Interaction as DiscordInteraction, Collection as DiscordCollection, Message as DiscordMessage, Client as DiscordClient } from "discord.js";
import { ParsedPath } from "node:path";
import { URL } from "node:url";
// export package
export * from "discord.js";
export const chalk: typeof import("chalk");
// #region Client
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
    /**
     * thiết lập các cài đặt mặc định của modules
     */
    commandHandler: {
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
    };
}
//
interface buildOptions {
    /**
     * có hay không sử dụng login mặc định của modules
     */
    login: boolean;
}
//
interface Promises {
    then<T>(onfulfilled?: ((value: RegistrationClient) => T | PromiseLike<T>) | undefined | null): Promise<T>;
    catch<T>(onrejected?: ((reason: Error) => T | PromiseLike<T>) | undefined | null): Promise<T>;
}
/**
 * 
 */
export class RegistrationClient extends DiscordClient {
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
    public config: BlackCatClientOptions["config"];
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
    public setCommandHandler(options: BlackCatClientOptions["commandHandler"]): Object;
    /**
     * Thực thi các cài đặt đã xác định.
     */
    public build(options: buildOptions): Promises;
    /**
     * Thiết lập token cho bot.
     */
    public setToken(options: string): String;
    /**
     * 
     */
    public JSON(): Object;
    /**
     * Hàm constructor của lớp Client bao gồm 3 mục chính: discordClient, config, commandHandler
     * @example 
     * import { RegistrationClient, Partials } from "blackcat.js";
     * const client = new RegistrationClient({
     *      discordClient: { // Tùy chọn cho Discord.Client
     *          allowedMentions: {
     *              parse: ["roles", "users", "everyone"],
     *              repliedUser: false,
     *          },
     *          partials: [Partials.User], 
     *          intents: ["Guilds", "GuildMessages"]
     *      },
     *      config: { // Các tùy chọn config mặc định.
     *          botToken: process.env.botToken || "token bot", // Mã token của bot.
     *          botPrefix: "!", // Prefix để chạy bot.
     *          developer: "788208207465938954" // ID discord của chủ bot.
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
     * client.build({ login: true });
     */
    constructor(options: BlackCatClientOptions);
}
// #region Commands
interface CommandBuilderOptions {
    /**
     * Lệnh chỉ dành cho chủ bot
     */
    owner: boolean;
    /**
     * Thời gian tái sử dụng lệnh (trong miligiây)
     */
    cooldown: number;
    /**
     * Quyền cần thiết để sử dụng lệnh
     */
    permissions?: Array<DiscordPermissionsString>;
    /**
     * Mô tả của lệnh
     */
    description: string;
    /**
     * Thư mục chứa lệnh
     */
    category?: string;
    /**
     * Tên lệnh phụ của lệnh
     */
    aliases?: Array<any>;
    /**
     * Cách sử dụng lệnh
     */
    usage?: string;
    /**
     * Tên của lệnh
     */
    name: string;
    /**
     * Hàm thực thi chính của lệnh
     */
    executeCommand: (client: RegistrationClient, message: DiscordMessage, args: any[]) => void;
}
// CommandBuilder
export declare class CommandBuilder {
    /**
     * Đại diện cho một bộ xây dựng (builder) cho các lệnh bot.
     * @example 
     * import { CommandBuilder } from "blackcat.js";
     * // hoặc.
     * const { CommandBuilder } = require("blackcat.js");
     * 
     * const Commands = new CommandBuilder({
     *      name: "Tên của lệnh",
     *      aliases: ["Lệnh phụ của lệnh"],
     *      category: "Danh mục của lệnh",
     *      description: "Mô tả chức năng của lệnh",
     *      permissions: ["Quyền cần thiết để sử dụng lệnh"],
     *      usage: " Cách sử dụng lệnh",
     *      cooldown: 3000, // Thời gian cooldown (trong miligiây<3000 sẽ là 3s>), 
     *      executeCommand: (client, message, args) => {
     *          // Hàm thực thi lệnh.
     *      },
     * });
     * // hoặc
     * // Commands.executeCommand((client, message, args) => {
     * //     return message.reply({ content: `${client.ws.ping} ms...` });
     * // });
     * // console.log(Commands.toJSON()); // Hiển thị lệnh dưới dạng JSON.
     * export default Commands;
     * // hoặc.
     * module.exports = Commands;
    */
    constructor(options: CommandBuilderOptions);
    /**
     * Hàm thực thi lệnh của bạn
     */
    public executeCommand(callback: (client: RegistrationClient, message: DiscordMessage, args: any[]) => void): void;
    /**
     * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh.
     */
    public toJSON(): Object;
}

interface SlashCommandBuilderOptions {
    /**
     * Tên của lệnh 
     */
    name: string;
    /**
     * Mô tả của lệnh
     */
    description: string;
    /**
     * Quyền cần thiết để người dùng có thể sử dụng lệnh
     */
    userPerms?: Array<DiscordPermissionsString>;
    /**
     * Lệnh chỉ dành cho chủ bot
     */
    owner: boolean;
    /**
     * Thời gian chờ tái sử dụng lệnh
     */
    cooldown: number;
    /**
     * Thư mục chứa lệnh
     */
    category: string;
    /**
     * 
     */
    type: string;
    /**
     * 
     */
    options: Array<{
        name: string;
        type: "Subcommand" | "SubcommandGroup" | "String" | "Integer" | "Boolean" | "User" | "Channel" | "Role" | "Mentionable" | "Number" | "Attachment";
        description: string;
        required: boolean;
        options?: Array<any>;
        choices?: Array<{
            name: string;
            value: string;
        }>
    }>;
    /**
     * Hàm thực thi chính của lệnh
     */
    executeCommand: (client: RegistrationClient, interaction: DiscordInteraction) => void;
}
// SlashCommand
export declare class SlashCommandBuilders {
    /**
     * Đại diện cho một bộ xây dựng (builder) cho các lệnh slash (slash commands) trên Discord.
     * @example 
     * import { SlashCommandBuilders, ApplicationCommandType } from "blackcat.js";
     * const PingCommands = new SlashCommandBuilders({
     *      name: getFileNameAndFolder(import.meta.url).fileName.name, // Tên của lệnh slash
     *      category: getFileNameAndFolder(import.meta.url).folderName.name, // Thư mục chứa lệnh
     *      type: ApplicationCommandType.ChatInput, // Kiểu lệnh.
     *      description: "Hiển thị độ trễ phản hồi của bot", // Mô tả của lệnh
     *      userPerms: ["SendMessages"], // Các quyền đề sử dụng lệnh, mặc định sẽ là "SendMessage"
     *      owner: false, // Lệnh chỉ dành cho chủ bot
     *      cooldown: 10, // Thời gian tái sử dụng lệnh
     *      options: [], // Các tùy chọn khác của lệnh 
     *      executeCommand: (client, interaction) => {
     *          // Hàm thực thi lệnh
     *      },
     * });
     * export default PingCommands;
     */
    constructor(options: SlashCommandBuilderOptions);
    /**
     * Hàm thực thi lệnh của bạn  
     */
    public executeCommand(callback: (client: RegistrationClient, interaction: DiscordInteraction) => void): void; // Thêm kiểu dữ liệu cho các tham số
    /**
     * Chuyển đổi bộ xây dựng lệnh slash thành đối tượng JSON.
     * @returns {Object} Biểu diễn JSON của bộ xây dựng lệnh slash.
     */
    public toJSON(): Object;
}
// #region Functions
// Định nghĩa kiểu cho một nút
interface ButtonBuilder {
    /**
     * Kiểu của thành phần (ButtonBuilder).
     */
    type: "ButtonBuilder",
    /**
     * Các lựa chọn cho ButtonBuilder
     */
    options: Array<{
        /**
         * ID tùy chỉnh cho button.
         */
        customId: string;
        /**
         * Cho biết button có bị vô hiệu hóa không.
         */
        disabled?: boolean;
        /**
         * tên được hiển thị trên button.
         */
        label: string;
        /**
         * Kiểu của button. Có thể là "Primary", "Secondary", "Success", "Danger" hoặc "Link".
         */
        style: "Primary" | "Secondary" | "Success" | "Danger" | "Link";
        /**
         * Emoji được hiển thị trên button.
         */
        emoji?: string | DiscordEmojiIdentifierResolvable;
        /**
         * URL mà button sẽ chuyển hướng đến nếu được nhấp.
         */
        url?: string;
    }>
}
// Định nghĩa kiểu cho một menu lựa chọn
interface SelectMenuBuilder {
    /**
     * Kiểu của thành phần (SelectMenuBuilder).
     */
    type: "SelectMenuBuilder",
    /**
     * Các lựa chọn cho SelectMenuBuilder - https://discord.js.org/docs/packages/builders/1.7.0/StringSelectMenuOptionBuilder:Class
     */
    options: {
        /**
         * ID tùy chỉnh cho menu lựa chọn.
         */
        customId: string;
        /**
         * được hiển thị trong menu lựa chọn.
         */
        placeholder: string;
        /**
         * Mảng các tùy chọn cho menu lựa chọn.
         */
        options: Array<{
            /**
             * Có phải là giá trị mặc định không.
             */
            default?: boolean;
            /**
             * Mô tả cho tùy chọn.
             */
            description?: string;
            /**
             * Emoji hiển thị bên cạnh tùy chọn.
             */
            emoji?: {
                /**
                 * Emoji id
                 */
                id?: string;
                /**
                 * Tên Emoji
                 */
                name?: string;
                /**
                 * Biểu tượng cảm xúc này có hoạt hình hay không
                 */
                animated?: boolean;
            };
            /**
             * Nhãn cho tùy chọn.
             */
            label: string;
            /**
             * Giá trị của tùy chọn.
             */
            value: string;
        }>;
        /**
         * Cho biết menu lựa chọn có bị vô hiệu hóa không.
         */
        disabled?: boolean;
        /**
         * Số lượng giá trị tối đa có thể được chọn.
         */
        maxValues?: number;
        /**
         * Số lượng giá trị tối thiểu có thể được chọn.
         */
        minValues?: number;
    }
}
// Lớp ComponentBuilder cho phép xây dựng các thành phần của Discord
export declare class ComponentBuilders {
    /**
     * Constructor cho ComponentBuilder.
     * @param {Array} components - Mảng để lưu trữ các thành phần.
     * @example
     * const createComponent = new ComponentBuilder([
     *  // https://discordjs.guide/message-components/buttons.html#building-buttons
     *  {
            type: "ButtonBuilder", // Kiểu của thành phần (ButtonBuilder).
            options: [
                {
                    customId: "button1", // ID tùy chỉnh cho button.
                    label: "Button 1", // tên được hiển thị trên button.
                    style: "Secondary", // Kiểu của button. Có thể là "Primary", "Secondary", "Success", "Danger" hoặc "Link".
                    disabled: false, // Cho biết button có bị vô hiệu hóa không.
                },
                {
                    customId: "button2", // ID tùy chỉnh cho button.
                    label: "Button 2", // tên được hiển thị trên button.
                    style: "Danger", // Kiểu của button. Có thể là "Primary", "Secondary", "Success", "Danger" hoặc "Link".
                    disabled: false, // Cho biết button có bị vô hiệu hóa không.
                }
            ]
        },
        // https://discordjs.guide/message-components/select-menus.html#building-string-select-menus
        {
            type: "SelectMenuBuilder", // Kiểu của thành phần (SelectMenuBuilder).
            options: {
                placeholder: "Vui lòng lựa chọn mục theo yêu cầu", // được hiển thị trong menu lựa chọn 
                customId: "StringSelectMenuBuilder", // ID tùy chỉnh cho menu lựa chọn.
                disabled: false, // Cho biết menu lựa chọn có bị vô hiệu hóa không.
                maxValues: 1, // Số lượng giá trị tối đa có thể được chọn.
                minValues: 1, // Số lượng giá trị tối thiểu có thể được chọn.
                options: [
                    {
                        label: "Option 1", // Nhãn cho tùy chọn.
                        value: "option1", // Giá trị của tùy chọn.
                    },
                ]
            }
        }
    ]);
    message.reply({ components: createComponent });
     */
    constructor(components: Array<ButtonBuilder | SelectMenuBuilder>);
}
/**
 * Hàm lấy thông tin về tên file và thư mục chứa file từ một URL file.
 * @param {string | URL} currentFileUrl - URL của file hiện tại.
 * @returns {{ fileName: ParsedPath, folderName: ParsedPath }} - Đối tượng chứa fileName và folderName.
 * @example 
 *  const getName = getFileNameAndFolder(import.meta.url).fileName.name; // lấy tên của file
 *  const getFolderName = getFileNameAndFolder(import.meta.url).folderName.name; // lấy tên của folder
 *
 *  console.log(getName); // Output: getFileNameAndFolder.js
 *  console.log(getFolderName); // Output: Function
 */
export function getFileNameAndFolder(currentFileUrl: string | URL): { fileName: ParsedPath, folderName: ParsedPath };
/**
 * Chuyển đổi đường dẫn tệp thành URL toàn cầu (global URL) sử dụng pathToFileURL của Node.js.
 * @param path Đường dẫn tệp cần chuyển đổi.
 * @returns URL toàn cầu hoặc đường dẫn ban đầu nếu chuyển đổi không thành công.
 */
export declare function globalFilePath(path: string): string;
/**
 * @info Chuyển đổi một chuỗi thời gian vào giá trị tương ứng tính bằng mili giây.
 * @param {string} str Chuỗi thời gian cần chuyển đổi.
 * @returns {number} Tổng thời gian tính bằng mili giây.
 * @example
 * import { ms } from "blackcat.js";
 * const timeString = "1w 3d 5h";
 * const totalTimeInMs = ms(timeString);
 * console.log(totalTimeInMs); // Output: 910800000 (tổng thời gian tính bằng mili giây)
 */
export declare function ms(str: string): number;
/**
 * Chuyển đổi kiểu của button thành giá trị hợp lệ.
 * @param {string} style - Kiểu của button.
 * @returns {DiscordButtonStyle | number | undefined} - Giá trị kiểu của button hoặc undefined nếu không hợp lệ.
 * @example 
 *  const styles = toButtonStyle("Secondary");
 *  console.log(styles); // Output: 2
 */
export declare function toButtonStyle(style: "Primary" | "Secondary" | "Success" | "Danger" | "Link"): DiscordButtonStyle | number | undefined;
/**
 * @info Chuyển đổi mã màu hex sang dạng RGB.
 * @param {string} hex Mã màu hex cần chuyển đổi.
 * @returns {number[]} Mảng chứa giá trị RGB tương ứng.
 * @example
 * import { toRgb } from "blackcat.js";
 * const hexColor = "#3498db";
 * const rgbArray = toRgb(hexColor);
 * console.log(rgbArray); // Output: [52, 152, 219]
 */
export declare function toRgb(hex: string): number[];
// #region Guilds
/**
 * @example
 * const events = new EventBuilder({
 *      eventCustomName: "events.js",
 *      eventName: Discord.Events,
 *      eventOnce: false,
 *      executeEvents: (client, ...) => {
 *          // code ở đây
 *      }
 * });
 */

export declare class EventBuilder<Event extends keyof DiscordClientEvents> {
    constructor(options: {
        /**
         * Tên tùy chỉnh của sự kiện 
         */
        eventCustomName: string;
        /**
         * Tên sự kiện Discord.Events
         */
        eventName: Event;
        /**
         * Chỉ chạy events 1 lần
         */
        eventOnce: boolean;
        /**
         * Hàm thực thi sự kiện khi được yêu cầu
         */
        executeEvents: (client: RegistrationClient, ...args: DiscordClientEvents[Event]) => void;
    })
    /**
     * Chuyển đổi thể hiện EventBuilders thành một đối tượng JSON.
     * @returns {object} đưa EventBuilder thành dạng json.
     */
    public toJSON(): Object;
}
/**
 * Hàm xử lý tin nhắn được tạo ra.
 * @param {Client} client - Đối tượng client của Discord.Client.
 * @param {Object} options - Đối tượng chứa thông tin cần thiết để xử lý tin nhắn.
 * @param {Message} options.message - Đối tượng tin nhắn từ Discord.MessageCreate.
 * @param {string} options.prefix - Prefix của bot
 */
export declare function MessageCreate(client: RegistrationClient, message: DiscordMessage, prefix: string): void;
// #region Private
/**
 * Lấy chuỗi dựa trên thông tin được cung cấp
 * @param {object} options - Đối tượng chứa thông tin cần thiết để lấy chuỗi
 * @param {string} options.lang - Ngôn ngữ cần lấy chuỗi
 * @param {string} options.key - Khóa của chuỗi cần lấy
 * @param {object} [options.replacements={}] - Đối tượng chứa các giá trị thay thế (mặc định là đối tượng trống)
 * @returns {string} - Chuỗi đã được dịch
 */
export declare function getLocalizedString(options: {
    lang: string;
    key: string;
    replacements?: { [key: string]: string };
}): string;
