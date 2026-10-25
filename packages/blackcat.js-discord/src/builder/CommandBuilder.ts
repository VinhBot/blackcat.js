import type { Message, OmitPartialGroupDMChannel, Channel, ChannelType, GuildMember, Role, User } from "discord.js";
import type { Client, CooldownConfig, PermissionConfig } from "..";

/**
 * Các kiểu dữ liệu được hỗ trợ khi khai báo argument cho message command.
 *
 * @remarks
 * Giá trị được parse từ nội dung tin nhắn thành kiểu tương ứng trong
 * {@link ArgumentValueMap}.
 *
 * @public
 */
export type ArgumentType = "string" | "integer" | "number" | "boolean" | "duration" | "user" | "member" | "role" | "channel";

/**
 * Ánh xạ mỗi {@link ArgumentType} sang kiểu dữ liệu sau khi parse.
 *
 * @remarks
 * Argument kiểu `duration` được biểu diễn bằng số milliseconds.
 *
 * @public
 */
export type ArgumentValueMap = {
    string: string;
    integer: number;
    number: number;
    boolean: boolean;
    /** Khoảng thời gian, đã đổi sang **milliseconds**. */
    duration: number;
    user: User;
    member: GuildMember;
    role: Role;
    channel: Channel;
};

/**
 * Các thuộc tính chung của một định nghĩa argument.
 *
 * @typeParam T - Kiểu argument được khai báo.
 * @internal
 */
type BaseArgument<T extends ArgumentType> = {
    /** Kiểu argument. */
    type: T;
    /** Mô tả ngắn, dùng khi sinh thông báo cách dùng. */
    description?: string;
    /** Argument bắt buộc hay không. Mặc định `false`. */
    required: boolean;
};

/**
 * Cấu hình argument nhận chuỗi văn bản.
 *
 * @remarks
 * Có thể giới hạn độ dài, giới hạn giá trị hợp lệ bằng `choices`, hoặc dùng
 * `rest: true` để lấy toàn bộ phần còn lại của tin nhắn. `rest` chỉ phù hợp
 * với argument chuỗi được khai báo cuối cùng.
 *
 * @public
 */
export type StringArgument = BaseArgument<"string"> & {
    /**
     * Gom **toàn bộ phần còn lại** của tin nhắn vào argument này (không cần đặt trong dấu ngoặc kép).
     * Chỉ được dùng cho argument string **cuối cùng**.
     */
    rest?: boolean;
    choices?: string[];
    minLength?: number;
    maxLength?: number;
};
/**
 * Cấu hình argument số nguyên, có thể giới hạn bằng `min` và `max`.
 *
 * @public
 */
export type IntegerArgument = BaseArgument<"integer"> & { min?: number; max?: number };
/**
 * Cấu hình argument số, có thể giới hạn bằng `min` và `max`.
 *
 * @public
 */
export type NumberArgument = BaseArgument<"number"> & { min?: number; max?: number };
/**
 * Cấu hình argument nhận giá trị boolean.
 *
 * @public
 */
export type BooleanArgument = BaseArgument<"boolean">;
/**
 * Cấu hình argument biểu diễn khoảng thời gian.
 *
 * @remarks
 * Giá trị được parse thành milliseconds; `min` và `max` cũng sử dụng đơn vị
 * milliseconds.
 *
 * @public
 */
export type DurationArgument = BaseArgument<"duration"> & {
    /** Thời lượng tối thiểu (ms). */
    min?: number;
    /** Thời lượng tối đa (ms). */
    max?: number;
};
/**
 * Cấu hình argument tham chiếu đến một Discord user.
 *
 * @public
 */
export type UserArgument = BaseArgument<"user">;
/**
 * Cấu hình argument tham chiếu đến thành viên trong server.
 *
 * @public
 */
export type MemberArgument = BaseArgument<"member">;
/**
 * Cấu hình argument tham chiếu đến một role trong server.
 *
 * @public
 */
export type RoleArgument = BaseArgument<"role">;
/**
 * Cấu hình argument tham chiếu đến một kênh Discord.
 *
 * @remarks
 * Có thể giới hạn các loại kênh được chấp nhận bằng `channelTypes`.
 *
 * @public
 */
export type ChannelArgument = BaseArgument<"channel"> & {
    /** Giới hạn loại kênh, ví dụ `["GuildText", "GuildVoice"]`. */
    channelTypes?: Array<keyof typeof ChannelType>;
};

/**
 * Union của tất cả kiểu định nghĩa argument được hỗ trợ.
 *
 * @public
 */
