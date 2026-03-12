import {
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ButtonStyle,
    type APIMessageComponentEmoji,
    Message,
    type ChatInputCommandInteraction,
    type ButtonInteraction,
    type StringSelectMenuInteraction,
    type InteractionCollector,
    MessageFlags
} from "discord.js";

import { parseTime } from "..";

/**
 * Cấu hình cho một Button component.
 *
 * @template ID customId của button
 */
export type ComponentButtonOption<ID extends string = string> = {
    /**
     * ID dùng để nhận diện interaction.
     */
    customId: ID;
    /**
     * Style của button.
     */
    style: | "Primary" | "Secondary" | "Success" | "Danger" | "Link";
    /**
     * Nội dung hiển thị trên button.
     */
    label?: string;
    /**
     * Emoji của button.
     */
    emoji?: string | APIMessageComponentEmoji;
    /**
     * URL cho Link Button.
     */
    url?: string;
    /**
     * Trạng thái disabled.
     */
    disabled?: boolean;
};

/**
 * Một option trong Select Menu.
 */
export type ComponentSelectOption = {
    /**
     * Label hiển thị.
     */
    label: string;
    /**
     * Value trả về khi được chọn.
     */
    value: string;
    /**
     * Mô tả option.
     */
    description?: string;
    /**
     * Emoji của option.
     */
    emoji?: string | APIMessageComponentEmoji;
    /**
     * Option mặc định được chọn.
     */
    default?: boolean;
};

/**
 * Cấu hình cho Select Menu component.
 *
 * @template ID customId của menu
 */
export type ComponentSelectMenuOption<ID extends string = string> = {
    /**
     * ID dùng để nhận diện interaction.
     */
    customId: ID;
    /**
     * Placeholder text.
     */
    placeholder?: string;
    /**
     * Số lượng option tối thiểu có thể chọn.
     */
    minValues?: number;
    /**
     * Số lượng option tối đa có thể chọn.
     */
    maxValues?: number;
    /**
     * Trạng thái disabled.
     */
    disabled?: boolean;
    /**
     * Danh sách options.
     */
    options: ComponentSelectOption[];
};

/**
 * Schema định nghĩa các component.
 * @hidden
 */
export type ComponentSchema = | {
    type: "button";
    options: readonly ComponentButtonOption[];
} | {
    type: "select";
    options: ComponentSelectMenuOption;
};

/**
 * Utility type dùng để trích xuất tất cả `customId` từ schema và tạo thành union type.
 * @hidden
 */
export type ComponentExtractCustomIds<T extends readonly ComponentSchema[]> = T[number] extends { options: infer O } ? O extends readonly any[] ? O[number] extends { customId: infer A } ? A : never : O extends { customId: infer A } ? A : never : never;

/**
 * Options cấu hình cho collector.
 *
 * @template IdUnion union type của customId
 */
export type ComponentCollectorOptions<IdUnion extends string> = {
    /**
     * Nguồn tạo collector.
     *
     * Có thể là:
     * - Message
     * - Slash Command Interaction
     */
    source: Message | ChatInputCommandInteraction;
    /**
     * Thời gian collector hoạt động (giây).
     *
     * @default 60
     */
    time?: number;
    /**
     * Chỉ cho phép user cụ thể tương tác.
     */
    userId?: string;
    /**
     * Callback khi interaction được collect.
     */
    onCollect: (interaction: ButtonInteraction | StringSelectMenuInteraction, customId: IdUnion) => any;
};

/**
 * Builder tiện ích để tạo **Discord Message Components**
 * (Button và Select Menu) với **TypeScript type inference mạnh**
 * và hệ thống **collector tích hợp sẵn**.
 *
 * Class này tự động:
 * - Tạo `ActionRowBuilder`
 * - Tự chia tối đa **5 button mỗi row**
 * - Hỗ trợ cả **Prefix Command (Message)** và **Slash Command (Interaction)**
 * - Tự suy ra union type của tất cả `customId`
 * - Cung cấp helper `createCollector()` để xử lý interaction
 *
 * @template T Schema định nghĩa components
 * @template IdUnion Union type của tất cả `customId` (tự động suy ra)
 *
 * @example
 * ```ts
 * import { ComponentBuilder } from "blackcat.js-discord";
 *
 * const components = new ComponentBuilder([
 *   {
 *     type: "button",
 *     options: [
 *       { customId: "accept", label: "Chấp nhận", style: "Success" },
 *       { customId: "decline", label: "Từ chối", style: "Danger" }
 *     ]
 *   },
 *   {
 *     type: "select",
 *     options: {
 *       customId: "color",
 *       placeholder: "Chọn màu",
 *       options: [
 *         { label: "Đỏ", value: "red" },
 *         { label: "Xanh", value: "blue" }
 *       ]
 *     }
 *   }
 * ] as const);
 *
 * const msg = await message.reply({
 *   content: "Hãy chọn một tùy chọn",
 *   components: components.components()
 * });
 *
 * components.createCollector({
 *   source: msg,
 *   userId: message.author.id,
 *   onCollect: async (interaction, id) => {
 *     // id sẽ được TypeScript suy ra:
 *     // "accept" | "decline" | "color"
 *     if (interaction.isButton()) {
 *       if (id === "accept") {
 *         await interaction.reply("Bạn đã chấp nhận");
 *       }
 *       if (id === "decline") {
 *         await interaction.reply("Bạn đã từ chối");
 *       }
 *     }
 *     if (interaction.isStringSelectMenu()) {
 *       if (id === "choose_color") {
 *         await i.reply({
 *           content: `Bạn chọn: ${i.values[0]}`,
 *           ephemeral: true
 *         });
 *       }
 *     }
 *   }
 * });
 * 
 * // ===== Slash Command (Interaction) =====
 *
 * await interaction.reply({
 *   content: "Hãy chọn một tùy chọn",
 *   components: components.components()
 * });
 *
 * await components.createCollector({
 *   source: interaction,
 *   userId: interaction.user.id,
 *   time: 60000,
 *   onCollect: async (i, id) => {
 *     if (i.isButton()) {
 *       if (id === "accept") await i.reply({ content: "Bạn đã chấp nhận", ephemeral: true });
 *       if (id === "decline") await i.reply({ content: "Bạn đã từ chối", ephemeral: true });
 *     }
 *     if (i.isStringSelectMenu()) {
 *       if (id === "choose_color") {
 *         await i.reply({
 *           content: `Bạn chọn: ${i.values[0]}`,
 *           ephemeral: true
 *         });
 *       }
 *     }
 *
 *   }
 * });
 * ```
 * @remarks
 * Giới hạn của Discord:
 * - Tối đa **5 component rows**
 * - Mỗi row tối đa **5 buttons**
 * - **Select menu chỉ có 1 trên mỗi row**
 *
 * `ComponentBuilder` đảm bảo layout luôn hợp lệ với các giới hạn này.
 */
