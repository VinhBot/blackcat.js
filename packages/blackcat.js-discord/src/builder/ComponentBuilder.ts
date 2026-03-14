import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    UserSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    MentionableSelectMenuBuilder,
    APIActionRowComponent,
    APISelectMenuOption,
    ChannelType,
    Message,
    ChatInputCommandInteraction,
    InteractionCollector,
} from "discord.js";
import { CollectorInteraction, CreateMessageComponentCollector, createMessageComponentCollector, parseTime } from "../Functions";

/**
 * Union type đại diện cho tất cả component builder có thể được sử dụng
 * trong ActionRow của Discord.
 * @hidden
 */
type AnyComponent = | ButtonBuilder | StringSelectMenuBuilder | RoleSelectMenuBuilder | UserSelectMenuBuilder | ChannelSelectMenuBuilder | MentionableSelectMenuBuilder;

/**
 * Cấu hình đầu vào cho một button.
 */
type ButtonInput = {
    /** Custom ID của button (không dùng khi là link button) */
    customId: string;
    /** Text hiển thị trên button */
    label: string;
    /** Emoji hiển thị trên button */
    emoji?: string;
    /** Kiểu button */
    style: "Primary" | "Secondary" | "Success" | "Danger" | "Link" | "Premium";
    /** URL cho Link Button */
    url?: string;
    /** Button có bị disable hay không */
    disabled?: boolean;
};

/**
 * Input cấu hình component để tự động build ActionRow.
 */
type ComponentInput = | {
    /** Button row */
    type: "button";
    options: ButtonInput[];
} | {
    /** String select menu */
    type: "stringmenu";
    options: {
        customId: string;
        placeholder?: string;
        minValues?: number;
        maxValues?: number;
        options: APISelectMenuOption[];
    };
} | {
    /** Role select menu */
    type: "rolemenu";
    options: {
        customId: string;
        placeholder?: string;
        minValues?: number;
        maxValues?: number;
    };
} | {
    /** User select menu */
    type: "usermenu";
    options: {
        customId: string;
        placeholder?: string;
        minValues?: number;
        maxValues?: number;
    };
} | {
    /** Channel select menu */
    type: "channelmenu";
    options: {
        customId: string;
        placeholder?: string;
        minValues?: number;
        maxValues?: number;
        channelTypes?: ChannelType[];
    };
} | {
    /** Mentionable select menu (role + user) */
    type: "mentionmenu";
    options: {
        customId: string;
        placeholder?: string;
        minValues?: number;
        maxValues?: number;
    };
};
/**
 * Builder hỗ trợ tạo và quản lý Discord Message Components
 * (Buttons, Select Menus...) thông qua `ActionRowBuilder`.
 *
 * Class này giúp bạn:
 * - Tạo component từ cấu hình JSON
 * - Quản lý nhiều ActionRow
 * - Disable toàn bộ components
 * - Tạo collector cho component interaction
 *
 * @template T Loại component builder
 *
 * @remarks
 * Discord giới hạn:
 * - **Tối đa 5 ActionRow trong một message**
 * - **Mỗi ActionRow tối đa 5 buttons**
 * - **Select menu mỗi row chỉ được 1**
 *
 * Class này tự động chia button thành nhiều row khi > 5.
 *
 * ---
 *
 * @example
 * ### Tạo button đơn giản
 *
 * ```ts
 * const builder = new ComponentBuilder([
 *   {
 *     type: "button",
 *     options: [
 *       {
 *         customId: "confirm",
 *         label: "Confirm",
 *         style: "Success"
 *       },
 *       {
 *         customId: "cancel",
 *         label: "Cancel",
 *         style: "Danger"
 *       }
 *     ]
 *   }
 * ]);
 *
 * await message.reply({
 *   content: "Bạn có chắc không?",
 *   components: builder.build()
 * });
 * ```
 *
 * ---
 *
 * @example
 * ### Tạo Select Menu
 *
 * ```ts
 * const builder = new ComponentBuilder([
 *   {
 *     type: "stringmenu",
 *     options: {
 *       customId: "choose-color",
 *       placeholder: "Chọn màu",
 *       options: [
 *         { label: "Red", value: "red" },
 *         { label: "Blue", value: "blue" }
 *       ]
 *     }
 *   }
 * ]);
 * ```
 *
 * ---
 *
 * @example
 * ### Tạo Interaction Collector
 *
 * ```ts
 * const collector = await builder.createCollector({
 *   source: message,
 *   time: "30s",
 *   onCollector: async (ctx) => {
 *     console.log(ctx.interaction.customId);
 *   }
 * });
 * ```
 *
 * ---
 *
 * @example
 * ### Disable toàn bộ components
 *
 * ```ts
 * builder.disableAll();
 *
 * await message.edit({
 *   components: builder.build()
 * });
 * ```
 */