export type AnyArgument =
    | StringArgument
    | IntegerArgument
    | NumberArgument
    | BooleanArgument
    | DurationArgument
    | UserArgument
    | MemberArgument
    | RoleArgument
    | ChannelArgument;

/**
 * Bản đồ tên argument sang cấu hình argument tương ứng.
 *
 * @remarks
 * Thứ tự thuộc tính khai báo được dùng làm thứ tự argument khi người dùng nhập lệnh.
 *
 * @public
 */
export type ArgumentDefinitions = Record<string, AnyArgument>;

/**
 * Phần cấu hình người dùng truyền vào factory, không bao gồm `type` và `required`.
 *
 * @typeParam A - Kiểu argument đích.
 * @internal
 */
type ArgumentData<A extends AnyArgument> = Omit<A, "type" | "required">;

/**
 * Kiểu hàm tạo argument với overload giữ chính xác kiểu của `required`.
 *
 * @typeParam A - Kiểu argument được tạo.
 * @internal
 */
interface Define<A extends AnyArgument> {
    (data: ArgumentData<A> & { required: true }): A & { required: true };
    (data?: ArgumentData<A> & { required?: false }): A & { required: false };
    (data: ArgumentData<A> & { required: boolean }): A & { required: boolean };
}

/**
 * Bộ khai báo argument, được truyền vào `options` của `CommandBuilder`.
 * 
 * @remarks
 * Truyền factory này vào callback `options` của {@link CommandBuilderOptions}
 * hoặc {@link CommandBuilder.setOptions}.
 *
 *
 * @example
 * ```ts
 * options: (a) => ({
 *     user: a.user({ required: true }),
 *     days: a.integer({ min: 1, max: 7 }),
 *     reason: a.string({ rest: true }),
 * })
 * ```
 */
export interface ArgumentFactory {
    string: Define<StringArgument>;
    integer: Define<IntegerArgument>;
    number: Define<NumberArgument>;
    boolean: Define<BooleanArgument>;
    duration: Define<DurationArgument>;
    user: Define<UserArgument>;
    member: Define<MemberArgument>;
    role: Define<RoleArgument>;
    channel: Define<ChannelArgument>;
}

/**
 * Tạo factory cho một loại argument cụ thể.
 *
 * @param type - Kiểu argument mà factory sẽ tạo.
 * @returns Hàm tạo cấu hình argument kèm `type` và giá trị `required` chuẩn hóa.
 * @internal
 */
const define = (type: ArgumentType) => (data: Record<string, unknown> = {}) => ({ ...data, required: Boolean(data.required), type });

/**
 * Tập hợp factory argument dùng chung trong thư viện.
 *
 * @remarks
 * Object được đóng băng để tránh thay đổi các factory trong runtime.
 *
 * @public
 */
export const argumentFactory: ArgumentFactory = Object.freeze({
    string: define("string"),
    integer: define("integer"),
    number: define("number"),
    boolean: define("boolean"),
    duration: define("duration"),
    user: define("user"),
    member: define("member"),
    role: define("role"),
    channel: define("channel"),
}) as unknown as ArgumentFactory;

/**
 * Suy ra kiểu giá trị runtime từ một định nghĩa argument.
 *
 * @remarks
 * Nếu `required` là `true`, kiểu kết quả là giá trị tương ứng.
 * Nếu không, kiểu kết quả bao gồm `null`.
 *
 * @typeParam A - Định nghĩa argument cần suy luận.
 * @public
 */
export type InferArgument<A> = A extends { type: infer T; required?: infer R }
    ? T extends keyof ArgumentValueMap
    ? R extends true
    ? ArgumentValueMap[T]
    : ArgumentValueMap[T] | null
    : never
    : never;

/**
 * Suy ra object chứa các giá trị đã parse từ object định nghĩa argument.
 *
 * @typeParam T - Object định nghĩa argument.
 * @public
 */
export type InferArguments<T extends Record<string, any>> = {
    [K in keyof T]: InferArgument<T[K]>;
};

/**
 * Kiểu của tham số `options` được truyền vào hàm thực thi command.
 *
 * @remarks
 * Nếu command không khai báo argument, kiểu kết quả là `Record<string, never>`.
 *
 * @typeParam TArgs - Các định nghĩa argument của command.
 * @public
 */
export type ArgumentResult<TArgs> = TArgs extends Record<string, any> ? InferArguments<TArgs> : Record<string, never>;
/**
 * Các tùy chọn dùng để khởi tạo {@link CommandBuilder}.
 *
 * @typeParam T - Cho biết command thuộc ngữ cảnh guild hay không.
 * @typeParam TArgs - Kiểu các argument do command khai báo.
 * @public
 */
