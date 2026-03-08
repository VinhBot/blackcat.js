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

/* ================= TYPES ================= */

type ButtonStyleKey = | "Primary" | "Secondary" | "Success" | "Danger" | "Link";

type ButtonOption<ID extends string = string> = {
    customId: ID;
    style: ButtonStyleKey;
    label?: string;
    emoji?: string | APIMessageComponentEmoji;
    url?: string;
    disabled?: boolean;
};

type SelectOption = {
    label: string;
    value: string;
    description?: string;
    emoji?: string | APIMessageComponentEmoji;
    default?: boolean;
};

type SelectMenuOption<ID extends string = string> = {
    customId: ID;
    placeholder?: string;
    minValues?: number;
    maxValues?: number;
    disabled?: boolean;
    options: SelectOption[];
};

type Schema = | {
    type: "button";
    options: readonly ButtonOption[];
} | {
    type: "select";
    options: SelectMenuOption;
};

type ExtractCustomIds<T extends readonly Schema[]> = T[number] extends { options: infer O } ? O extends readonly any[] ? O[number] extends { customId: infer A } ? A : never : O extends { customId: infer A } ? A : never : never;

type CollectorOptions<IdUnion extends string> = {
    source: Message | ChatInputCommandInteraction;
    time?: number;
    userId?: string;
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
export class ComponentBuilder<T extends readonly Schema[], IdUnion extends string = ExtractCustomIds<T>> {
    private rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
    private validIds = new Set<string>();
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
    /* ================= BUTTONS ================= */
    private buildButtons(options: readonly ButtonOption[]) {
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
    /* ================= SELECT ================= */
    private buildSelect(data: SelectMenuOption) {
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
    public async createCollector(options: CollectorOptions<IdUnion>): Promise<InteractionCollector<ButtonInteraction | StringSelectMenuInteraction>> {
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
            time: options.time ?? 60000,
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