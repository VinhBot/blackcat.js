import type { ClientOptions as DiscordClientOptions } from "discord.js";
import { Client as DiscordClient, Collection, Partials, GatewayIntentBits } from "discord.js";

import type { CommandBuilder, SlashCommandBuilder } from "./builder";
import { CommandManager, EventManager, SlashCommandManager } from "./manager";

/**
 * Cấu hình cơ bản của bot.
 */
export type Config = {
    /**
     * Token đăng nhập bot Discord.
     */
    botToken: string;
    /**
     * id của chủ bot
     */
    ownerID: string[];
    /**
     * Các cấu hình bổ sung tùy ý của người dùng.
     */
    [key: string]: unknown;
};

/**
 * Options khởi tạo {@link Client}.
 */
export interface ClientOptions {
    /**
     * Tùy chọn cấu hình nâng cao cho Discord.js Client.
     *
     * @remarks
     * Thuộc tính này cho phép bạn truyền các options trực tiếp tới
     * {@link DiscordClient} của discord.js khi khởi tạo client.
     *
     * Sử dụng khi bạn muốn:
     * - Thay đổi intents mặc định
     * - Cấu hình presence, partials
     * - Điều chỉnh các option nâng cao khác của DiscordClient
     *
     * ---
     *
     * ### Lưu ý:
     * - Nếu không cung cấp, client sẽ sử dụng mặc định của blackcat.js-discord
     * - Các thay đổi tại đây ảnh hưởng trực tiếp tới behavior của DiscordClient
     *
     * ---
     *
     * @example
     * ```ts
     * const client = new Client({
     *   discordClientOptions: {
     *     intents: ["Guilds", "GuildMessages", "MessageContent"],
     *     partials: ["CHANNEL"]
     *   }
     * });
     * ```
     *
     * @see {@link https://discord.js.org/#/docs/discord.js/main/class/Client Discord.js Client}
     */
    discordClientOptions?: DiscordClientOptions;
    /**
     * Cấu hình tổng thể của bot
     * 
     * Tùy chọn này cho phép bạn truyền vào các thiết lập cần thiết
     * để khởi tạo và vận hành bot, bao gồm token và các cấu hình mở rộng.
     * 
     * @defaultValue undefined
     * 
     * @remarks
     * Khi được cung cấp, `config` sẽ:
     * 1. Được sử dụng trong quá trình khởi tạo client
     * 2. Cung cấp `botToken` để đăng nhập Discord
     * 3. Cho phép mở rộng thêm các cấu hình tùy ý thông qua index signature
     * 
     * Cấu trúc:
     * - `botToken`: Token dùng để đăng nhập bot (bắt buộc)
     * - `[key: string]: unknown`: Cho phép định nghĩa thêm các config custom
     * 
     * Cơ chế hoạt động:
     * 1. Khi khởi tạo hệ thống
     * 2. Kiểm tra sự tồn tại của `botToken`
     * 3. Sử dụng token để gọi `client.login`
     * 4. Các giá trị khác có thể được truy cập ở bất kỳ đâu trong hệ thống
     *    thông qua object `config`
     * 
     * Phù hợp khi:
     * - Muốn tập trung toàn bộ cấu hình vào một nơi
     * - Cần truyền các giá trị như API keys, prefix, options custom
     * - Muốn dễ dàng mở rộng cấu hình mà không cần sửa type
     * 
     * Không nên dùng khi:
     * - Lưu trữ thông tin nhạy cảm trực tiếp trong source code (nên dùng env)
     * 
     * @example
     * ```ts
     * const client = new Client({
     *   config: {
     *     botToken: process.env.BOT_TOKEN!,
     *     prefix: "!",
     *     apiKey: "your-api-key",
     *     debug: true
     *   }
     * });
     * ```
     * 
     * @example
     * // Sử dụng config trong hệ thống
     * const token = client.config.botToken;
     * const prefix = client.config.prefix;
     * ```
     * 
     * @see Config
     */
    config?: Config;
    /**
     * Quản lý và tự động load các event cho ứng dụng
     * 
     * Tùy chọn này cho phép bạn cấu hình một instance của `EventManager`
     * để tự động quét, import và đăng ký các event từ thư mục chỉ định.
     * 
     * @defaultValue undefined
     * 
     * @remarks
     * Khi được cung cấp, `EventManager` sẽ:
     * 1. Duyệt qua thư mục `directory`
     * 2. Tự động import các file event
     * 3. Đăng ký event vào các scope tương ứng (ví dụ: client, guild, ...)
     * 4. Gọi callback `onLoad` hoặc `onError` tùy theo trạng thái load
     * 
     * Các tùy chọn quan trọng:
     * - `directory`: Đường dẫn tới thư mục chứa các file event
     * - `scopes`: Phạm vi áp dụng event (ví dụ: "client")
     * - `onLoad`: Callback khi load event thành công
     * - `onError`: Callback khi xảy ra lỗi khi load event
     * 
     * Cơ chế hoạt động:
     * 1. Khi khởi tạo hệ thống
     * 2. `EventManager` sẽ quét toàn bộ file trong `directory`
     * 3. Mỗi file sẽ được import và validate cấu trúc event
     * 4. Nếu hợp lệ → đăng ký và gọi `onLoad`
     * 5. Nếu lỗi → gọi `onError` với thông tin chi tiết
     * 
     * Phù hợp khi:
     * - Muốn tách riêng logic event thành nhiều file
     * - Dự án có nhiều event cần quản lý
     * - Cần auto-load thay vì đăng ký thủ công
     * 
     * Không nên dùng khi:
     * - Dự án nhỏ, ít event
     * - Muốn kiểm soát đăng ký event một cách thủ công
     * 
     * @example
     * ```ts
     * import { Client, EventManager } from "blackcat.js-discord";
     * 
     * const client = new Client({
     *   eventManager: new EventManager({
     *     directory: "./events",
     *     scopes: ["client"],
     *     onLoad: (event) => {
     *       console.log(`${event.file} - ok`);
     *     },
     *     onError: (event) => {
     *       console.error(`${event.file}:`, event.error);
     *     }
     *   })
     * });
     * ```
     * 
     * @example
     * // Không sử dụng EventManager (tự đăng ký thủ công)
     * const client = new Client({
     *   // eventManager: undefined
     * });
     * 
     * @see EventManager
     */
    eventManager?: EventManager;
    /**
     * Quản lý và tự động load các command cho ứng dụng
     * 
     * Tùy chọn này cho phép bạn cấu hình một instance của `CommandManager`
     * để tự động quét, import và đăng ký các command từ thư mục chỉ định.
     * 
     * @defaultValue undefined
     * 
     * @remarks
     * Khi được cung cấp, `CommandManager` sẽ:
     * 1. Duyệt qua thư mục `directory`
     * 2. Tự động import các file command
     * 3. Đăng ký command vào hệ thống xử lý message
     * 4. Áp dụng `prefix` để nhận diện command
     * 5. Gọi callback `onLoad` hoặc `onError` tùy theo trạng thái load
     * 
     * Các tùy chọn quan trọng:
     * - `directory`: Đường dẫn tới thư mục chứa các file command
     * - `prefix`: Tiền tố dùng để kích hoạt command (ví dụ: "!")
     * - `onLoad`: Callback khi load command thành công
     * - `onError`: Callback khi xảy ra lỗi khi load command
     * 
     * Cơ chế hoạt động:
     * 1. Khi khởi tạo hệ thống
     * 2. `CommandManager` sẽ quét toàn bộ file trong `directory`
     * 3. Mỗi file sẽ được import và validate cấu trúc command
     * 4. Nếu hợp lệ → đăng ký vào collection và gọi `onLoad`
     * 5. Nếu lỗi → gọi `onError` với thông tin chi tiết
     * 6. Khi người dùng gửi message:
     *    - Kiểm tra có bắt đầu bằng `prefix` hay không
     *    - Parse commandName và args
     *    - Tìm command tương ứng và thực thi
     * 
     * Phù hợp khi:
     * - Dự án có nhiều command cần tổ chức theo file
     * - Muốn auto-load command thay vì đăng ký thủ công
     * - Sử dụng message-based command với prefix
     * 
     * Không nên dùng khi:
     * - Dự án nhỏ, ít command
     * - Chỉ sử dụng slash command (interaction-based)
     * - Muốn tự kiểm soát toàn bộ flow xử lý message
     * 
     * @example
     * ```ts
     * const client = new Client({
     *   commandManager: new CommandManager({
     *     directory: "./commands",
     *     prefix: "!",
     *     onLoad: (command) => {
     *       console.log(`commands: ${command.commandName} - ok`);
     *     },
     *     onError: (command) => {
     *       console.error(`${command.file}:`, command.error);
     *     }
     *   })
     * });
     * ```
     * 
     * @example
     * // Không sử dụng CommandManager (tự xử lý message)
     * const client = new Client({
     *   // commandManager: undefined
     * });
     * 
     * @see CommandManager
     */
    commandManager?: CommandManager;
    /**
     * Quản lý và tự động load các slash command (application commands)
     * 
     * Tùy chọn này cho phép bạn cấu hình một instance của `SlashCommandManager`
     * để tự động quét, import và đăng ký các slash command lên Discord API.
     * 
     * @defaultValue undefined
     * 
     * @remarks
     * Khi được cung cấp, `SlashCommandManager` sẽ:
     * 1. Duyệt qua thư mục `directory`
     * 2. Tự động import các file slash command
     * 3. Validate cấu trúc command (theo `SlashCommandBuilder`)
     * 4. (Tuỳ chọn) reset commands trước khi đăng ký
     * 5. Đăng ký commands lên Discord (global hoặc guild)
     * 6. Gọi callback `onLoad` hoặc `onError` tùy theo trạng thái
     * 
     * Các tùy chọn quan trọng:
     * - `directory`: Thư mục chứa các file slash command
     * - `guildID`: Nếu có → đăng ký dạng guild command (deploy nhanh)
     * - `reset`: Xóa command cũ trước khi đăng ký lại
     * - `onLoad`: Callback khi load thành công
     * - `onError`: Callback khi có lỗi
     * 
     * Cơ chế hoạt động:
     * 1. Khi khởi tạo hệ thống
     * 2. `SlashCommandManager` quét toàn bộ file trong `directory`
     * 3. Import và validate từng command
     * 4. Nếu bật `reset`:
     *    - `reset.global` → xóa toàn bộ global commands
     *    - `reset.guild` → xóa toàn bộ guild commands (cần `guildID`)
     * 5. Đăng ký lại commands lên Discord API
     * 6. Gọi `onLoad` cho từng command thành công
     * 7. Nếu lỗi → gọi `onError`
     * 
     * Lưu ý quan trọng:
     * - Guild commands cập nhật gần như ngay lập tức
     * - Global commands có thể mất vài phút để propagate
     * - `reset` nên dùng khi thay đổi cấu trúc command lớn
     * 
     * Phù hợp khi:
     * - Sử dụng slash commands (interaction-based)
     * - Cần auto-deploy commands khi khởi động bot
     * - Dự án có nhiều command cần quản lý theo file
     * 
     * Không nên dùng khi:
     * - Muốn tự deploy command thủ công qua REST riêng
     * - Dự án rất nhỏ (ít command)
     * 
     * @example
     * ```ts
     * const client = new Client({
     *   slashCommandManager: new SlashCommandManager({
     *     directory: "./slashCommands",
     *     guildID: "1055150050357022840",
     *     reset: {
     *       guild: true
     *     },
     *     onLoad: (command) => {
     *       console.log(`slashCommands: ${command.commandName} - ok`);
     *     },
     *     onError: (command) => {
     *       console.error(`${command.file}:`, command.error);
     *     }
     *   })
     * });
     * ```
     * 
     * @example
     * // Đăng ký global commands (không cần guildID)
     * const client = new Client({
     *   slashCommandManager: new SlashCommandManager({
     *     directory: "./slashCommands"
     *   })
     * });
     * 
     * @example
     * // Reset toàn bộ commands trước khi đăng ký lại
     * const client = new Client({
     *   slashCommandManager: new SlashCommandManager({
     *     directory: "./slashCommands",
     *     reset: {
     *       global: true
     *     }
     *   })
     * });
     * 
     * @see SlashCommandManager
     */
    slashCommandManager?: SlashCommandManager;
}