export interface CommandBuilderOptions<T extends boolean = boolean, TArgs extends Record<string, any> | undefined = undefined> {
    /**
     * Tên chính của command.
     */
    commandName?: string;
    /**
     * Danh sách alias của command.
     */
    aliases?: string[];
    /**
     * Category dùng để phân loại command.
     */
    category?: string;
    /**
     * Mô tả command.
     */
    description?: string;
    /**
     * Cấu hình cooldown.
     */
    cooldown?: CooldownConfig<"message">;
    /**
     * Permission.
     */
    permission?: PermissionConfig<"message">;
    /**
     * Hướng dẫn sử dụng command.
     */
    usage?: string;
    /**
     * Khai báo argument **có kiểu** cho lệnh. Khi có `options`, thư viện sẽ tự parse tin nhắn,
     * kiểm tra giá trị và báo lỗi cho người dùng nếu nhập sai — `execute` chỉ nhận dữ liệu đã hợp lệ.
     *
     * Thứ tự khai báo chính là thứ tự người dùng nhập. Hãy đặt `options` **trước** `execute`
     * để TypeScript suy ra kiểu chính xác.
     *
     * @example
     * ```ts
     * options: (a) => ({
     *     user: a.user({ required: true }),
     *     days: a.integer({ min: 1, max: 7 }),
     *     reason: a.string({ rest: true }),
     * }),
     * execute: (client, message, args, options) => {
     *     options.user;   // User
     *     options.days;   // number | null
     *     options.reason; // string | null
     * }
     * ```
     */
    options?: (arg: ArgumentFactory) => TArgs;
    /**
     * Hàm được gọi để xử lý command.
     *
     * @param client - Discord client đang thực thi command.
     * @param message - Tin nhắn kích hoạt command.
     * @param args - Các argument thô đã tách theo khoảng trắng.
     * @param options - Các argument đã parse theo định nghĩa `options`.
     * @returns Kết quả đồng bộ hoặc Promise từ quá trình xử lý.
     */
    execute?: (client: Client<true>, message: OmitPartialGroupDMChannel<Message<T>>, args: string[], options: ArgumentResult<TArgs>) => Promise<any> | any;
}

/**
 * Builder dùng để cấu hình và thực thi message command.
 *
 * @remarks
 * Hỗ trợ cấu hình tên, alias, mô tả, category, cooldown, quyền hạn và argument.
 * Các setter trả về chính instance để có thể nối chuỗi lời gọi.
 *
 * @typeParam InGuild - Ngữ cảnh guild của message.
 * @typeParam TArgs - Định nghĩa argument giúp suy luận kiểu `options`.
 *
 * @example
 * ```ts
 * const command = new CommandBuilder()
 *   .setName("say")
 *   .setDescription("Gửi lại nội dung")
 *   .setOptions((a) => ({
 *     text: a.string({ required: true, rest: true }),
 *   }))
 *   .setExecute(async (client, message, args, options) => {
 *     await message.reply(options.text);
 *   });
 * ```
 *
 * @public
 */
