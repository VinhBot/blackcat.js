import { SlashCommandBuilder as DiscordSlashCommandBuilder, ChannelType, MessageFlags } from "discord.js";
import type {
    ChatInputCommandInteraction,
    SlashCommandStringOption,
    SlashCommandIntegerOption,
    SlashCommandBooleanOption,
    SlashCommandUserOption,
    SlashCommandRoleOption,
    SlashCommandChannelOption,
    SlashCommandNumberOption,
    SlashCommandMentionableOption,
    SlashCommandAttachmentOption,
    GuildMember,
    Role,
    Channel,
    User,
    Attachment,
    PermissionResolvable,
    ClientUser,
    InteractionReplyOptions,
    CommandInteractionOptionResolver,
} from "discord.js";
import type { Client, CooldownConfig } from "..";
import { CommandBuilder, cooldownManager } from "..";

/**
 * Mapping giữa method lấy option của Discord Interaction và kiểu dữ liệu trả về tương ứng.
 * @hidden
 */
export type SlashOptionGetReturnMap = {
    getString: string | null;
    getInteger: number | null;
    getNumber: number | null;
    getBoolean: boolean | null;
    getUser: User | null;
    getMember: GuildMember | null;
    getRole: Role | null;
    getChannel: Channel | null;
    getMentionable: GuildMember | Role | null;
    getAttachment: Attachment | null;
};

/**
 * Cấu trúc option cơ bản cho Slash Command.
 * @hidden
 */
export type BaseOption<TMethod extends keyof SlashOptionGetReturnMap> = {
    /**
     * Method tương ứng với Discord Interaction API
     * (vd: `getString`, `getUser`).
     */
    method: TMethod;
    /**
     * Mô tả option hiển thị trong Discord UI.
     */
    description: string;
    /**
     * Option có bắt buộc hay không.
     */
    required: boolean;
};

/**
 * Option kiểu string.
 * @hidden
 */
export type StringOption = BaseOption<"getString"> & {
    /**
     * Danh sách choices cho option.
     */
    choices?: Array<{ name: string; value: string }>;
    /**
     * Độ dài tối thiểu của chuỗi.
     */
    minLength?: number;
    /**
     * Độ dài tối đa của chuỗi.
     */
    maxLength?: number;
};
/**
 * Option kiểu integer.
 * @hidden
 */
export type IntegerOption = BaseOption<"getInteger"> & {
    choices?: Array<{ name: string; value: number }>;
    min?: number;
    max?: number;
};
/**
 * Option kiểu number (float).
 * @hidden
 */
export type NumberOption = BaseOption<"getNumber"> & {
    choices?: Array<{ name: string; value: number }>;
    min?: number;
    max?: number;
};
/**
 * Option kiểu channel.
 * @hidden
 */
export type ChannelOption = BaseOption<"getChannel"> & {
    /**
     * Giới hạn loại channel được phép chọn.
     */
    channelTypes?: Array<keyof typeof ChannelType>;
};
/**
 * Option kiểu boolean.
 * @hidden
 */
export type BooleanOption = BaseOption<"getBoolean">;
/**
 * Option kiểu user.
 * @hidden
 */
export type UserOption = BaseOption<"getUser">;
/**
 * Option kiểu member.
 * @hidden
 */
export type MemberOption = BaseOption<"getMember">;
/**
 * Option kiểu role.
 * @hidden
 */
export type RoleOption = BaseOption<"getRole">;
/**
 * Option kiểu mentionable (user hoặc role).
 * @hidden
 */
export type MentionableOption = BaseOption<"getMentionable">;
/**
 * Option kiểu attachment.
 * @hidden
 */
export type AttachmentOption = BaseOption<"getAttachment">;
/**
 * Factory tạo option definition theo kiểu strongly-typed.
 * @hidden
 */
export const option = Object.freeze({
    string: (data: Omit<StringOption, "method">): StringOption => ({ method: "getString", ...data }),
    integer: (data: Omit<IntegerOption, "method">): IntegerOption => ({ method: "getInteger", ...data }),
    number: (data: Omit<NumberOption, "method">): NumberOption => ({ method: "getNumber", ...data }),
    boolean: (data: Omit<BooleanOption, "method">): BooleanOption => ({ method: "getBoolean", ...data }),
    user: (data: Omit<UserOption, "method">): UserOption => ({ method: "getUser", ...data }),
    member: (data: Omit<MemberOption, "method">): MemberOption => ({ method: "getMember", ...data }),
    role: (data: Omit<RoleOption, "method">): RoleOption => ({ method: "getRole", ...data }),
    channel: (data: Omit<ChannelOption, "method">): ChannelOption => ({ method: "getChannel", ...data }),
    mentionable: (data: Omit<MentionableOption, "method">): MentionableOption => ({ method: "getMentionable", ...data }),
    attachment: (data: Omit<AttachmentOption, "method">): AttachmentOption => ({ method: "getAttachment", ...data }),
});
/**
 * Kiểu factory option.
 * @hidden
 */
