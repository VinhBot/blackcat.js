import { Message, InteractionCollector, ChatInputCommandInteraction, InteractionReplyOptions, MessageEditOptions } from "discord.js";
import type { MessageComponentType, ButtonInteraction, ChannelSelectMenuInteraction, MentionableSelectMenuInteraction, RoleSelectMenuInteraction, StringSelectMenuInteraction, UserSelectMenuInteraction } from "discord.js";

import { parseTime } from ".";
/**
 * @hidden
 */
type CollectorTarget = Message | ChatInputCommandInteraction;
/**
 * @hidden
 */
export type CollectorInteraction = | ButtonInteraction | StringSelectMenuInteraction | UserSelectMenuInteraction | RoleSelectMenuInteraction | MentionableSelectMenuInteraction | ChannelSelectMenuInteraction;

/**
 * Cấu hình cho `createComponentCollector`.
 * @public
 */
export interface CreateMessageComponentCollector {
    /**
     * Thời gian tồn tại tối đa của collector (seconds).
     *
     * Khi hết thời gian, collector sẽ tự động stop với reason `"time"`.
     */
    time?: number;
    /**
     * Thời gian tối đa không có interaction nào trước khi collector stop.
     *
     * Nếu không có interaction trong khoảng thời gian này
     * collector sẽ stop với reason `"idle"`.
     */
    idle?: number;
    /**
     * Số interaction tối đa collector có thể nhận.
     *
     * Khi đạt giới hạn này collector sẽ stop.
     */
    max?: number;
    /**
     * Số user khác nhau tối đa có thể interact.
     */
    maxUsers?: number;
    /**
     * Giới hạn loại component collector nhận.
     *
     * Ví dụ:
     * - `ComponentType.Button`
     * - `ComponentType.StringSelect`
     */
    componentType?: MessageComponentType;
    /**
     * Hàm lọc interaction trước khi collector nhận.
     *
     * Nếu trả về `false` interaction sẽ bị bỏ qua.
     */
    filter?: (i: CollectorInteraction) => boolean;
    /**
     * Callback được gọi mỗi khi collector nhận interaction.
     *
     * @param ctx - Context chứa thông tin interaction và collector.
     */
    onCollector: (ctx: {
        /**
         * Interaction gốc từ Discord.
         */
        interaction: CollectorInteraction;
        /**
         * Custom ID của component.
         */
        customId: string;
        /**
         * ID của user đã thực hiện interaction.
         */
        userId: string;
        /**
         * Giá trị được chọn (chỉ tồn tại với Select Menu).
         */
        values?: string[];
        /**
         * Message chứa component.
         */
        message: Message;
        /**
         * Hàm dừng collector thủ công.
         */
        stop: () => void;
        /**
         * Collector instance gốc của discord.js.
         */
        collector: InteractionCollector<CollectorInteraction>;
    }) => any | Promise<any>;
    /**
     * Callback được gọi khi collector kết thúc.
     *
     * @param ctx - Context chứa thông tin kết thúc collector.
     */
    onEnd?: (ctx: {
        /**
         * Message chứa component collector.
         */
        message: Message;
        /**
         * Lý do collector dừng.
         *
         * Ví dụ:
         * - `"time"`
         * - `"idle"`
         * - `"limit"`
         * - `"user"`
         * - `"manual"`
         */
        reason: string;
        /**
         * Tổng số interaction collector đã nhận.
         */
        total: number;
        /**
         * Helper để chỉnh sửa message gốc.
         */
        edit: (options: MessageEditOptions | InteractionReplyOptions) => Promise<any>;
    }) => any | Promise<any>;
}

/**
 * Tạo `MessageComponentCollector` với context đơn giản hóa.
 * @public
 * Hỗ trợ:
 * - Button
 * - Select Menu
 * - Các Message Component khác của Discord
 *
 * Collector sẽ tự động:
 * - Lấy message từ `Message` hoặc `ChatInputCommandInteraction`
 * - Map interaction thành context (`ctx`)
 * - Gọi `onCollector` khi có interaction
 * - Gọi `onEnd` khi collector kết thúc
 *
 * @param target Message hoặc Slash Command Interaction chứa component
 * @param options Cấu hình collector
 *
 * @returns InteractionCollector<MessageComponentInteraction>
 *
 * @example
 * ```ts
 * const msg = await message.reply({
 *   content: "Test collector",
 *   components: [row]
 * });
 *
 * await functions.createComponentCollector(msg | interaction, {
 *   componentType: ComponentType.Button, // Giới hạn loại component
 *   time: "5s", // Thời gian collector tồn tại (ms)
 *   idle: "5s", // Thời gian tối đa không có interaction
 *   max: 5, // Số interaction tối đa
 *   maxUsers: 1, // Giới hạn số user khác nhau
 *   filter: (i) => i.user.id === message.author.id,
 *   onCollector: async (ctx) => {
 *       // logic code
 *   }
 * });
 * ```
 *
 * @example
 * Ví dụ Select Menu
 * ```ts
 * await functions.createComponentCollector(msg | interaction, {
 *   componentType: ComponentType.StringSelect,
 *   time: 10000,
 *   onCollector: async (ctx) => {
 *     // logic code
 *   }
 * });
 * ```
 */
export const createMessageComponentCollector = async (target: CollectorTarget, options: CreateMessageComponentCollector) => {
    const message = target instanceof Message ? target : await target.fetchReply();
    const time = parseTime(options.time ?? "10s");
    const idle = options.idle ? parseTime(options.idle) : undefined;
    const collector = message.createMessageComponentCollector({
        componentType: options.componentType,
        filter: options.filter,
        max: options.max,
        maxUsers: options.maxUsers,
        time: time,
        idle: idle
    });
    
    collector.on("collect", async (interaction) => {
        if (!options.onCollector) return;
        await options.onCollector({
            interaction,
            customId: interaction.customId,
            userId: interaction.user.id,
            values: "values" in interaction ? interaction.values : undefined,
            message: message,
            collector: collector,
            stop: () => collector.stop(),
        });
    });

    collector.on("end", async (collected, reason) => {
        if (!options.onEnd) return;
        await options.onEnd({
            message,
            reason,
            total: collected.size,
            edit: (editOptions: MessageEditOptions | InteractionReplyOptions) => message.edit(editOptions as MessageEditOptions)
        });
    });
    return collector;
};