/**
 * Client mở rộng từ {@link DiscordClient}.
 *
 * Đây là class trung tâm của framework bot, chịu trách nhiệm quản lý toàn bộ hệ thống:
 * - Cấu hình (config)
 * - Message commands
 * - Slash commands
 * - Events
 * - Categories
 * - Các manager tương ứng
 * 
 * @remarks
 * `Client` đóng vai trò như một orchestrator, kết nối các thành phần lại với nhau:
 * - Các `Manager` chịu trách nhiệm load tài nguyên (commands, events, ...)
 * - Các `Collection` lưu trữ dữ liệu runtime
 * - `config` cung cấp thông tin cấu hình toàn cục
 * 
 * Lifecycle khởi động:
 * 1. Khởi tạo instance với {@link ClientOptions}
 * 2. Gọi {@link start} để load toàn bộ hệ thống
 * 3. Đăng nhập Discord thông qua token
 * 
 * @example
 * ```ts
 * const client = new Client({
 *   config: {
 *     botToken: process.env.TOKEN!
 *   },
 *   commandManager: new CommandManager({
 *     directory: "./commands",
 *     prefix: "!"
 *   }),
 *   eventManager: new EventManager({
 *     directory: "./events"
 *   }),
 *   slashCommandManager: new SlashCommandManager({
 *     directory: "./slashCommands"
 *   })
 * });
 * 
 * await client.start();
 * ```
 */