export type OptionFactory = typeof option;
/**
 * Suy luận kiểu dữ liệu trả về của 1 option dựa trên:
 * - method (getString, getNumber, ...)
 * - required (true | false)
 * @hidden
 */
export type InferOption<O> = O extends { method: infer T; required?: boolean } ? T extends keyof SlashOptionGetReturnMap ? O["required"] extends true ? SlashOptionGetReturnMap[T] : SlashOptionGetReturnMap[T] | null : never : never;
/**
 * Convert toàn bộ option definitions
 * thành object giá trị tương ứng.
 * @hidden
 */
export type InferOptions<T extends Record<string, any>> = {
    [K in keyof T]: InferOption<T[K]>;
};

/**
 * Resolve option type.
 * @hidden
 */
export type ResolveOptions<T> = T extends Record<string, any> ? InferOptions<T> : {};

/**
 * Context truyền vào permission message.
 */
export interface SlashCommandContext {
    /**
     * Tên command đang thực thi.
     */
    commandName: string;
    /**
     * User gọi command.
     */
    user: User;
    /**
     * Bot client user.
     */
    bot: ClientUser & {
        avatarURL: string | null;
        displayAvatarURL: string;
        id: string;
        username: string;
    };
}

/**
 * Cấu hình permission cho slash command.
 *
 * Cho phép định nghĩa:
 *
 * - danh sách quyền cần thiết để sử dụng command
 * - message tùy chỉnh khi user không đủ quyền
 */
export interface SlashPermissionConfig {
    /**
     * Danh sách quyền Discord cần thiết để sử dụng command.
     *
     * Ví dụ:
     *
     * ```ts
     * permission: ["KickMembers", "BanMembers"]
     * ```
     */
    permission: PermissionResolvable[];
    /**
     * Hàm tạo message phản hồi khi user không đủ quyền.
     *
     * Nếu không cung cấp, hệ thống sẽ dùng message mặc định.
     *
     * @param ctx Context của command
     *
     * @returns
     * `InteractionReplyOptions` dùng để gửi reply cho interaction.
     *
     * @example
     * ```ts
     * userPermission: {
     *   permission: ["BanMembers"],
     *   message: (ctx) => ({
     *     content: `Này <@${ctx.user.id}> bạn không có quyền dùng /${ctx.commandName}`,
     *     ephemeral: true
     *   })
     * }
     * ```
     */
    message?: (ctx: SlashCommandContext) => InteractionReplyOptions;
}

/**
 * Cấu hình cho một Slash Command Builder.
 *
 * @template TOptions - Kiểu dữ liệu của object options sau khi được resolve.
 * Mặc định là `undefined` nếu command không có options.
 */
export interface SlashCommandBuilderOptions<TOptions extends Record<string, any> | undefined = undefined> {
    /**
     * Tên command (không chứa khoảng trắng).
     * Đây là identifier duy nhất khi đăng ký slash command.    
     *
     * Ví dụ: "ping", "ban", "userinfo"
     */
    commandName: string;
    /**
     * Mô tả ngắn gọn cho slash command.
     * Discord yêu cầu tối đa 100 ký tự.
     */
    description: string;
    /**
     * Danh sách quyền cần thiết để sử dụng command.
     * Nếu không khai báo, mặc định mọi member đều có thể sử dụng.
     */
    userPermission?: SlashPermissionConfig;
    /**
     * Cấu hình cooldown cho command.
     * Quy định thời gian chờ giữa các lần sử dụng.
     */
    cooldown?: CooldownConfig;
    /**
     * Factory dùng để định nghĩa và build options cho slash command.
     *
     * @param option - OptionFactory để thêm các option như string, user, role...
     * @returns Object mô tả cấu trúc options (sẽ được resolve thành TOptions).
     *
     * Nếu không khai báo, command sẽ không có options.
     */
    options?: (option: OptionFactory) => TOptions;
    /**
     * Hàm xử lý khi command được gọi.
     *
     * @param client - Discord client instance.
     * @param interaction - ChatInputCommandInteraction từ Discord.
     * @param options - Options đã được resolve sang kiểu TOptions.
     *
     * Lưu ý:
     * - Nếu TOptions là undefined thì tham số options cũng có thể undefined.
     * - Hàm này không trả về giá trị (void).
     */
    execute(client: Client, interaction: ChatInputCommandInteraction, options: ResolveOptions<TOptions>): any | Promise<any>;
}