export class CommandBuilder<InGuild extends boolean = boolean, TArgs extends Record<string, any> | undefined = undefined> {
    /**
     * Tên command chính.
     */
    public commandName!: string;
    /**
     * Danh sách alias của command.
     */
    public aliases: string[] = [];
    /**
     * Mô tả command.
     */
    public description = "không có mô tả";
    /**
     * Category của command.
     */
    public category?: string;
    /**
     * Cấu hình cooldown.
     */
    public cooldown?: CooldownConfig<"message">;
    /**
     * Cấu hình permission.
     */
    public permission?: PermissionConfig<"message">;
    /**
     * Hướng dẫn sử dụng command.
     */
    public usage?: string;
    /**
     * Handler thực thi command.
     *
     * @private
     */
    private handler!: (client: Client<true>, message: OmitPartialGroupDMChannel<Message<InGuild>>, args: string[], options: ArgumentResult<TArgs>) => any | Promise<any>;
    private argumentDefs?: TArgs;
    /**
     * Tạo CommandBuilder mới.
     *
     * @param options - Command configuration
     * @example Basic usage
     *
     * ```ts
     * const pingCommand = new CommandBuilder()
     *   .setName("ping")
     *   .setDescription("Ping command")
     *   .setExecute((client, message, args) => {
     *       message.reply("Pong!");
     *   });
     * ```
     *
     * @example Using options
     *
     * ```ts
     * const pingCommand = new CommandBuilder({
     *   commandName: "ping",
     *   description: "Ping command",
     *   execute: (client, message, args) => {
     *       message.reply("Pong!");
     *   }
     * });
     * ```
     */
    constructor(options?: Partial<CommandBuilderOptions<InGuild, TArgs>>) {
        if (options) {
            if (options.commandName) this.commandName = options.commandName;
            if (options.aliases) this.aliases = options.aliases;
            if (options.description) this.description = options.description;
            if (options.category) this.category = options.category;
            if (options.cooldown) this.cooldown = options.cooldown;
            if (options.permission) this.permission = options.permission;
            if (options.usage) this.usage = options.usage;
            if (options.options) this.argumentDefs = options.options(argumentFactory);
            if (options.execute) this.handler = options.execute;
        }
    }
    /**
     * Đặt tên chính của command.
     *
     * @param name - Tên command.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setName(name: string) {
        this.commandName = name;
        return this;
    }
    /**
     * Đặt danh sách alias có thể dùng để gọi command.
     *
     * @param aliases - Danh sách tên thay thế.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setAliases(aliases: string[]) {
        this.aliases = aliases;
        return this;
    }
    /**
     * Đặt mô tả hiển thị cho command.
     *
     * @param description - Nội dung mô tả.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setDescription(description: string) {
        this.description = description;
        return this;
    }
    /**
     * Đặt category dùng để phân loại command.
     *
     * @param category - Tên category.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setCategory(category: string) {
        this.category = category;
        return this;
    }
    /**
     * Đặt chuỗi hướng dẫn cách sử dụng command.
     *
     * @param usage - Cú pháp hoặc hướng dẫn sử dụng.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setUsage(usage: string) {
        this.usage = usage;
        return this;
    }
    /**
     * Đặt cấu hình thời gian chờ giữa các lần sử dụng command.
     *
     * @param cooldown - Cấu hình cooldown cho message command.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setCooldown(cooldown: CooldownConfig<"message">) {
        this.cooldown = cooldown;
        return this;
    }
    /**
     * Đặt cấu hình quyền cần có để sử dụng command.
     *
     * @param config - Cấu hình permission cho message command.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setPermission(config: PermissionConfig<"message">) {
        this.permission = config;
        return this;
    }
    /**
     * Đặt hàm xử lý được gọi khi command thực thi.
     *
     * @param handler - Hàm nhận client, message kích hoạt, argument thô và
     * argument đã parse.
     * @returns Builder hiện tại để tiếp tục nối chuỗi.
     */
    public setExecute(handler: (client: Client<true>, message: OmitPartialGroupDMChannel<Message<InGuild>>, args: string[], options: ArgumentResult<TArgs>) => Promise<any> | any) {
        this.handler = handler;
        return this;
    }
    /**
     * Khai báo các argument có kiểu cho command.
     *
     * @remarks
     * Nên gọi trước {@link CommandBuilder.setExecute} để TypeScript suy luận
     * chính xác kiểu của `options` trong handler.
     *
     * @typeParam T - Object định nghĩa argument.
     * @param options - Callback nhận factory và trả về các định nghĩa argument.
     * @returns Builder được tham số hóa bằng các định nghĩa argument mới.
     *
     * @example
     * ```ts
     * builder
     *   .setOptions((a) => ({
     *     user: a.user({ required: true }),
     *     reason: a.string({ rest: true }),
     *   }))
     *   .setExecute((client, message, args, options) => {
     *     // options.user là User; options.reason có thể là null.
     *   });
     * ```
     */
    public setOptions<T extends Record<string, any>>(options: (arg: ArgumentFactory) => T): CommandBuilder<InGuild, T> {
        this.argumentDefs = options(argumentFactory) as unknown as TArgs;
        return this as unknown as CommandBuilder<InGuild, T>;
    }
    /**
     * Lấy các định nghĩa argument hiện được cấu hình.
     *
     * @returns Object định nghĩa argument hoặc `undefined` nếu chưa khai báo.
     */
    get options(): TArgs | undefined {
        return this.argumentDefs;
    }
    /**
     * Chuyển tiếp dữ liệu đầu vào đến handler đã đăng ký.
     *
     * @param client - Discord client đang thực thi command.
     * @param message - Tin nhắn kích hoạt command.
     * @param args - Danh sách argument thô đã tách theo khoảng trắng.
     * @param options - Argument đã parse; mặc định là object rỗng.
     * @returns Kết quả trả về từ handler, có thể là Promise.
     */
    public async execute(client: Client<true>, message: OmitPartialGroupDMChannel<Message<InGuild>>, args: string[], options: ArgumentResult<TArgs> = {} as ArgumentResult<TArgs>) {
        return this.handler(client, message, args, options);
    }
}