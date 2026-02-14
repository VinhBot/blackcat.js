import { SlashCommandBuilder as DiscordSlashCommandBuilder, ChannelType } from "discord.js";
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
    PermissionsString,
} from "discord.js";
import type { Client, CooldownConfig } from "..";

/**
 * Mapping giữa method lấy option của Discord Interaction
 * và kiểu dữ liệu trả về tương ứng.
 */
type OptionGetReturnMap = {
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
 * Cấu trúc option cơ bản, đại diện cho 1 slash command option.
 *
 * @template TMethod Method dùng để lấy option từ interaction
 */
type BaseOption<TMethod extends keyof OptionGetReturnMap> = {
    method: TMethod;
    description: string;
    required: boolean;
};
/**
 * Các option cụ thể tương ứng với Discord Slash Command API
 */
type StringOption = BaseOption<"getString"> & {
    choices?: Array<{ name: string; value: string }>;
    minLength?: number;
    maxLength?: number;
};
type IntegerOption = BaseOption<"getInteger"> & {
    choices?: Array<{ name: string; value: number }>;
    min?: number;
    max?: number;
};
type NumberOption = BaseOption<"getNumber"> & {
    choices?: Array<{ name: string; value: number }>;
    min?: number;
    max?: number;
};
type ChannelOption = BaseOption<"getChannel"> & {
    channelTypes?: Array<keyof typeof ChannelType>;
};
type BooleanOption = BaseOption<"getBoolean">;
type UserOption = BaseOption<"getUser">;
type MemberOption = BaseOption<"getMember">;
type RoleOption = BaseOption<"getRole">;
type MentionableOption = BaseOption<"getMentionable">;
type AttachmentOption = BaseOption<"getAttachment">;
/**
 * Factory tạo option definition theo kiểu strongly-typed.
 *
 * Mỗi method sẽ gắn sẵn `method` tương ứng với Discord Interaction API.
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

type OptionFactory = typeof option;
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
type InferOption<O> = O extends { method: infer T; required?: boolean } ? T extends keyof OptionGetReturnMap ? O["required"] extends true ? OptionGetReturnMap[T] : OptionGetReturnMap[T] | null : never : never;
/**
 * Map toàn bộ option definitions sang object option-value tương ứng.
 */
export type InferOptions<T extends Record<string, any>> = {
    [K in keyof T]: InferOption<T[K]>;
};
/**
 * Resolve option type, fallback về object rỗng nếu không có options.
 */
export type ResolveOptions<T> = T extends Record<string, any> ? InferOptions<T> : {};
/**
 * Cấu hình cho một Slash Command.
 *
 * @template TOptions Object định nghĩa options
 */
export interface SlashCommandBuilderOptions<TOptions extends Record<string, any> | undefined = undefined> {
    /**
     * Tên lệnh.
     */
    commandName: string;
    /**
     * Mô tả lệnh.
     */
    description: string;
    /**
     * 
     */
    memberpermissions?: PermissionsString[];
    /**
     * 
     */
    cooldown: CooldownConfig;
    /**
     * Khai báo options cho lệnh.
     *
     * @param {OptionFactory} option Option factory
     * @returns Object options definition
     */
    options?: (option: OptionFactory) => TOptions;
    /**
     * Hàm xử lý khi lệnh được gọi.
     *
     * @param {Client} client Discord client
     * @param {ChatInputCommandInteraction} interaction Interaction hiện tại
     * @param {ResolveOptions<TOptions>} options Options đã được parse và infer type
     */
    execute(client: Client, interaction: ChatInputCommandInteraction, options?: ResolveOptions<TOptions>): void;
}
/**
 * Builder wrapper cho Discord Slash Command,
 * hỗ trợ infer kiểu options ở compile-time.
 *
 * @template TOptions Object định nghĩa options
 */
export class SlashCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> {
    public readonly commandName: string;
    public readonly description: string;
    public readonly memberpermissions?: PermissionsString[];
    private readonly defs?: TOptions;
    private readonly handler: SlashCommandBuilderOptions<TOptions>["execute"];
    constructor(config: SlashCommandBuilderOptions<TOptions>) {
        this.commandName = config.commandName;
        this.description = config.description;
        this.memberpermissions = config.memberpermissions || ["SendMessages"];
        this.handler = config.execute;
        this.defs = config.options?.(option);
    }
    /**
     * Trả về object định nghĩa options của command.
     */
    get options(): TOptions | undefined {
        return this.defs;
    }
    /**
     * Thực thi slash command.
     *
     * @param {Client} client Discord client
     * @param {ChatInputCommandInteraction} interaction Interaction hiện tại
     */
    async execute(client: Client, interaction: ChatInputCommandInteraction) {
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