type InteractionOptions = Omit<CommandInteractionOptionResolver, "getMessage" | "getFocused">;
/**
 * Builder wrapper cho Discord Slash Command,
 * hỗ trợ infer kiểu options ở compile-time.
 *
 * @template TOptions Object định nghĩa options
 * 
 */
export class SlashCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> {
    /**
     * Tên command.
     */
    public commandName!: string;
    /**
     * Mô tả command.
     */
    public description!: string;
    /**
     * Permission config.
     */
    public userPermission?: SlashPermissionConfig;
    /**
     * Cooldown config.
     */
    public cooldown?: CooldownConfig;
    /**
     * Option definitions.
     */
    private defs?: TOptions;
    /**
     * Handler thực thi command.
     */
    private handler!: SlashCommandBuilderOptions<TOptions>["execute"];
    /**
     * Registry chứa các handler xử lý option của Slash Command.
     * @hiddeen
     *
     * Tác dụng của handler:
     *  - **method**: tên method dùng khi đọc option từ `interaction.options`
     *  - **parse()**: lấy giá trị option từ `InteractionOptions`
     *  - **build()**: thêm option tương ứng vào `DiscordSlashCommandBuilder`
     *
     * Cơ chế này cho phép framework:
     * - Tự động **parse options** từ `ChatInputCommandInteraction`
     * - Tự động **build slash command schema** từ option definitions
     *
     * Mỗi key trong object tương ứng với một method của
     * {@link CommandInteractionOptionResolver}.
     *
     * Ví dụ:
     * - `getString` → `interaction.options.getString()`
     * - `getUser` → `interaction.options.getUser()`
     * - `getChannel` → `interaction.options.getChannel()`
     *
     * @internal
     * Được sử dụng bởi:
     * - `parseOptions()` để resolve option values
     * - `build()` để generate Discord Slash Command schema
     */
    private optionHandlers = {
        getString: {
            /**
             * Lấy giá trị string từ interaction options.
             *
             * @param opts - Resolver của interaction options
             * @param key - Tên option
             * @param req - Option có bắt buộc hay không
             * @returns Giá trị string hoặc null nếu không tồn tại
             */
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getString(key, req),
            /**
             * Thêm string option vào SlashCommandBuilder.
             *
             * @param builder - Slash command builder
             * @param name - Tên option
             * @param def - Định nghĩa option
             */
            build: (builder: DiscordSlashCommandBuilder, name: string, def: StringOption) => builder.addStringOption((opt: SlashCommandStringOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required);
                if (def.choices?.length) opt.addChoices(...def.choices);
                if (def.minLength !== undefined) opt.setMinLength(def.minLength);
                if (def.maxLength !== undefined) opt.setMaxLength(def.maxLength);
                return opt;
            }),
        },
        getInteger: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getInteger(key, req),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: IntegerOption) => builder.addIntegerOption((opt: SlashCommandIntegerOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required);
                if (def.choices?.length) opt.addChoices(...def.choices);
                if (def.min !== undefined) opt.setMinValue(def.min);
                if (def.max !== undefined) opt.setMaxValue(def.max);
                return opt;
            }),
        },
        getNumber: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getNumber(key, req),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: NumberOption) => builder.addNumberOption((opt: SlashCommandNumberOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required);
                if (def.choices?.length) opt.setChoices(...def.choices);
                if (def.min !== undefined) opt.setMinValue(def.min);
                if (def.max !== undefined) opt.setMaxValue(def.max);
                return opt;
            }),
        },

        getBoolean: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getBoolean(key, req),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: BooleanOption) => builder.addBooleanOption((opt: SlashCommandBooleanOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required);
                return opt;
            }),
        },
        getUser: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getUser(key, req),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: UserOption) => builder.addUserOption((opt: SlashCommandUserOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required);
                return opt;
            }),
        },
        getMember: {
            parse: (opts: InteractionOptions, key: string) => opts.getMember(key),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: MemberOption) => builder.addUserOption((opt: SlashCommandUserOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required);
                return opt;
            }),
        },
        getRole: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getRole(key, req),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: RoleOption) => builder.addRoleOption((opt: SlashCommandRoleOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required);
                return opt;
            }),
        },
        getChannel: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getChannel(key, req),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: ChannelOption) => builder.addChannelOption((opt: SlashCommandChannelOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required);
                if (def.channelTypes?.length) opt.addChannelTypes(...def.channelTypes.map(t => ChannelType[t]) as any);
                return opt;
            }),
        },
        getMentionable: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getMentionable(key, req),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: MentionableOption) => builder.addMentionableOption((opt: SlashCommandMentionableOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required)
                return opt;
            }),
        },
        getAttachment: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getAttachment(key, req),
            build: (builder: DiscordSlashCommandBuilder, name: string, def: AttachmentOption) => builder.addAttachmentOption((opt: SlashCommandAttachmentOption) => {
                opt.setName(name).setDescription(def.description).setRequired(def.required)
                return opt;
            }),
        }
    }
    /**
     * Tạo instance mới của SlashCommandBuilder.
     *
     * Constructor này nhận cấu hình command và khởi tạo các thuộc tính
     * cần thiết để:
     *
     * - Build schema của Discord Slash Command
     * - Parse options từ interaction
     * - Thực thi command handler
     * - Áp dụng cooldown và permission
     *
     * @param config - Cấu hình của slash command
     *
     * @typeParam TOptions - Kiểu định nghĩa của command options.
     * Được dùng để suy ra kiểu dữ liệu của `options` truyền vào `execute`.
     *
     * @example
     * ```ts
     * const pingCommand = new SlashCommandBuilder({
     *   commandName: "ping",
     *   description: "Kiểm tra độ trễ bot",
     *   cooldown: {
     *     duration: 3,
     *     scope: "user"
     *   },
     *   userPermission: {
     *     permission: ["SendMessages"]
     *   },
     *   execute: async (client, interaction) => {
     *     await interaction.reply("Pong!");
     *   }
     * });
     * ```
     */
    constructor(config: SlashCommandBuilderOptions<TOptions>) {
        if (config) this.applyConfig(config);
    }
    /**
     * Áp dụng cấu hình ban đầu cho Slash Command.
     * @hidden
     */
    private applyConfig(config: SlashCommandBuilderOptions<TOptions>) {
        this.commandName = config.commandName;
        this.description = config.description;
        this.userPermission = config.userPermission;
        this.cooldown = config.cooldown;
        this.handler = config.execute;
        this.defs = config.options?.(option);
    }
    /**
     * Lấy danh sách option definitions của command.
     *
     * Giá trị này được tạo từ factory `options(option)`
     * trong {@link SlashCommandBuilderOptions}.
     *
     * Object trả về chứa toàn bộ metadata của option
     * (method, description, required, choices, v.v.)
     * dùng cho:
     *
     * - `parseOptions()` để đọc giá trị từ interaction
     * - `build()` để tạo schema Slash Command cho Discord API
     *
     * @returns Option definitions hoặc `undefined` nếu command không có options
     */
    get options(): TOptions | undefined {
        return this.defs;
    }
    /**
     * Đặt tên cho Slash Command.
     *
     * Method này hỗ trợ **builder pattern** cho phép
     * chain nhiều method liên tiếp khi khởi tạo command.
     *
     * @param name - Tên command (phải tuân theo format của Discord)
     *
     * @returns Instance hiện tại để tiếp tục chaining
     *
     * @example
     * ```ts
     * new SlashCommandBuilder()
     *   .setName("ping")
     *   .setDescription("Ping command");
     * ```
     */
    public setName(name: string) {
        this.commandName = name;
        return this;
    }
    /**
     * Đặt mô tả cho Slash Command.
     *
     * Mô tả này sẽ hiển thị trong Discord khi người dùng
     * xem thông tin command.
     *
     * @param description - Nội dung mô tả command
     *
     * @returns Instance hiện tại để tiếp tục chaining
     */
    public setDescription(description: string) {
        this.description = description;
        return this;
    }
    /**
     * Thiết lập cấu hình cooldown cho command.
     *
     * Cooldown giúp hạn chế spam command bằng cách
     * buộc người dùng phải chờ một khoảng thời gian
     * trước khi sử dụng lại command.
     *
     * @param cooldown - Cấu hình cooldown
     *
     * @returns Instance hiện tại để tiếp tục chaining
     */
    public setCooldown(cooldown: CooldownConfig) {
        this.cooldown = cooldown;
        return this;
    }
    /**
     * Thiết lập permission cần thiết để sử dụng command.
     *
     * Nếu người dùng không có các quyền được yêu cầu,
     * command sẽ bị từ chối trước khi handler được gọi.
     *
     * @param permission - Cấu hình permission của command
     *
     * @returns Instance hiện tại để tiếp tục chaining
     */
    public setPermissions(permission: SlashPermissionConfig) {
        this.userPermission = permission;
        return this;
    }
    /**
     * Thiết lập handler thực thi Slash Command.
     *
     * Handler sẽ được gọi sau khi:
     * - Kiểm tra permission
     * - Kiểm tra cooldown
     * - Parse options từ interaction
     *
     * @param handler - Hàm xử lý logic command
     *
     * @returns Instance hiện tại để tiếp tục chaining
     *
     * @example
     * ```ts
     * builder.setExecute(async (client, interaction, options) => {
     *   await interaction.reply("Pong!");
     * });
     * ```
     */
    public setExecute(handler: SlashCommandBuilderOptions<TOptions>["execute"]) {
        this.handler = handler;
        return this;
    }
    /**
     * Thực thi slash command.
     *
     * @param {Client} client Discord client
     * @param {ChatInputCommandInteraction} interaction Interaction hiện tại
     * 
     * Bao gồm:
     * - kiểm tra permission
     * - kiểm tra cooldown
     * - parse options
     * - gọi handler
     */
    public async execute(client: Client, interaction: ChatInputCommandInteraction) {
        if (this.userPermission) {
            if (!interaction.memberPermissions?.has(this.userPermission.permission || ["SendMessages"])) {
                const response = this.userPermission.message?.({
                    commandName: this.commandName,
                    user: interaction.user,
                    bot: Object.assign(client.user!, {
                        avatarURL: client.user?.avatarURL(),
                        displayAvatarURL: client.user?.displayAvatarURL(),
                        id: client.user?.id,
                        username: client.user?.username,
                    }),
                });
                return interaction.reply(response ?? { content: `Này <@${interaction.user.id}> bạn không đủ quyền hạn để sử dụng lệnh này.`, flags: MessageFlags.Ephemeral });
            }
        }
        if (this.cooldown) {
            const commands = {
                commandName: this.commandName,
                cooldown: this.cooldown,
            } as CommandBuilder | SlashCommandBuilder<undefined>;
            const cooldownMessage = cooldownManager.check(commands, {
                type: "interaction",
                userId: interaction.user.id,
                guildId: interaction.guildId,
                member: interaction.member as GuildMember,
            });
            if (cooldownMessage) return await interaction.reply({
                content: cooldownMessage,
                flags: MessageFlags.Ephemeral
            });
        }
        const parsed = this.defs ? this.parseOptions(interaction, this.defs) : {};
        this.handler(client, interaction, parsed as ResolveOptions<TOptions>);
    }
    /**
     * Parse options từ Discord Interaction dựa trên option definitions.
     * @hidden
     *
     * @template T Object option definitions
     *
     * @param {ChatInputCommandInteraction} interaction interaction Interaction hiện tại
     * @param {T} defs Option definitions
     *
     * @returns {InferOptions<T>}
     * Object chứa giá trị option đã được:
     * - Lấy đúng method (getString, getNumber, ...)
     * - Áp dụng required flag
     * - Infer type chính xác
     */
    private parseOptions<T extends Record<string, any>>(interaction: ChatInputCommandInteraction, defs: T): InferOptions<T> {
        const result: any = {};
        const opts = interaction.options as InteractionOptions;
        for (const key in defs) {
            const def = defs[key];
            const handler = this.optionHandlers[def.method as keyof typeof this.optionHandlers];
            if (!handler) continue;
            result[key] = handler.parse(opts, key, !!def.required);
        }
        return result;
    }
    /**
     * Build command
     *
     * @param command SlashCommandBuilder instance
     *
     * @returns Discord.SlashCommandBuilder
     */
    public build(): DiscordSlashCommandBuilder {
        const builder = new DiscordSlashCommandBuilder().setName(this.commandName).setDescription(this.description);
        if (!this.options) return builder;
        for (const name in this.options) {
            const def = this.options[name];
            const handler = this.optionHandlers[def.method as keyof typeof this.optionHandlers];
            if (!handler) continue;
            handler.build(builder, name, def);
        }
        return builder;
    }
}