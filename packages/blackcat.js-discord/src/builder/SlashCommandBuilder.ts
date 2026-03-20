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
    User,
    PermissionResolvable,
    ClientUser,
    InteractionReplyOptions,
    CommandInteractionOptionResolver,
    SlashCommandSubcommandGroupBuilder,
} from "discord.js";

import type { Client, CooldownConfig } from "..";
import { cooldownManager } from "..";
/**
 * Alias rút gọn cho CommandInteractionOptionResolver của discord.js
 * Dùng để lấy giá trị option từ Slash Command Interaction.
 * @hidden
 */
type Resolver = CommandInteractionOptionResolver;
/**
 * Mapping giữa method lấy option của Resolver và kiểu dữ liệu trả về tương ứng.
 * @hidden
 * Ví dụ:
 * - getString -> string | null
 * - getUser -> User | null
 */
type SlashOptionGetReturnMap = {
    getString: ReturnType<Resolver["getString"]>;
    getInteger: ReturnType<Resolver["getInteger"]>;
    getNumber: ReturnType<Resolver["getNumber"]>;
    getBoolean: ReturnType<Resolver["getBoolean"]>;
    getUser: ReturnType<Resolver["getUser"]>;
    getMember: ReturnType<Resolver["getMember"]>;
    getRole: ReturnType<Resolver["getRole"]>;
    getChannel: ReturnType<Resolver["getChannel"]>;
    getMentionable: ReturnType<Resolver["getMentionable"]>;
    getAttachment: ReturnType<Resolver["getAttachment"]>;
};
/**
 * @hidden
 */
type BaseOption<TMethod extends keyof SlashOptionGetReturnMap> = {
    /**
     * Method của CommandInteractionOptionResolver dùng để lấy dữ liệu
     */
    method: TMethod;
    /**
     * Mô tả option hiển thị trong Discord UI
     */
    description: string;
    /**
     * Option có bắt buộc hay không
     */
    required: boolean;
};
/**
 * @hidden
 */
type StringOption = BaseOption<"getString"> & {
    /**
     * Danh sách lựa chọn cố định
     */
    choices?: Array<{ name: string; value: string }>;
    /**
     * Độ dài tối thiểu
     */
    minLength?: number;
    /**
     * Độ dài tối đa
     */
    maxLength?: number;
};
/**
 * @hidden
 */
type IntegerOption = BaseOption<"getInteger"> & {
    /**
     * Danh sách lựa chọn số nguyên
     */
    choices?: Array<{ name: string; value: number }>;
    /**
     * Giá trị nhỏ nhất
     */
    min?: number;
    /**
     * Giá trị lớn nhất
     */
    max?: number;
};
/**
 * @hidden
 */
type NumberOption = BaseOption<"getNumber"> & {
    /**
     * Danh sách lựa chọn số
     */
    choices?: Array<{ name: string; value: number }>;
    /**
     * Giá trị nhỏ nhất
     */
    min?: number;
    /**
     * Giá trị lớn nhất
     */
    max?: number;
};
/**
 * @hidden
 */
type ChannelOption = BaseOption<"getChannel"> & {
    /**
     * Giới hạn loại channel có thể chọn
     */
    channelTypes?: Array<keyof typeof ChannelType>;
};
/**
 * @hidden
 */
type BooleanOption = BaseOption<"getBoolean">;
/**
 * @hidden
 */
type UserOption = BaseOption<"getUser">;
/**
 * @hidden
 */
type MemberOption = BaseOption<"getMember">;
/**
 * @hidden
 */
type RoleOption = BaseOption<"getRole">;
/**
 * @hidden
 */
type MentionableOption = BaseOption<"getMentionable">;
/**
 * @hidden
 */
type AttachmentOption = BaseOption<"getAttachment">;
/**
 * Factory tạo option cho Slash Command.
 * @hidden
 *
 * Cung cấp API dạng:
 * ```ts
 * option.string({...})
 * option.integer({...})
 * option.user({...})
 * ```
 *
 * Object được freeze để tránh bị sửa runtime.
 */
