import { SlashCommandBuilder as DiscordSlashCommandBuilder, MessageFlags, SlashCommandSubcommandBuilder, SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { ChatInputCommandInteraction, GuildMember, SlashCommandAttachmentOption, SlashCommandBooleanOption, SlashCommandChannelOption, SlashCommandIntegerOption, SlashCommandStringOption } from "discord.js";
import type { CommandBuilder, InferOptions, OptionFactory, SlashCommandBuilder, Client, CooldownConfig, SlashPermissionConfig } from "..";
import { cooldownManager, option } from "..";

/**
 * Interface đại diện cho một Slash Subcommand.
 *
 * @template TOptions Kiểu dữ liệu option definitions.
 */
export interface ISlashSubCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> {
    /**
     * Mô tả subcommand hiển thị trong Discord UI.
     */
    description: string;
    /**
     * Option definitions của subcommand.
     */
    options?: TOptions;
    /**
     * Build subcommand vào parent builder.
     *
     * @param name Tên subcommand
     * @param parent Parent builder (command hoặc group)
     */
    build(name: string, parent: DiscordSlashCommandBuilder | SlashCommandSubcommandGroupBuilder): any;
    /**
     * Parse options từ interaction.
     *
     * @param interaction Interaction hiện tại
     */
    parse(interaction: ChatInputCommandInteraction): TOptions extends Record<string, any> ? InferOptions<TOptions> : {};
}

/**
 * Config dùng để tạo SlashSubCommandBuilder.
 */
export interface SlashSubCommandBuilderConfig<TOptions> {
    /**
     * Mô tả subcommand.
     */
    description: string;
    /**
     * Factory định nghĩa options.
     */
    options?: (option: OptionFactory) => TOptions;
}

/**
 * Builder cho một Slash Subcommand.
 *
 * Class này đại diện cho một **subcommand** trong hệ thống Slash Command của Discord.
 * Nó cho phép:
 *
 * - định nghĩa options cho subcommand
 * - build subcommand vào command hoặc subcommand group
 * - parse options từ interaction với type inference
 *
 * @template TOptions
 * Object định nghĩa các options của subcommand.
 *
 * Nếu không khai báo options thì `TOptions` sẽ là `undefined`
 * và method {@link parse} sẽ trả về `{}`.
 *
 * @example
 * ```ts
 * const banSub = new SlashSubCommandBuilder({
 *   description: "Ban một user",
 *   options: (option) => ({
 *     user: option.user({
 *       description: "User cần ban",
 *       required: true
 *     }),
 *     reason: option.string({
 *       description: "Lý do",
 *       required: false
 *     })
 *   })
 * });
 * ```
 */
export class SlashSubCommandBuilder<TOptions extends Record<string, any> | undefined = undefined> implements ISlashSubCommandBuilder<TOptions> {
    /**
     * Mô tả của subcommand.
     *
     * Nội dung này sẽ hiển thị trong Discord khi người dùng
     * xem danh sách subcommands của slash command.
     */
    public readonly description: string;
    /**
     * Option definitions nội bộ của subcommand.
     *
     * Object này được tạo từ factory `option(...)`
     * và dùng cho:
     *
     * - build options vào DiscordSlashCommandBuilder
     * - parse options từ interaction
     */
    private readonly defs?: TOptions;
    /**
     * Tạo một instance của SlashSubCommandBuilder.
     *
     * @param config Cấu hình của subcommand.
     */
    constructor(config: SlashSubCommandBuilderConfig<TOptions>) {
        this.description = config.description;
        this.defs = config.options?.(option);
    }
    /**
     * Build subcommand vào slash command hoặc subcommand group.
     * @hidden
     */
    public build(name: string, parent: DiscordSlashCommandBuilder | SlashCommandSubcommandGroupBuilder) {
        parent.addSubcommand((sub) => {
            sub.setName(name).setDescription(this.description);

            const defs = this.defs;
            if (!defs) return sub;

            for (const [key, def] of Object.entries(defs)) {
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
     * Parse options từ Discord Interaction.
     * @hidden
     */
    public parse(interaction: ChatInputCommandInteraction): TOptions extends Record<string, any> ? InferOptions<TOptions> : {} {
        if (!this.defs) return {} as any;
        const result: any = {};
        for (const key in this.defs) {
            const def = this.defs[key];
            result[key] = (interaction.options as any)[def.method](key, !!def.required);
        }
        return result;
    }
}

/**
 * Interface cho Slash Subcommand Group.
 */
export interface ISlashSubCommandGroup<TSubs extends Record<string, ISlashSubCommandBuilder<any>>> {
    /**
     * Mô tả group.
     */
    description: string;
    /**
     * Danh sách subcommands trong group.
     */
    subcommands: TSubs;
    /**
     * Build group vào SlashCommandBuilder.
     * @hidden
     */
    build(name: string, builder: DiscordSlashCommandBuilder): any;
}


/**
 * Config tạo SlashSubCommandGroupBuilder.
 */
export interface SlashSubCommandGroupBuilderConfig<TSubs> {
    /**
     * Mô tả group.
     */
    description: string;
    /**
     * Danh sách subcommands.
     */
    subcommands: TSubs;
}

/**
 * Builder cho Slash Command Subcommand Group.
 *
 * Class này dùng để tạo một **subcommand group** trong Discord Slash Command,
 * cho phép nhóm nhiều subcommand lại dưới cùng một namespace.
 *
 * Ví dụ cấu trúc Discord:
 *
 * ```
 * /admin
 *   ├─ user ban
 *   ├─ user kick
 *   └─ role add
 * ```
 *
 * Trong đó:
 * - `user` là **subcommand group**
 * - `ban`, `kick` là **subcommands**
 *
 * @template TSubs
 * Object chứa các subcommand builder của group.
 *
 * Ví dụ:
 *
 * ```ts
 * new SlashSubCommandGroupBuilder({
 *   description: "Quản lý user",
 *   subcommands: {
 *     ban: new SlashSubCommandBuilder(...),
 *     kick: new SlashSubCommandBuilder(...)
 *   }
 * })
 * ```
 */
export class SlashSubCommandGroupBuilder<TSubs extends Record<string, ISlashSubCommandBuilder<any>>> implements ISlashSubCommandGroup<TSubs> {
    /**
     * Mô tả của subcommand group.
     *
     * Mô tả này sẽ hiển thị trong Discord khi người dùng
     * xem danh sách subcommand groups.
     */
    public readonly description: string;
    /**
     * Danh sách các subcommand thuộc group này.
     *
     * Key của object sẽ trở thành **tên subcommand** trong Discord.
     */
    public readonly subcommands: TSubs;
    /**
     * Tạo một instance của SlashSubCommandGroupBuilder.
     *
     * @param options Cấu hình cho subcommand group.
     */
    constructor(options: SlashSubCommandGroupBuilderConfig<TSubs>) {
        this.description = options.description;
        this.subcommands = options.subcommands;
    }
    /**
     * Build subcommand group vào `DiscordSlashCommandBuilder`.
     * @hidden
     */
    public build(name: string, builder: DiscordSlashCommandBuilder) {
        builder.addSubcommandGroup((group: SlashCommandSubcommandGroupBuilder) => {
            group.setName(name).setDescription(this.description);
            for (const key in this.subcommands) {
                this.subcommands[key].build(key, group);
            }
            return group;
        });
    }
}
/**
 * Suy luận kiểu options của một subcommand builder.
 * @hidden
 */
export type InferSub<T> = T extends ISlashSubCommandBuilder<infer O> ? O extends Record<string, any> ? InferOptions<O> : {} : never;
/**
 * Tạo union payload cho các **subcommand trực tiếp** của command.
 * @hidden
 */
export type DirectSubUnion<TSubs> = {
    [K in keyof TSubs]: {
        /**
         * Discriminator để phân biệt payload type.
         */
        type: "sub";
        /**
         * Tên subcommand.
         */
        sub: K;
        /**
         * Options của subcommand đã được infer.
         */
        options: InferSub<TSubs[K]>;
    };
}[keyof TSubs];

/**
 * Tạo union payload cho các **subcommand nằm trong subcommand group**.
 * @hidden
 */
export type GroupSubUnion<TGroups> = {
    [G in keyof TGroups]: TGroups[G] extends ISlashSubCommandGroup<infer Subs> ? {
        [S in keyof Subs]: {
            type: "group";
            group: G;
            sub: S;
            options: InferSub<Subs[S]>;
        };
    }[keyof Subs] : never;
}[keyof TGroups];

/**
 * Cấu hình cho một Slash Command có hỗ trợ:
 *
 * - Subcommands
 * - Subcommand Groups
 *
 * Interface này dùng để khởi tạo `SlashCommandBuilderWithSubs`.
 *
 * @template TSubs
 * Object chứa các **subcommand trực tiếp** của command.
 *
 * @template TGroups
 * Object chứa các **subcommand group** của command.
 */
export interface ISlashCommandWithSubsConfig<TSubs extends Record<string, ISlashSubCommandBuilder<any>> = {}, TGroups extends Record<string, ISlashSubCommandGroup<any>> = {}> {
    /**
     * Tên của slash command.
     *
     * Không được chứa khoảng trắng.
     *
     * Ví dụ:
     * ```
     * ping
     * user
     * admin
     * ```
     */
    commandName: string;
    /**
     * Mô tả của slash command.
     *
     * Discord yêu cầu tối đa **100 ký tự**.
     */
    description: string;
    /**
     * Cấu hình permission cần thiết để sử dụng command.
     *
     * Nếu không khai báo thì mọi member đều có thể sử dụng.
     */
    userPermission?: SlashPermissionConfig;
    /**
     * Cấu hình cooldown cho command.
     *
     * Dùng để giới hạn số lần sử dụng command trong một khoảng thời gian.
     */
    cooldown?: CooldownConfig;
    /**
     * Danh sách **subcommands trực tiếp** của command.
     *
     * Key của object sẽ trở thành tên subcommand.
     *
     * @example
     * ```ts
     * subcommands: {
     *   ping: new SlashSubCommandBuilder({...}),
     *   info: new SlashSubCommandBuilder({...})
     * }
     * ```
     */
    subcommands?: TSubs;
    /**
     * Danh sách **subcommand groups** của command.
     *
     * Key của object sẽ trở thành tên group.
     *
     * @example
     * ```ts
     * groups: {
     *   user: new SlashSubCommandGroupBuilder({
     *     description: "User commands",
     *     subcommands: {
     *       ban: ...,
     *       kick: ...
     *     }
     *   })
     * }
     * ```
     */
    groups?: TGroups;
    /**
     * Hàm thực thi khi slash command được gọi.
     *
     * Payload sẽ là **union type** của:
     *
     * - subcommand trực tiếp
     * - subcommand trong group
     *
     * TypeScript sẽ tự động **narrow type theo `payload.type`**.
     *
     * @param client Discord client instance
     * @param interaction Interaction từ Discord
     * @param payload Payload chứa thông tin subcommand được gọi
     *
     * @example
     * ```ts
     * execute(client, interaction, payload) {
     *
     *   if (payload.type === "sub") {
     *      console.log(payload.sub);
     *      console.log(payload.options);
     *   }
     *
     *   if (payload.type === "group") {
     *      console.log(payload.group);
     *      console.log(payload.sub);
     *      console.log(payload.options);
     *   }
     *
     * }
     * ```
     */
    execute(client: Client, interaction: ChatInputCommandInteraction, payload: DirectSubUnion<TSubs> | GroupSubUnion<TGroups>): any | Promise<any>;
}

/**
 * Builder cho Slash Command hỗ trợ:
 *
 * - Subcommands
 * - Subcommand Groups
 *
 * Class này chịu trách nhiệm:
 *
 * 1. Build cấu trúc command cho Discord API
 * 2. Parse subcommand và options từ interaction
 * 3. Xử lý permission
 * 4. Xử lý cooldown
 * 5. Dispatch payload đúng vào handler
 *
 * @template TSubs Record chứa các subcommand trực tiếp
 * @template TGroups Record chứa các subcommand group
 */
export class SlashCommandBuilderWithSubs<TSubs extends Record<string, ISlashSubCommandBuilder<any>> = {}, TGroups extends Record<string, ISlashSubCommandGroup<any>> = {}> {
    /**
     * Tên của slash command.
     */
    public readonly commandName: string;
    /**
     * Mô tả của slash command.
     */
    public readonly description: string;
    /**
     * Cấu hình cooldown cho command.
     */
    public readonly cooldown?: CooldownConfig;
    /**
     * Cấu hình permission cần thiết để sử dụng command.
     */
    public readonly userPermission?: SlashPermissionConfig;
    /**
     * Danh sách subcommands trực tiếp.
     */
    private readonly subs: TSubs;
    /**
     * Danh sách subcommand groups.
     */
    private readonly groups: TGroups;
    /**
     * Handler được gọi khi command được thực thi.
     */
    private readonly handler: ISlashCommandWithSubsConfig<TSubs, TGroups>["execute"];
    /**
     * Tạo một instance mới của {@link SlashCommandBuilderWithSubs}.
     *
     * Constructor này nhận cấu hình cho một **Slash Command có subcommands
     * và/hoặc subcommand groups**, sau đó khởi tạo toàn bộ metadata cần thiết
     * để framework có thể:
     *
     * - Build schema Slash Command cho Discord API
     * - Resolve và định tuyến subcommand khi interaction xảy ra
     * - Áp dụng kiểm tra cooldown và permission
     * - Thực thi handler chính của command
     *
     * ### Cấu trúc command hỗ trợ
     *
     * Command có thể chứa:
     *
     * - **Subcommands trực tiếp**
     * ```
     * /admin reload
     * /admin stats
     * ```
     *
     * - **Subcommand groups**
     * ```
     * /admin user ban
     * /admin user kick
     * ```
     *
     * Các subcommand và group sẽ được lưu trong `subs` và `groups`
     * để phục vụ cho quá trình:
     *
     * - Build command schema
     * - Resolve subcommand khi interaction được gửi từ Discord
     *
     * @typeParam TSubs - Kiểu định nghĩa các subcommands trực tiếp.
     * Được sử dụng để suy luận type của subcommand khi xử lý interaction.
     *
     * @typeParam TGroups - Kiểu định nghĩa các subcommand groups.
     * Cho phép framework suy luận chính xác các group và subcommand bên trong.
     *
     * @param config - Cấu hình đầy đủ của slash command.
     * @param config.commandName - Tên của slash command.
     * @param config.description - Mô tả command hiển thị trong Discord UI.
     * @param config.cooldown - (Tuỳ chọn) Cấu hình cooldown để hạn chế spam command.
     * @param config.userPermission - (Tuỳ chọn) Cấu hình permission cần thiết
     * để người dùng có thể thực thi command.
     *
     * @param config.subcommands - (Tuỳ chọn) Object chứa các subcommands trực tiếp
     * của command.
     *
     * @param config.groups - (Tuỳ chọn) Object chứa các subcommand groups.
     *
     * @param config.execute - Handler được gọi khi command được thực thi.
     * Handler này chịu trách nhiệm định tuyến tới subcommand hoặc group tương ứng.
     *
     * @example
     * ```ts
     * const adminCommand = new SlashCommandBuilderWithSubs({
     *   commandName: "admin",
     *   description: "Admin commands",
     *
     *   subcommands: {
     *     reload: reloadSubCommand
     *   },
     * 
     *   groups: {
     *     user: userGroup
     *   },
     *
     *   execute: async (client, interaction, ctx) => {
     *     // ctx chứa thông tin subcommand / group được gọi
     *   }
     * });
     * ```
     */
    constructor(config: ISlashCommandWithSubsConfig<TSubs, TGroups>) {
        this.commandName = config.commandName;
        this.description = config.description;
        this.cooldown = config.cooldown;
        this.userPermission = config.userPermission;
        this.subs = (config.subcommands ?? {}) as TSubs;
        this.groups = (config.groups ?? {}) as TGroups;
        this.handler = config.execute;
    }
    /**
     * Build Discord SlashCommandBuilder.
     * @hidden
     */
    public build(): DiscordSlashCommandBuilder {
        const builder = new DiscordSlashCommandBuilder().setName(this.commandName).setDescription(this.description);
        for (const key in this.subs) {
            this.subs[key].build(key, builder);
        }
        for (const key in this.groups) {
            this.groups[key].build(key, builder);
        }
        return builder;
    }
    /**
     * Thực thi slash command khi interaction được gọi.
     * @hidden
     */
    public async execute(client: Client, interaction: ChatInputCommandInteraction) {
        // permission
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
        // cooldown
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
                ephemeral: true,
            });
        }
        // SubcommandGroup
        const groupName = interaction.options.getSubcommandGroup(false);
        if (groupName) {
            const subName = interaction.options.getSubcommand(true);
            const subBuilder = this.groups[groupName as keyof typeof this.groups].subcommands[subName as any];
            const parsed = subBuilder.parse(interaction);
            return this.handler(client, interaction, {
                type: "group",
                group: groupName,
                sub: subName,
                options: parsed,
            } as any);
        }
        // Subcommand
        const subName = interaction.options.getSubcommand(true);
        if(subName) {
            const subBuilder = this.subs[subName as keyof typeof this.subs];
            const parsed = subBuilder.parse(interaction);
            return this.handler(client, interaction, {
                type: "sub",
                sub: subName,
                options: parsed,
            } as any);
        }
    }
}