export class ComponentBuilder<T extends AnyComponent = AnyComponent> {
    /** 
     * Danh sách ActionRow đã được build
     * @hidden 
     * */
    private rows: ActionRowBuilder<T>[] = [];
    /**
     * Tạo ComponentBuilder
     *
     * @param components Danh sách cấu hình component
     */
    constructor(components?: ComponentInput[]) {
        if (components) this.parse(components);
    }
    /**
     * Parse cấu hình component thành ActionRowBuilder.
     *
     * @param components Danh sách component input
     */
    private parse(components: ComponentInput[]) {
        for (const comp of components) {
            if (comp.type === "button") {
                let row = new ActionRowBuilder<ButtonBuilder>();
                comp.options.forEach((btn, index) => {
                    // nếu đủ 5 button thì push row và tạo row mới
                    if (index !== 0 && index % 5 === 0) {
                        this.rows.push(row as any);
                        row = new ActionRowBuilder<ButtonBuilder>();
                    }
                    const button = new ButtonBuilder();
                    if (btn.url) {
                        button.setStyle(ButtonStyle.Link).setURL(btn.url);
                    } else {
                        button.setCustomId(btn.customId).setStyle(btn.style as any);
                    }
                    if (btn.label) button.setLabel(btn.label);
                    if (btn.emoji) button.setEmoji(btn.emoji);
                    if (btn.disabled) button.setDisabled(true);
                    row.addComponents(button);
                });
                if (row.components.length) {
                    this.rows.push(row as any);
                }
            } else {
                const row = new ActionRowBuilder<any>();
                if (comp.type === "stringmenu") {
                    const menu = new StringSelectMenuBuilder().setCustomId(comp.options.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues) menu.setMaxValues(comp.options.maxValues)
                    if (comp.options.options) menu.addOptions(comp.options.options);
                    row.addComponents(menu);
                } else if (comp.type === "rolemenu") {
                    const menu = new RoleSelectMenuBuilder().setCustomId(comp.options.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues) menu.setMaxValues(comp.options.maxValues);
                    row.addComponents(menu);
                } else if (comp.type === "usermenu") {
                    const menu = new UserSelectMenuBuilder().setCustomId(comp.options.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues) menu.setMaxValues(comp.options.maxValues);
                    row.addComponents(menu);
                } else if (comp.type === "channelmenu") {
                    const menu = new ChannelSelectMenuBuilder().setCustomId(comp.options.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues) menu.setMaxValues(comp.options.maxValues);
                    if (comp.options.channelTypes) menu.setChannelTypes(comp.options.channelTypes);
                    row.addComponents(menu);
                } else if (comp.type === "mentionmenu") {
                    const opt = comp.options;
                    const menu = new MentionableSelectMenuBuilder().setCustomId(opt.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues) menu.setMaxValues(comp.options.maxValues);
                    row.addComponents(menu);
                }
                this.rows.push(row);
            }
        }
    }
    /**
     * Thêm một ActionRow mới vào builder.
     *
     * Phương thức này cho phép thêm trực tiếp các component builder
     * (ButtonBuilder, SelectMenuBuilder, ...) vào một ActionRow mới.
     *
     * @param components Danh sách component cần thêm vào row
     * @returns ComponentBuilder instance để tiếp tục chain
     *
     * @example
     * ### Thêm một row chứa button
     * ```ts
     * const builder = new ComponentBuilder();
     *
     * builder.addRow(
     *   new ButtonBuilder()
     *     .setCustomId("confirm")
     *     .setLabel("Confirm")
     *     .setStyle(ButtonStyle.Success),
     *
     *   new ButtonBuilder()
     *     .setCustomId("cancel")
     *     .setLabel("Cancel")
     *     .setStyle(ButtonStyle.Danger)
     * );
     *
     * await message.reply({
     *   content: "Bạn có chắc không?",
     *   components: builder.build()
     * });
     * ```
     *
     * @example
     * ### Chain nhiều row
     * ```ts
     * builder
     *   .addRow(button1, button2)
     *   .addRow(button3)
     *   .addRow(selectMenu);
     * ```
     */
    public addRow(...components: T[]) {
        const row = new ActionRowBuilder<T>().addComponents(...components);
        this.rows.push(row);
        return this;
    }
    /**
     * Thay thế một ActionRow đã tồn tại.
     *
     * Hữu ích khi bạn muốn chỉnh sửa layout component
     * sau khi đã build trước đó.
     *
     * @param index Vị trí row cần thay
     * @param row ActionRowBuilder mới
     * @returns ComponentBuilder instance
     *
     * @example
     * ```ts
     * const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
     *   new ButtonBuilder()
     *     .setCustomId("retry")
     *     .setLabel("Retry")
     *     .setStyle(ButtonStyle.Primary)
     * );
     *
     * builder.replace(0, newRow);
     *
     * await message.edit({
     *   components: builder.build()
     * });
     * ```
     */
    public replace(index: number, row: ActionRowBuilder<T>) {
        this.rows[index] = row;
        return this;
    }
    /**
     * Disable toàn bộ components trong builder.
     *
     * Phương thức này sẽ gọi `setDisabled(true)` cho mọi component
     * có hỗ trợ thuộc tính `setDisabled`.
     *
     * Thường được sử dụng khi collector kết thúc để tránh user tiếp tục bấm button cũ.
     *
     * @returns ComponentBuilder instance
     *
     * @example
     * ```ts
     * collector.on("end", async () => {
     *   builder.disableAll();
     *
     *   await message.edit({
     *     components: builder.build()
     *   });
     * });
     * ```
     */
    public disableAll() {
        for (const row of this.rows) {
            for (const comp of row.components) {
                if ("setDisabled" in comp) {
                    comp.setDisabled(true);
                }
            }
        }
        return this;
    }
    /**
     * Build danh sách ActionRowBuilder để gửi vào message Discord.
     *
     * @returns Danh sách ActionRowBuilder
     *
     * @example
     * ```ts
     * const builder = new ComponentBuilder([
     *   {
     *     type: "button",
     *     options: [
     *       {
     *         customId: "ping",
     *         label: "Ping",
     *         style: "Primary"
     *       }
     *     ]
     *   }
     * ]);
     *
     * await message.reply({
     *   content: "Test button",
     *   components: builder.build()
     * });
     * ```
     */
    public build(): ActionRowBuilder<T>[] {
        return this.rows;
    }
    /**
     * Tạo Message Component Collector từ message hoặc interaction.
     *
     * Collector giúp lắng nghe interaction từ button hoặc select menu.
     *
     * @param options Collector options
     * @returns InteractionCollector
     *
     * @example
     * ```ts
     * const collector = await builder.createCollector({
     *   source: message,
     *   time: "30s",
     *
     *   onCollector: async (ctx) => {
     *     const interaction = ctx.interaction;
     *
     *     if (interaction.customId === "confirm") {
     *       await interaction.reply("Đã xác nhận!");
     *     }
     *   },
     *
     *   onEnd: async () => {
     *     builder.disableAll();
     *
     *     await message.edit({
     *       components: builder.build()
     *     });
     *   }
     * });
     * ```
     */
    public async createCollector(options: CreateMessageComponentCollector & { source: Message | ChatInputCommandInteraction }): Promise<InteractionCollector<CollectorInteraction>> {
        const { source, time, idle, ...rest } = options;
        const collector = await createMessageComponentCollector(source, {
            time: parseTime(time ?? "20s"),
            idle: idle ? parseTime(idle) : undefined,
            ...rest,
            onCollector: async (ctx) => {
                return options.onCollector(ctx);
            },
            onEnd: (ctx) => {
                if (!options.onEnd) return;
                return options.onEnd(ctx);
            }
        });
        return collector;
    }
    /**
     * Convert toàn bộ ActionRowBuilder sang JSON Discord API format.
     *
     * Phương thức này hữu ích khi:
     * - Debug
     * - Serialize component
     * - Gửi qua REST API
     *
     * @returns APIActionRowComponent[]
     *
     * @example
     * ```ts
     * const json = builder.toJSON();
     *
     * console.log(json);
     * ```
     */
    public toJSON(): APIActionRowComponent<ReturnType<T["toJSON"]>>[] {
        return this.rows.map((r) => r.toJSON());
    }
}