export class ComponentBuilder<T extends readonly ComponentSchema[], IdUnion extends string = ComponentExtractCustomIds<T>> {
    /**
     * Danh sách rows đã build.
     */
    private rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
    /**
     * Tập hợp tất cả customId hợp lệ.
     */
    private validIds = new Set<string>();
    /**
     * Khởi tạo ComponentBuilder.
     *
     * @param schema Schema định nghĩa components
     */
    constructor(private schema: T) {
        for (const component of this.schema) {
            if (component.type === "button") {
                component.options.forEach(b => this.validIds.add(b.customId));
                this.buildButtons(component.options);
            }
            if (component.type === "select") {
                this.validIds.add(component.options.customId);
                this.buildSelect(component.options);
            }
        }
        if (this.rows.length > 5) {
            throw new Error("Discord chỉ cho phép tối đa 5 hàng.");
        }
    }
    /**
     * Build button components.
     *
     * Tự động chia tối đa **5 buttons mỗi row**.
     */
    private buildButtons(options: readonly ComponentButtonOption[]) {
        for (let i = 0; i < options.length; i += 5) {
            const row = new ActionRowBuilder<ButtonBuilder>();
            for (let j = i; j < i + 5 && j < options.length; j++) {
                const btn = options[j];
                const button = new ButtonBuilder();
                if (btn.style === "Link") {
                    if (!btn.url) {
                        throw new Error("Nút liên kết yêu cầu URL");
                    }
                    button.setStyle(ButtonStyle.Link).setURL(btn.url);
                } else {
                    button.setStyle(ButtonStyle[btn.style]).setCustomId(btn.customId);
                }
                if (btn.label) button.setLabel(btn.label);
                if (btn.emoji) button.setEmoji(btn.emoji);
                if (btn.disabled) button.setDisabled(true);
                row.addComponents(button);
            }
            this.rows.push(row);
        }
    }
    /**
     * Build select menu component.
     */
    private buildSelect(data: ComponentSelectMenuOption) {
        const row = new ActionRowBuilder<StringSelectMenuBuilder>();
        const menu = new StringSelectMenuBuilder().setCustomId(data.customId).setOptions(data.options);
        if (data.placeholder) {
            menu.setPlaceholder(data.placeholder);
        }
        if (data.minValues !== undefined) {
            menu.setMinValues(data.minValues);
        }
        if (data.maxValues !== undefined) {
            menu.setMaxValues(data.maxValues);
        }
        if (data.disabled) {
            menu.setDisabled(true);
        }
        row.addComponents(menu);
        this.rows.push(row);
    }
    /**
     * Trả về danh sách component rows đã được build.
     *
     * @returns Mảng `ActionRowBuilder` chứa Button hoặc Select Menu
     *
     * @example
     * await message.reply({
     *   content: "Chọn một tùy chọn",
     *   components: components.components()
     * });
     */
    public components(): readonly ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
        return [...this.rows];
    }
    /**
     * Tạo `InteractionCollector` cho components hiện tại.
     *
     * Hỗ trợ nguồn từ:
     * - `Message` (prefix command)
     * - `ChatInputCommandInteraction` (slash command)
     *
     * @param options Cấu hình collector
     * @returns `InteractionCollector`
     *
     * @example
     * components.createCollector({
     *   source: message,
     *   userId: message.author.id,
     *   time: 60000,
     *   onCollect: (interaction, id) => {
     *     if (id === "accept") {
     *       interaction.reply("Đã chấp nhận");
     *     }
     *   }
     * });
     */
    public async createCollector(options: ComponentCollectorOptions<IdUnion>): Promise<InteractionCollector<ButtonInteraction | StringSelectMenuInteraction>> {
        let message: Message;
        if (options.source instanceof Message) {
            message = options.source;
        } else {
            if (options.source.replied || options.source.deferred) {
                message = await options.source.fetchReply() as Message;
            } else {
                const response = await options.source.reply({
                    flags: MessageFlags.Ephemeral,
                    withResponse: true
                });
                message = response.resource?.message!;
            }
        }
        const collector = message.createMessageComponentCollector({
            time: parseTime(options.time ?? "60s") as number,
            filter: (interaction) => {
                if (!interaction.isButton() && !interaction.isStringSelectMenu()) return false;
                if (options.userId && interaction.user.id !== options.userId) return false;
                if (!this.validIds.has(interaction.customId)) return false;
                return true;
            },
            ...options,
        });
        collector.on("collect", (interaction) => {
            const id = interaction.customId as IdUnion;
            options.onCollect(interaction as any, id);
        });
        return collector as any;
    }

}