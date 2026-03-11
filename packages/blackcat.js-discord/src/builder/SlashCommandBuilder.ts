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
} from "discord.js";
import type { Client, CooldownConfig } from "..";
import { CommandBuilder, cooldownManager } from "..";

/**
 * Mapping giữa method lấy option của Discord Interaction
 * và kiểu dữ liệu trả về tương ứng.
 *
 * Dùng để suy luận kiểu dữ liệu khi parse options từ
 * {@link ChatInputCommandInteraction}.
 *
 * Ví dụ:
 * - `getString` → `string | null`
 * - `getUser` → `User | null`
 */
export type OptionGetReturnMap = {
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
 *
 * @template TMethod
 * Method dùng để lấy dữ liệu từ `interaction.options`.
 *
 * Ví dụ:
 * - `"getString"`
 * - `"getUser"`
 */
export type BaseOption<TMethod extends keyof OptionGetReturnMap> = {
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
 */
export type IntegerOption = BaseOption<"getInteger"> & {
    choices?: Array<{ name: string; value: number }>;
    min?: number;
    max?: number;
};
/**
 * Option kiểu number (float).
 */
export type NumberOption = BaseOption<"getNumber"> & {
    choices?: Array<{ name: string; value: number }>;
    min?: number;
    max?: number;
};
/**
 * Option kiểu channel.
 */
export type ChannelOption = BaseOption<"getChannel"> & {
    /**
     * Giới hạn loại channel được phép chọn.
     */
    channelTypes?: Array<keyof typeof ChannelType>;
};
/**
 * Option kiểu boolean.
 */
export type BooleanOption = BaseOption<"getBoolean">;
/**
 * Option kiểu user.
 */
export type UserOption = BaseOption<"getUser">;
/**
 * Option kiểu member.
 */
export type MemberOption = BaseOption<"getMember">;
/**
 * Option kiểu role.
 */
export type RoleOption = BaseOption<"getRole">;
/**
 * Option kiểu mentionable (user hoặc role).
 */
export type MentionableOption = BaseOption<"getMentionable">;
/**
 * Option kiểu attachment.
 */
export type AttachmentOption = BaseOption<"getAttachment">;

/**
 * Factory tạo option definition theo kiểu strongly-typed.
 *
 * Mỗi method sẽ tự động gán `method`
 * tương ứng với Discord Interaction API.
 *
 * Ví dụ:
 *
 * ```ts
 * options: (option) => ({
 *   user: option.user({
 *     description: "User cần chọn",
 *     required: true
 *   })
 * })
 * ```
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
 */
export type OptionFactory = typeof option;
/**
 * Suy luận kiểu dữ liệu trả về của 1 option dựa trên:
 * - method (getString, getNumber, ...)
 * - required (true | false)
 *
 * @template O Option definition
 *
 * @returns
 * - Nếu `required: true` → trả về kiểu non-null
 * - Nếu `required: false | undefined` → trả về kiểu có thể null
 */
export type InferOption<O> = O extends { method: infer T; required?: boolean } ? T extends keyof OptionGetReturnMap ? O["required"] extends true ? OptionGetReturnMap[T] : OptionGetReturnMap[T] | null : never : never;
/**
 * Convert toàn bộ option definitions
 * thành object giá trị tương ứng.
 *
 * Ví dụ:
 *
 * ```ts
 * {
 *   user: User
 *   reason: string | null
 * }
 * ```
 */
export type InferOptions<T extends Record<string, any>> = {
    [K in keyof T]: InferOption<T[K]>;
};

/**
 * Resolve option type.
 *
 * Nếu command không có options → trả về `{}`.
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
/**
 * Builder wrapper cho Discord Slash Command,
 * hỗ trợ infer kiểu options ở compile-time.
 *
 * @template TOptions Object định nghĩa options
 */
export class SlashCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> {
    /**
     * Tên command.
     */
    public readonly commandName: string;
    /**
     * Mô tả command.
     */
    public readonly description: string;
    /**
     * Permission config.
     */
    public readonly userPermission?: SlashPermissionConfig;
    /**
     * Cooldown config.
     */
    public readonly cooldown?: CooldownConfig;
    /**
     * Option definitions.
     */
    private readonly defs?: TOptions;
    /**
     * Handler thực thi command.
     */
    private readonly handler: SlashCommandBuilderOptions<TOptions>["execute"];

    constructor(config: SlashCommandBuilderOptions<TOptions>) {
        this.commandName = config.commandName;
        this.description = config.description;
        this.userPermission = config.userPermission;
        this.cooldown = config.cooldown;
        this.handler = config.execute;
        this.defs = config.options?.(option);
    }
    /**
     * Lấy option definitions của command.
     */
    get options(): TOptions | undefined {
        return this.defs;
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
    async execute(client: Client, interaction: ChatInputCommandInteraction) {
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
        for (const key in defs) {
            const def = defs[key];
            if (def.method === "getString") {
                result[key] = interaction.options.getString(key, !!def.required);
            } else if (def.method === "getInteger") {
                result[key] = interaction.options.getInteger(key, !!def.required);
            } else if (def.method === "getNumber") {
                result[key] = interaction.options.getNumber(key, !!def.required);
            } else if (def.method === "getBoolean") {
                result[key] = interaction.options.getBoolean(key, !!def.required);
            } else if (def.method === "getUser") {
                result[key] = interaction.options.getUser(key, !!def.required);
            } else if (def.method === "getMember") {
                result[key] = interaction.options.getMember(key);
            } else if (def.method === "getRole") {
                result[key] = interaction.options.getRole(key, !!def.required);
            } else if (def.method === "getChannel") {
                result[key] = interaction.options.getChannel(key, !!def.required);
            } else if (def.method === "getMentionable") {
                result[key] = interaction.options.getMentionable(key, !!def.required);
            } else if (def.method === "getAttachment") {
                result[key] = interaction.options.getAttachment(key, !!def.required);
            }
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
        /**
         * Resolver dùng để convert option definitions
         * sang DiscordSlashCommandBuilder API.
         */
        const optionResolvers = {
            getString(builder: DiscordSlashCommandBuilder, name: string, def: StringOption) {
                builder.addStringOption((opt: SlashCommandStringOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    if (def.choices && def.choices.length > 0) opt.addChoices(...def.choices);
                    if (def.minLength !== undefined) opt.setMinLength(def.minLength);
                    if (def.maxLength !== undefined) opt.setMaxLength(def.maxLength);
                    return opt;
                });
            },
            getInteger(builder: DiscordSlashCommandBuilder, name: string, def: IntegerOption) {
                builder.addIntegerOption((opt: SlashCommandIntegerOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    if (def.choices && def.choices.length > 0) opt.addChoices(...def.choices);
                    if (def.min !== undefined) opt.setMinValue(def.min);
                    if (def.max !== undefined) opt.setMaxValue(def.max);
                    return opt;
                });
            },
            getNumber(builder: DiscordSlashCommandBuilder, name: string, def: NumberOption) {
                builder.addNumberOption((opt: SlashCommandNumberOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    if (def.choices && def.choices.length > 0) opt.setChoices(...def.choices);
                    if (def.min !== undefined) opt.setMinValue(def.min);
                    if (def.max !== undefined) opt.setMaxValue(def.max);
                    return opt;
                });
            },
            getBoolean(builder: DiscordSlashCommandBuilder, name: string, def: BooleanOption) {
                builder.addBooleanOption((opt: SlashCommandBooleanOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    return opt;
                });
            },
            getUser(builder: DiscordSlashCommandBuilder, name: string, def: UserOption) {
                builder.addUserOption((opt: SlashCommandUserOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    return opt;
                });
            },
            getMember(builder: DiscordSlashCommandBuilder, name: string, def: MemberOption) {
                builder.addUserOption((opt: SlashCommandUserOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    return opt;
                });
            },
            getRole(builder: DiscordSlashCommandBuilder, name: string, def: RoleOption) {
                builder.addRoleOption((opt: SlashCommandRoleOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    return opt;
                });
            },
            getChannel(builder: DiscordSlashCommandBuilder, name: string, def: ChannelOption) {
                builder.addChannelOption((opt: SlashCommandChannelOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    if (def.channelTypes && def.channelTypes.length) opt.addChannelTypes(...def.channelTypes.map((t) => ChannelType[t]) as any);
                    return opt;
                });
            },
            getMentionable(builder: DiscordSlashCommandBuilder, name: string, def: MentionableOption) {
                builder.addMentionableOption((opt: SlashCommandMentionableOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    return opt;
                });
            },
            getAttachment(builder: DiscordSlashCommandBuilder, name: string, def: AttachmentOption) {
                builder.addAttachmentOption((opt: SlashCommandAttachmentOption) => {
                    opt.setName(name).setDescription(def.description).setRequired(def.required);
                    return opt;
                });
            }
        };
        for (const name in this.options) {
            const def = this.options[name];
            optionResolvers[def.method as keyof typeof optionResolvers](builder, name, def);
        }
        return builder;
    }
}