export class Client<Ready extends boolean = boolean> extends DiscordClient<Ready> {
    /**
     * Cấu hình bot.
     * 
     * Chứa các thông tin cần thiết như:
     * - Token đăng nhập
     * - Các config custom (API keys, prefix, flags, ...)
     * 
     * @defaultValue undefined
     */
    public config: Config;
    /**
     * Danh sách message commands.
     * 
     * Key: `commandName`  
     * Value: instance của {@link CommandBuilder}
     * 
     * @remarks
     * Collection này được populate bởi {@link CommandManager}
     * trong quá trình load command.
     */
    public readonly commands: Collection<string, CommandBuilder>;
    /**
     * Danh sách aliases của command.
     * 
     * Key: alias  
     * Value: command name chính
     * 
     * @remarks
     * Dùng để resolve command khi user gọi bằng alias.
     */
    public readonly aliases: Collection<string, string>;
    /**
     * Danh sách slash commands.
     * 
     * Key: `commandName`  
     * Value: instance của {@link SlashCommandBuilder}
     * 
     * @remarks
     * Được sử dụng để map interaction với handler tương ứng.
     */
    public readonly slashCommands: Collection<string, SlashCommandBuilder<any>>;
    /**
     * Danh sách categories của command.
     *
     * Key: category name  
     * Value: collection các command thuộc category đó
     * 
     * @remarks
     * Hữu ích cho:
     * - Tạo help command
     * - Group command theo chức năng
     */
    public readonly categories: Collection<string, Collection<string, CommandBuilder>>;
    /**
     * Manager quản lý events.
     * 
     * @defaultValue undefined
     * 
     * @remarks
     * Nếu được cung cấp, sẽ tự động load và đăng ký event khi gọi {@link start}.
     */
    public readonly eventManager: EventManager | undefined;
    /**
     * Manager quản lý message commands.
     * 
     * @defaultValue undefined
     * 
     * @remarks
     * Chịu trách nhiệm:
     * - Load command từ file
     * - Parse message theo prefix
     * - Thực thi command
     */
    public readonly commandManager: CommandManager | undefined;
    /**
     * Manager quản lý slash commands.
     * 
     * @defaultValue undefined
     * 
     * @remarks
     * Chịu trách nhiệm:
     * - Load slash command
     * - Đăng ký với Discord API
     * - Đồng bộ command (global / guild)
     */
    public readonly slashCommandManager: SlashCommandManager | undefined;
    /**
     * Khởi tạo Client.
     *
     * @param options - Tùy chọn khởi tạo client
     * 
     * @remarks
     * Constructor chỉ thực hiện:
     * - Gán config
     * - Khởi tạo các collection
     * - Gán các manager
     * 
     * Không thực hiện load hoặc login.
     */
    constructor(options: ClientOptions) {
        super(options.discordClientOptions ?? {
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
            partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User],
            allowedMentions: {
                parse: ["users", "roles"],
                repliedUser: false
            },
        });
        this.config = options.config ?? { botToken: "" } as Config;
        // Collection
        this.commands = new Collection<string, CommandBuilder>();
        this.aliases = new Collection<string, string>();
        this.slashCommands = new Collection<string, SlashCommandBuilder<any>>();
        this.categories = new Collection<string, Collection<string, CommandBuilder>>();
        // Manager
        this.eventManager = options.eventManager;
        this.commandManager = options.commandManager;
        this.slashCommandManager = options.slashCommandManager;
    }
    /**
     * Thiết lập hoặc cập nhật cấu hình bot.
     *
     * Phương thức này cho phép:
     * - Gán mới toàn bộ config
     * - Hoặc merge thêm config vào config hiện tại
     *
     * @param config - Cấu hình mới hoặc một phần cấu hình
     * @param options - Tùy chọn cập nhật
     * @param options.merge - Có merge với config hiện tại hay không
     * 
     * @returns Config sau khi đã được cập nhật
     *
     * @remarks
     * - Nếu `merge = true`:
     *   → config mới sẽ được merge vào config hiện tại (shallow merge)
     * - Nếu `merge = false` (mặc định):
     *   → config cũ sẽ bị ghi đè hoàn toàn
     * 
     * Lưu ý:
     * - Không tự động gọi lại `login`
     * - Nếu thay đổi `botToken`, bạn cần gọi lại {@link start} hoặc `login`
     * 
     * @example
     * ```ts
     * client.setConfig({
     *   botToken: "new-token"
     * });
     * ```
     * 
     * @example
     * ```ts
     * // Merge thêm config
     * client.setConfig({
     *   debug: true
     * }, { merge: true });
     * ```
     */
    public setConfig(config: Partial<Config>, options?: { merge?: boolean }): Config {
        const shouldMerge = options?.merge ?? false;
        if (shouldMerge && this.config) {
            this.config = {
                ...this.config,
                ...config
            };
        } else {
            this.config = config as Config;
        }
        return this.config;
    }
    /**
     * Thiết lập token cho bot.
     *
     * Phương thức này cho phép override token runtime,
     * thay thế cho giá trị trong {@link config}.
     *
     * @param token - Token Discord bot
     * @returns Token đã được thiết lập
     * 
     * @example
     * ```ts
     * client.setToken(process.env.TOKEN!);
     * ```
     */
    public setToken(token: string): string {
        this.config.botToken = token;
        return token;
    }
    /**
     * Khởi động bot.
     *
     * Quy trình:
     * 1. Load slash commands
     * 2. Load message commands
     * 3. Load events
     * 4. Đăng nhập Discord
     *
     * @throws Error nếu token chưa được thiết lập
     *
     * @returns Promise resolve với token sau khi login thành công
     * 
     * @remarks
     * Token được resolve theo thứ tự ưu tiên:
     * 1. Token đã set bằng {@link setToken}
     * 2. `config.botToken`
     * 
     * Nếu không có → throw error
     * 
     * @example
     * ```ts
     * await client.start();
     * ```
     */
    public start(): Promise<string> {
        if (this.eventManager) {
            this.eventManager.load(this);
        }
        if (this.commandManager) {
            this.commandManager.loadAll(this);
        }
        if (this.slashCommandManager) {
            this.slashCommandManager.loadAll(this);
        }
        const config = this.config.botToken;
        if (!config) {
            throw new Error("Bot token chưa được thiết lập.");
        }
        return this.login(config);
    }
}