const slashOption = Object.freeze({
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
 * Kiểu của option factory
 * @hidden
 */
type OptionFactory = typeof slashOption;
/**
 * Infer kiểu dữ liệu trả về của một option.
 * @hidden
 *
 * Nếu `required: true` → trả về kiểu trực tiếp  
 * Nếu `required: false` → trả về `T | null`
 */
type InferOption<O> = O extends { method: infer T; required?: boolean } ? T extends keyof SlashOptionGetReturnMap ? O["required"] extends true ? SlashOptionGetReturnMap[T] : SlashOptionGetReturnMap[T] | null : never : never;
/**
 * Infer toàn bộ object options.
 * @hidden
 * Ví dụ:
 * ```ts
 * {
 *   name: string
 *   user: User | null
 * }
 * ```
 */
type InferOptions<T extends Record<string, any>> = {
    [K in keyof T]: InferOption<T[K]>;
};

/**
 * Interface builder cho một Slash Subcommand.
 *
 * @template TOptions danh sách option của subcommand
 */
export interface ISlashSubCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> {
    /**
     * Mô tả subcommand
     */
    description: string;
    /**
     * Danh sách option
     */
    options?: TOptions;
    /**
     * Build subcommand vào builder của Discord
     */
    build(name: string, parent: DiscordSlashCommandBuilder | SlashCommandSubcommandGroupBuilder): void;
    /**
     * Parse option từ interaction
     */
    parse(interaction: ChatInputCommandInteraction): TOptions extends Record<string, any> ? InferOptions<TOptions> : {};
}
/**
 * Interface builder cho nhóm subcommand.
 */
export interface ISlashSubCommandGroup<TSubs extends Record<string, ISlashSubCommandBuilder<any>>> {
    /**
     * Mô tả group
     */
    description: string;
    /**
     * Danh sách subcommand trong group
     */
    subcommands: TSubs;
    /**
     * Build group vào SlashCommandBuilder
     */
    build(name: string, builder: DiscordSlashCommandBuilder): any;
}

/**
 * Config khởi tạo Subcommand Builder
 * @hidden
 */
interface SlashSubCommandBuilderConfig<TOptions> {
    description: string;
    options?: (option: OptionFactory) => TOptions;
}
/**
 * Config khởi tạo Subcommand Group Builder
 * @hidden
 */
interface SlashSubCommandGroupBuilderConfig<TSubs> {
    description: string;
    subcommands: TSubs;
}

/**
 * Cấu hình permission cho slash command
 */
export interface SlashPermissionConfig {
    /**
     * Danh sách quyền cần thiết
     */
    permission: PermissionResolvable[];
    /**
     * Hàm trả về message khi không đủ quyền
     */
    message?: (ctx: {
        commandName: string;
        user: User;
        bot: ClientUser;
    }) => InteractionReplyOptions;
}


/**
 * Infer root options của command
 * @hidden
 */
type RootOptions<TOptions> = TOptions extends Record<string, unknown> ? InferOptions<TOptions> : Record<string, never>;
/**
 * Kiểu options được truyền vào hàm execute
 * @hidden
 *
 * Bao gồm:
 * - root options
 * - payload subcommand hoặc group
 */
type ExecuteOptions<TOptions, TSubs, TGroups> = RootOptions<TOptions> & {
    payload: DirectSubUnion<TSubs> | GroupSubUnion<TGroups> | null;
};
/**
 * InteractionOptions được expose cho execute
 * Loại bỏ các method không cần thiết.
 * @hidden
 */
type InteractionOptions = Omit<CommandInteractionOptionResolver, "getMessage" | "getFocused">;
/**
 * Infer kiểu dữ liệu options của một subcommand.
 * @hidden
 *
 * Nếu subcommand có options → suy luận kiểu từ InferOptions  
 * Nếu không có → trả về object rỗng.
 *
 * @template T kiểu ISlashSubCommandBuilder
 */
type InferSub<T> = T extends ISlashSubCommandBuilder<infer O> ? O extends Record<string, any> ? InferOptions<O> : {} : never;
/**
 * Union type cho các subcommand trực tiếp (không thuộc group).
 * @hidden
 *
 * Ví dụ:
 * ```ts
 * {
 *   type: "sub",
 *   sub: "ping",
 *   options: { user: User | null }
 * }
 * |
 * {
 *   type: "sub",
 *   sub: "info",
 *   options: {}
 * }
 * ```
 *
 * @template TSubs danh sách subcommand
 */
type DirectSubUnion<TSubs> = {
    [K in keyof TSubs]: {
        /**
         * Loại payload là subcommand trực tiếp
         */
        type: "sub";
        /**
         * Tên subcommand
         */
        sub: K;
        /**
         * Options của subcommand sau khi parse
         */
        options: InferSub<TSubs[K]>;
    };
}[keyof TSubs];

/**
 * Union type cho subcommand nằm trong group.
 * @hidden
 *
 * Ví dụ:
 * ```ts
 * {
 *   type: "group",
 *   group: "admin",
 *   sub: "ban",
 *   options: { user: User }
 * }
 * ```
 *
 * @template TGroups danh sách group
 */
type GroupSubUnion<TGroups> = {
    [G in keyof TGroups]: TGroups[G] extends ISlashSubCommandGroup<infer Subs> ? {
        [S in keyof Subs]: {
            /**
             * Payload thuộc subcommand group
             */
            type: "group";
            /**
             * Tên group
             */
            group: G;
            /**
             * Tên subcommand trong group
             */
            sub: S;
            /**
             * Options của subcommand
             */
            options: InferSub<Subs[S]>;
        };
    }[keyof Subs] : never;
}[keyof TGroups];
/**
 * Map handler cho từng loại Slash option.
 * @hidden
 *
 * Mỗi option type sẽ có:
 * - parse(): đọc dữ liệu từ InteractionOptions
 * - build(): build option vào DiscordSlashCommandBuilder
 *
 * Key tương ứng với method trong CommandInteractionOptionResolver.
 *
 * Ví dụ:
 * - getString
 * - getUser
 * - getChannel
 */
type OptionHandlerMap = {
    [K in keyof SlashOptionGetReturnMap]: {
        /**
         * Parse giá trị option từ interaction
         *
         * @param opts resolver của interaction
         * @param key tên option
         * @param req option có bắt buộc hay không
         */
        parse: (opts: InteractionOptions, key: string, req: boolean) => SlashOptionGetReturnMap[K];
        /**
         * Build option vào SlashCommandBuilder của Discord
         *
         * @param builder slash command builder
         * @param name tên option
         * @param def định nghĩa option
         */
        build: (builder: DiscordSlashCommandBuilder, name: string, def: any) => void;
    };
};


/**
 * Cấu hình khởi tạo cho SlashCommandBuilder.
 *
 * Interface này định nghĩa toàn bộ metadata và hành vi của một Slash Command,
 * bao gồm:
 * - tên command
 * - mô tả
 * - quyền sử dụng
 * - cooldown
 * - options gốc
 * - subcommands
 * - groups
 * - hàm execute
 *
 * @template TOptions kiểu options gốc của command
 * @template TSubs danh sách subcommand trực tiếp
 * @template TGroups danh sách subcommand group
 */
export interface SlashCommandBuilderOptions<
    TOptions extends Record<string, any> | undefined = undefined,
    TSubs extends Record<string, ISlashSubCommandBuilder<any>> = {},
    TGroups extends Record<string, ISlashSubCommandGroup<any>> = {}
> {
    /**
     * Tên slash command.
     *
     * Ví dụ:
     * ```
     * /ping
     * /moderation
     * ```
     */
    commandName: string;
    /**
     * Mô tả command hiển thị trong Discord.
     */
    description: string;
    /**
     * Cấu hình quyền người dùng để sử dụng command.
     *
     * Nếu người dùng không đủ quyền,
     * message callback sẽ được gọi để trả về phản hồi.
     */
    userPermission?: SlashPermissionConfig;
    /**
     * Cấu hình cooldown cho command.
     *
     * Giúp giới hạn tần suất sử dụng command
     * để tránh spam.
     */
    cooldown?: CooldownConfig;
    /**
     * Danh sách subcommand trực tiếp.
     *
     * Ví dụ:
     * ```
     * /music play
     * /music stop
     * ```
     */
    subcommands?: TSubs;
    /**
     * Danh sách subcommand group.
     *
     * Ví dụ:
     * ```
     * /admin user ban
     * /admin user kick
     * ```
     */
    groups?: TGroups;
    /**
     * Định nghĩa root options cho command.
     *
     * Ví dụ:
     * ```ts
     * options: (option) => ({
     *   user: option.user({
     *     description: "User cần xem",
     *     required: true
     *   })
     * })
     * ```
     */
    options?: (option: OptionFactory) => TOptions;
    /**
     * Hàm thực thi khi slash command được gọi.
     *
     * @param client Discord Client
     * @param interaction interaction của slash command
     * @param options object đã được parse và type-safe
     *
     * `options` bao gồm:
     * - root options
     * - payload subcommand hoặc group
     *
     * Ví dụ payload:
     *
     * ```ts
     * options.payload
     * ```
     *
     * có thể là:
     *
     * ```ts
     * { type: "sub", sub: "ping", options: {} }
     * ```
     *
     * hoặc
     *
     * ```ts
     * {
     *   type: "group",
     *   group: "admin",
     *   sub: "ban",
     *   options: { user: User }
     * }
     * ```
     */
    execute(client: Client, interaction: ChatInputCommandInteraction, options: ExecuteOptions<TOptions, TSubs, TGroups>): any | Promise<any>;
}

/**
 * Builder dùng để định nghĩa một Slash Subcommand.
 *
 * Class này chịu trách nhiệm:
 * - Khai báo metadata của subcommand
 * - Build subcommand vào DiscordSlashCommandBuilder
 * - Parse options từ ChatInputCommandInteraction
 *
 * @template TOptions kiểu object định nghĩa options của subcommand
 */
export class SlashSubCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> implements ISlashSubCommandBuilder<TOptions> {
    /**
     * Mô tả của subcommand hiển thị trong Discord.
     */
    public readonly description: string;
    /**
     * Object định nghĩa các option của subcommand.
     *
     * Được tạo từ OptionFactory trong constructor.
     */
    private readonly defs?: TOptions;
    /**
     * Khởi tạo SlashSubCommandBuilder.
     *
     * @param config cấu hình subcommand
     */
    constructor(config: SlashSubCommandBuilderConfig<TOptions>) {
        this.description = config.description;
        this.defs = config.options?.(slashOption);
    }
    /**
     * Build subcommand vào SlashCommandBuilder của Discord.
     * @hidden
     *
     * Method này sẽ:
     * - tạo subcommand mới
     * - thêm description
     * - thêm toàn bộ option đã định nghĩa
     *
     * @param name tên subcommand
     * @param parent builder cha (root command hoặc subcommand group)
     */
    public build(name: string, parent: DiscordSlashCommandBuilder | SlashCommandSubcommandGroupBuilder) {
        parent.addSubcommand((sub) => {
            sub.setName(name).setDescription(this.description);
            const defs = this.defs;
            if (!defs) return sub;
            for (const [key, def] of Object.entries(defs)) {
                /**
                 * Chuyển method resolver sang method builder
                 *
                 * Ví dụ:
                 * getString -> addStringOption
                 * getUser -> addUserOption
                 */
                const addOption = (sub as any)[def.method.replace("get", "add") + "Option"].bind(sub);
                addOption((opt: any) => {
                    opt.setName(key).setDescription(def.description).setRequired(def.required);
                    if (def.choices?.length) opt.addChoices(...def.choices);
                    if (def.minLength !== undefined) opt.setMinLength(def.minLength);
                    if (def.maxLength !== undefined) opt.setMaxLength(def.maxLength);
                    return opt;
                });
            }
            return sub;
        });
    }
    /**
     * Parse options của subcommand từ interaction.
     * @hidden
     *
     * Method này sẽ:
     * - đọc toàn bộ option đã khai báo
     * - gọi đúng resolver method tương ứng
     *
     * Ví dụ:
     * ```
     * interaction.options.getString(...)
     * interaction.options.getUser(...)
     * ```
     *
     * @param interaction ChatInputCommandInteraction từ Discord
     *
     * @returns object options đã được parse
     */
    public parse(interaction: ChatInputCommandInteraction): TOptions extends Record<string, any> ? InferOptions<TOptions> : {} {
        if (!this.defs) return {} as any;
        const result: any = {};
        for (const key in this.defs) {
            const def = this.defs[key];
            /**
             * Gọi resolver method tương ứng
             * Ví dụ:
             * getString
             * getUser
             * getChannel
             */
            result[key] = (interaction.options as any)[def.method](key, !!def.required);
        }
        return result;
    }
}
/**
 * Builder dùng để định nghĩa một Subcommand Group trong Slash Command.
 *
 * Subcommand group cho phép tổ chức nhiều subcommand theo nhóm.
 *
 * Ví dụ cấu trúc lệnh:
 * ```
 * /admin user ban
 * /admin user kick
 * ```
 *
 * Trong đó:
 * - `admin` là command
 * - `user` là group
 * - `ban`, `kick` là subcommand
 *
 * @template TSubs danh sách subcommand thuộc group
 *
 * @example
 * ```ts
 * const userGroup = new SlashSubCommandGroupBuilder({
 *   description: "Quản lý user",
 *   subcommands: {
 *     ban: new SlashSubCommandBuilder({
 *       description: "Ban một user",
 *       options: (opt) => ({
 *         target: opt.user({
 *           description: "User cần ban",
 *           required: true
 *         })
 *       })
 *     }),
 *
 *     kick: new SlashSubCommandBuilder({
 *       description: "Kick một user",
 *       options: (opt) => ({
 *         target: opt.user({
 *           description: "User cần kick",
 *           required: true
 *         })
 *       })
 *     })
 *   }
 * });
 * ```
 */
export class SlashSubCommandGroupBuilder<TSubs extends Record<string, ISlashSubCommandBuilder<any>>> implements ISlashSubCommandGroup<TSubs> {
    /**
     * Mô tả của subcommand group hiển thị trong Discord.
     */
    public readonly description: string;
    /**
     * Danh sách các subcommand trong group.
     *
     * Key là tên subcommand,
     * value là instance của SlashSubCommandBuilder.
     */
    public readonly subcommands: TSubs;
    /**
     * Khởi tạo SlashSubCommandGroupBuilder.
     *
     * @param options cấu hình group
     */
    constructor(options: SlashSubCommandGroupBuilderConfig<TSubs>) {
        this.description = options.description;
        this.subcommands = options.subcommands;
    }
    /**
     * Build subcommand group vào DiscordSlashCommandBuilder.
     * @hidden
     *
     * Method này sẽ:
     * - tạo subcommand group
     * - set tên và mô tả
     * - build toàn bộ subcommand con
     *
     * @param name tên group
     * @param builder slash command builder gốc
     */
    public build(name: string, builder: DiscordSlashCommandBuilder) {
        builder.addSubcommandGroup((group: SlashCommandSubcommandGroupBuilder) => {
            group.setName(name).setDescription(this.description);
            /**
             * Build từng subcommand trong group
             */
            for (const [key, sub] of Object.entries(this.subcommands)) {
                sub.build(key, group);
            }
            return group;
        });
    }
}
/**
 * Builder chính dùng để định nghĩa một Slash Command.
 *
 * Class này chịu trách nhiệm:
 * - Khai báo metadata của command
 * - Lưu root options
 * - Lưu subcommands
 * - Lưu subcommand groups
 * - Định nghĩa hàm execute xử lý interaction
 *
 * Đây là class trung tâm của hệ thống slash command trong framework.
 *
 * @template TOptions kiểu options gốc của command
 * @template TSubs danh sách subcommand trực tiếp
 * @template TGroups danh sách subcommand group
 *
 * @example
 * Command đơn giản
 * ```ts
 * const pingCommand = new SlashCommandBuilder({
 *   commandName: "ping",
 *   description: "Kiểm tra bot",
 *
 *   execute: async (client, interaction) => {
 *     await interaction.reply("Pong!");
 *   }
 * });
 * ```
 *
 * @example
 * Command có options
 * ```ts
 * const avatarCommand = new SlashCommandBuilder({
 *   commandName: "avatar",
 *   description: "Xem avatar user",
 *
 *   options: (opt) => ({
 *     user: opt.user({
 *       description: "User cần xem avatar",
 *       required: false
 *     })
 *   }),
 *
 *   execute: async (client, interaction, options) => {
 *     const user = options.user ?? interaction.user;
 *     await interaction.reply(user.displayAvatarURL());
 *   }
 * });
 * ```
 *
 * @example
 * Command có subcommand
 * ```ts
 * const musicCommand = new SlashCommandBuilder({
 *   commandName: "music",
 *   description: "Lệnh nhạc",
 *
 *   subcommands: {
 *     play: new SlashSubCommandBuilder({
 *       description: "Phát nhạc",
 *       options: (opt) => ({
 *         query: opt.string({
 *           description: "Tên bài hát",
 *           required: true
 *         })
 *       })
 *     }),
 *
 *     stop: new SlashSubCommandBuilder({
 *       description: "Dừng nhạc"
 *     })
 *   },
 *
 *   execute: async (client, interaction, options) => {
 *
 *     if (options.payload?.type === "sub") {
 *
 *       if (options.payload.sub === "play") {
 *         const { query } = options.payload.options;
 *         await interaction.reply(`Playing: ${query}`);
 *       }
 *
 *       if (options.payload.sub === "stop") {
 *         await interaction.reply("Stopped music.");
 *       }
 *
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * Command có subcommand group
 *
 * Cấu trúc lệnh:
 * ```
 * /admin user ban
 * /admin user kick
 * /admin role add
 * /admin role remove
 * ```
 *
 * ```ts
 * const adminCommand = new SlashCommandBuilder({
 *   commandName: "admin",
 *   description: "Lệnh quản trị",
 *
 *   groups: {
 *
 *     user: new SlashSubCommandGroupBuilder({
 *       description: "Quản lý user",
 *
 *       subcommands: {
 *
 *         ban: new SlashSubCommandBuilder({
 *           description: "Ban user",
 *           options: (opt) => ({
 *             target: opt.user({
 *               description: "User cần ban",
 *               required: true
 *             }),
 *
 *             reason: opt.string({
 *               description: "Lý do ban",
 *               required: false
 *             })
 *           })
 *         }),
 *
 *         kick: new SlashSubCommandBuilder({
 *           description: "Kick user",
 *           options: (opt) => ({
 *             target: opt.user({
 *               description: "User cần kick",
 *               required: true
 *             })
 *           })
 *         })
 *
 *       }
 *     }),
 *
 *     role: new SlashSubCommandGroupBuilder({
 *       description: "Quản lý role",
 *
 *       subcommands: {
 *
 *         add: new SlashSubCommandBuilder({
 *           description: "Thêm role",
 *           options: (opt) => ({
 *             user: opt.user({
 *               description: "User",
 *               required: true
 *             }),
 *
 *             role: opt.role({
 *               description: "Role",
 *               required: true
 *             })
 *           })
 *         }),
 *
 *         remove: new SlashSubCommandBuilder({
 *           description: "Gỡ role",
 *           options: (opt) => ({
 *             user: opt.user({
 *               description: "User",
 *               required: true
 *             }),
 *
 *             role: opt.role({
 *               description: "Role",
 *               required: true
 *             })
 *           })
 *         })
 *
 *       }
 *     })
 *
 *   },
 *
 *   async execute(client, interaction, options) {
 *
 *     if (options.payload?.type !== "group") return;
 *
 *     const { group, sub, options: opts } = options.payload;
 *
 *     if (group === "user" && sub === "ban") {
 *       await interaction.reply(`Ban ${opts.target?.tag}`);
 *     }
 *
 *     if (group === "user" && sub === "kick") {
 *       await interaction.reply(`Kick ${opts.target?.tag}`);
 *     }
 *
 *   }
 * });
 * ```
 */
export class SlashCommandBuilder<
    TOptions extends Record<string, any> | undefined = undefined,
    TSubs extends Record<string, ISlashSubCommandBuilder<any>> = {},
    TGroups extends Record<string, ISlashSubCommandGroup<any>> = {}
> {
    /**
     * Tên slash command.
     *
     * Ví dụ:
     * `/ping`
     * `/admin`
     */
    public commandName!: string;
    /**
     * Mô tả command hiển thị trong Discord.
     */
    public description!: string;
    /**
     * Cấu hình quyền người dùng cần có để sử dụng command.
     */
    public userPermission?: SlashPermissionConfig;
    /**
     * Cấu hình cooldown để tránh spam command.
     */
    public cooldown?: CooldownConfig;
    /**
     * Định nghĩa root options của command.
     */
    private defs?: TOptions;
    /**
     * Danh sách subcommand trực tiếp.
     */
    private subsCommands: TSubs = {} as TSubs;
    /**
     * Danh sách subcommand group.
     */
    private groups: TGroups = {} as TGroups;
    /**
     * Hàm xử lý khi command được thực thi.
     *
     * Hàm này sẽ được gọi khi Discord gửi interaction.
     */
    private handler!: (client: Client, interaction: ChatInputCommandInteraction, options: ExecuteOptions<TOptions, TSubs, TGroups>) => any;
    /**
     * Map handler cho từng loại option của Slash Command.
     * @hidden
     *
     * Mỗi key tương ứng với một method của `CommandInteractionOptionResolver`
     * (ví dụ: `getString`, `getUser`, `getRole`...).
     *
     * Handler gồm 2 phần:
     *
     * - `parse` → dùng để đọc dữ liệu từ `interaction.options`
     * - `build` → dùng để build option vào `DiscordSlashCommandBuilder`
     *
     * Nhờ map này, hệ thống có thể:
     *
     * - tự động parse options khi command được gọi
     * - tự động build option khi đăng ký slash command
     *
     * mà không cần `switch-case` theo từng loại option.
     */
    private optionHandlers: OptionHandlerMap = {
        getString: {
            parse: (opts: InteractionOptions, key: string, req: boolean) => opts.getString(key, req),
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
     * Khởi tạo SlashCommandBuilder.
     *
     * Nếu truyền `config`, builder sẽ tự động áp dụng cấu hình
     * thông qua `applyConfig`.
     *
     * @param config cấu hình khởi tạo command
     */
    constructor(config?: SlashCommandBuilderOptions<TOptions, TSubs, TGroups>) {
        if (config) this.applyConfig(config);
    }
    /**
     * Áp dụng config object vào builder.
     * @hidden
     *
     * Function này được gọi bởi constructor để setup command.
     */
    private applyConfig(config: SlashCommandBuilderOptions<TOptions, TSubs, TGroups>) {
        this.commandName = config.commandName;
        this.description = config.description;
        this.userPermission = config.userPermission;
        this.cooldown = config.cooldown;
        if (config.subcommands) {
            this.subsCommands = config.subcommands as TSubs;
        }
        if (config.groups) {
            this.groups = config.groups as TGroups;
        }
        this.handler = config.execute;
        this.defs = config.options?.(slashOption);
    }
    /**
     * Lấy options đã được build.
     */
    get options(): TOptions | undefined {
        return this.defs;
    }
    /**
     * Set tên command.
     *
     * @param name tên command
     *
     * @example
     * .setName("ping")
     */
    public setName(name: string) {
        this.commandName = name;
        return this;
    }
    /**
     * Set mô tả command.
     *
     * @param description mô tả command
     *
     * @example
     * .setDescription("Ping command")
     */
    public setDescription(description: string) {
        this.description = description;
        return this;
    }
    /**
     * Set cooldown cho command.
     *
     * @param cooldown cấu hình cooldown
     *
     * @example
     * .setCooldown({
     *   time: 5,
     *   scope: "user"
     * })
     */
    public setCooldown(cooldown: CooldownConfig) {
        this.cooldown = cooldown;
        return this;
    }
    /**
     * Set permission yêu cầu để sử dụng command.
     *
     * @param permission permission config
     */
    public setUserPermissions(permission: SlashPermissionConfig) {
        this.userPermission = permission;
        return this;
    }
    /**
     * Định nghĩa options cho command.
     *
     * @param options function tạo options
     *
     * @example
     * .setOptions((opt) => ({
     *   user: opt.user({
     *      description: "Target user",
     *      required: true
     *   }),
     *   reason: opt.string({
     *      description: "Ban reason"
     *   })
     * }))
     */
    public setOptions<T extends Record<string, any>>(options: (opt: OptionFactory) => T): SlashCommandBuilder<T, TSubs, TGroups> {
        this.defs = options(slashOption) as any
        return this as any
    }
    /**
     * Set subcommands cho command.
     *
     * @param subs danh sách subcommands
     *
     * @example
     * .setSubcommands({
     *   play: playSubcommand,
     *   stop: stopSubcommand
     * })
     */
    public setSubcommands<T extends Record<string, ISlashSubCommandBuilder<any>>>(subs: T): SlashCommandBuilder<TOptions, T, TGroups> {
        this.subsCommands = subs as any;
        return this as any;
    }
    /**
     * Set subcommand groups cho command.
     *
     * Groups dùng để tổ chức command lớn.
     *
     * @example
     * /admin user ban
     * /admin user kick
     */
    public setGroups<T extends Record<string, ISlashSubCommandGroup<any>>>(groups: T): SlashCommandBuilder<TOptions, TSubs, T> {
        this.groups = groups as any;
        return this as any;
    }
    /**
     * Set function xử lý khi command được execute.
     *
     * @param handler function handler
     *
     * @example
     * .setExecute(async (client, interaction, options) => {
     *   await interaction.reply("Hello");
     * })
     */
    public setExecute(handler: SlashCommandBuilderOptions<TOptions, TSubs, TGroups>["execute"]) {
        this.handler = handler
        return this
    }
    /**
     * Thực thi slash command khi interaction được nhận.
     * @hidden
     *
     * Flow xử lý:
     * 1. Kiểm tra execute handler có tồn tại
     * 2. Kiểm tra permission của user
     * 3. Kiểm tra cooldown
     * 4. Parse root options
     * 5. Kiểm tra subcommand group
     * 6. Kiểm tra subcommand
     * 7. Gọi handler với payload tương ứng
     *
     * @param client Discord Client instance
     * @param interaction ChatInputCommandInteraction từ Discord
     *
     * @returns Promise<any>
     *
     * @throws Error nếu command chưa được định nghĩa execute handler
     *
     * @example
     * client.on("interactionCreate", async (interaction) => {
     *   if (!interaction.isChatInputCommand()) return;
     *
     *   const command = commands.get(interaction.commandName);
     *   if (command) {
     *      await command.execute(client, interaction);
     *   }
     * });
     */
    public async execute(client: Client, interaction: ChatInputCommandInteraction) {
        if (!this.handler) {
            throw new Error(`SlashCommand ${this.commandName} bị thiếu execute handler`);
        }
        if (this.userPermission) {
            if (!interaction.memberPermissions?.has(this.userPermission.permission || ["SendMessages"])) {
                const response = this.userPermission.message?.({
                    commandName: this.commandName,
                    user: interaction.user,
                    bot: client.user!,
                });
                return interaction.reply(response ?? { content: `Này <@${interaction.user.id}> bạn không đủ quyền hạn để sử dụng lệnh này.`, flags: MessageFlags.Ephemeral });
            }
        }
        if (this.cooldown) {
            const commands = {
                commandName: this.commandName,
                cooldown: this.cooldown,
            } as SlashCommandBuilder<any, any, any>;
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
        const rootOptions = this.defs ? this.parseOptions(interaction, this.defs) : {};

        const groupName = interaction.options.getSubcommandGroup(false);
        const subCommandName = interaction.options.getSubcommand(false);
        if (groupName && subCommandName) {
            const subBuilder = this.groups[groupName as keyof typeof this.groups].subcommands[subCommandName as any];
            const parsed = subBuilder.parse(interaction);
            return this.handler(client, interaction, {
                ...rootOptions,
                payload: {
                    type: "group",
                    group: groupName,
                    sub: subCommandName,
                    options: parsed
                }
            } as any);
        }
        if (subCommandName) {
            const subBuilder = this.subsCommands[subCommandName as keyof typeof this.subsCommands];
            const parsed = subBuilder.parse(interaction);
            return this.handler(client, interaction, {
                ...rootOptions,
                payload: {
                    type: "sub",
                    sub: subCommandName,
                    options: parsed
                }
            } as any);
        }
        // slash
        return this.handler(client, interaction, {
            ...rootOptions,
            payload: null
        } as any);
    }
    /**
     * Parse interaction options thành object typed theo định nghĩa option.
     * @hidden
     *
     * Method này dùng OptionHandlerMap để:
     * - đọc dữ liệu từ interaction
     * - convert sang kiểu TypeScript
     *
     * @param interaction Discord interaction
     * @param defs Option definitions
     *
     * @returns Parsed options object
     *
     * @example
     * defs:
     * {
     *   user: opt.user(...)
     *   reason: opt.string(...)
     * }
     *
     * result:
     * {
     *   user: User
     *   reason: string
     * }
     */
    private parseOptions<T extends Record<string, any>>(interaction: ChatInputCommandInteraction, defs: T): InferOptions<T> {
        const result = {} as any;
        const opts = interaction.options as InteractionOptions;
        const handlers = this.optionHandlers;
        for (const key in defs) {
            const def = defs[key];
            const handler = handlers[def.method as keyof typeof handlers];
            if (handler) {
                result[key] = handler.parse(opts, key, !!def.required);
            }
        }
        return result;
    }
    /**
     * Build Discord SlashCommandBuilder để đăng ký với Discord API.
     *
     * Method này:
     * 1. Kiểm tra command name và description
     * 2. Build root options
     * 3. Build subcommands
     * 4. Build subcommand groups
     *
     * @returns DiscordSlashCommandBuilder
     *
     * @throws Error nếu thiếu command name hoặc description
     *
     * @example
     * const data = command.build();
     *
     * await rest.put(
     *   Routes.applicationCommands(clientId),
     *   { body: [data.toJSON()] }
     * );
     */
    public build(): DiscordSlashCommandBuilder {
        if (!this.commandName) {
            throw new Error("SlashCommandBuilder: thiếu tên lệnh");
        }
        if (!this.description) {
            throw new Error("SlashCommandBuilder: thiếu mô tả lệnh");
        }

        const builder = new DiscordSlashCommandBuilder().setName(this.commandName).setDescription(this.description);
        // slash commands
        const defs = this.defs;
        if (defs) {
            const handlers = this.optionHandlers;
            for (const name in defs) {
                const def = defs[name];
                const handler = handlers[def.method as keyof typeof handlers];
                if (handler) handler.build(builder, name, def);
            }
        }
        // slash subs commands
        for (const key in this.subsCommands) {
            this.subsCommands[key].build(key, builder);
        }
        // slash groups
        for (const key in this.groups) {
            this.groups[key].build(key, builder);
        }
        return builder;
    }
}