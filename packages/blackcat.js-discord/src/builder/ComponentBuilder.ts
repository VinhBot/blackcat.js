import type {
    APIActionRowComponent,
    APISelectMenuOption,
    ChannelType,
    ChatInputCommandInteraction,
    InteractionCollector,
    MessageCollectorOptionsParams,
    MessageEditOptions,
    InteractionReplyOptions,
    MessageComponentType,
    MappedInteractionTypes,
} from "discord.js";

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    RoleSelectMenuBuilder,
    UserSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    MentionableSelectMenuBuilder, 
    Message
} from "discord.js";

/**
 * Union type đại diện cho tất cả component builder có thể được sử dụng
 * trong ActionRow của Discord.
 * @hidden
 */
export type AnyComponent = | ButtonBuilder | StringSelectMenuBuilder | RoleSelectMenuBuilder | UserSelectMenuBuilder | ChannelSelectMenuBuilder | MentionableSelectMenuBuilder;

/**
 * Resolve kiểu `Interaction` tương ứng với loại `MessageComponentType`.
 * @hidden
 */
type ResolveInteraction<CT extends MessageComponentType, IG extends boolean> = CT extends keyof MappedInteractionTypes<IG> ? MappedInteractionTypes<IG>[CT] : never;
/**
 * Tùy chọn cấu hình để tạo một Message Component Collector.
 *
 * @typeParam ComponentType - Loại component (`MessageComponentType`) mà collector sẽ lắng nghe
 * @typeParam InGuild - Xác định collector ở trong guild (`true`) hay DM (`false`). Mặc định là `boolean`.
 *
 * @remarks
 * Interface này mở rộng từ {@link MessageCollectorOptionsParams}, đồng thời bổ sung:
 * - Nguồn collector (`source`) có thể là `Message` hoặc `ChatInputCommandInteraction`
 * - Callback `onCollector` được gọi mỗi khi collector nhận interaction
 * - Callback `onEnd` được gọi khi collector kết thúc
 *
 * Đây là type chuẩn để đảm bảo type-safe cho các interaction collector
 * trong hệ thống builder của framework.
 *
 * ---
 *
 * @example
 * ```ts
 * const collector = await builder.createCollector({
 *   source: message,
 *   time: 60000,
 *   onCollector: async (ctx) => {
 *     console.log(ctx.customId, ctx.userId);
 *     if (ctx.customId === "confirm") ctx.stop();
 *   },
 *   onEnd: (ctx) => {
 *     console.log(`Collector kết thúc sau ${ctx.total} interactions`);
 *   }
 * });
 * ```
 *
 * @see MessageCollectorOptionsParams
 */
export interface CreateMessageComponentCollector<ComponentType extends MessageComponentType, InGuild extends boolean = boolean> extends MessageCollectorOptionsParams<ComponentType, InGuild> {
    source: Message | ChatInputCommandInteraction
    /**
     * Được gọi khi `onCollector`/`onEnd` ném lỗi. Nếu bỏ trống, lỗi được ghi ra `console.error`
     * (thay vì gây `unhandledRejection` làm sập tiến trình).
     */
    onError?: (error: unknown) => any;
    /**
     * Callback được gọi mỗi khi collector nhận interaction.
     *
     * @param ctx - Context chứa thông tin interaction và collector.
     */
    onCollector: (ctx: {
        /**
         * Interaction gốc từ Discord.
         */
        interaction: ResolveInteraction<ComponentType, InGuild>;
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
        collector: InteractionCollector<ResolveInteraction<ComponentType, InGuild>>;
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
 * Cấu hình đầu vào cho Button trong ComponentBuilder
 * 
 * Có 2 nhóm button:
 * 
 * ### 1. Link Button (`style = "Link"`)
 * - Bắt buộc có `url`
 * - Không có `customId`
 * - Không trigger interaction (chỉ redirect)
 * 
 * ### 2. Interactive Button
 * - Bao gồm các style:
 *   - `"Primary"`, `"Secondary"`, `"Success"`, `"Danger"`, `"Premium"`
 * - Bắt buộc có `customId`
 * - Dùng để xử lý interaction khi user click
 * 
 * ⚠️ Lưu ý:
 * - Discord không cho phép button vừa có `url` vừa có `customId`
 * - `label` tối đa ~80 ký tự
 * - `emoji` có thể dùng unicode hoặc custom emoji
 * 
 * @example
 * ```ts
 * // Interactive button
 * const button: ButtonInput = {
 *   style: "Primary",
 *   customId: "confirm",
 *   label: "Xác nhận"
 * };
 * ```
 * 
 * @example
 * ```ts
 * // Link button
 * const linkButton: ButtonInput = {
 *   style: "Link",
 *   label: "Google",
 *   url: "https://google.com"
 * };
 * ```
 * 
 * @example
 * ```ts
 * const builder = new ComponentBuilder()
 *   .addButton([
 *     {
 *       style: "Success",
 *       customId: "ok",
 *       label: "OK"
 *     },
 *     {
 *       style: "Link",
 *       label: "Docs",
 *       url: "https://discord.js.org"
 *     }
 *   ]);
 * ```
 * 
 * @see ComponentBuilder
 */
export type ButtonInput = | {
    /**
     * Link Button (chuyển hướng URL)
     */
    style: "Link";
    /**
     * Nội dung hiển thị trên button
     */
    label: string;
    /**
     * URL sẽ được mở khi click
     * 
     * @remarks
     * Bắt buộc với Link Button
     */
    url: string;
    /**
     * Emoji hiển thị trên button
     */
    emoji?: string;
    /**
     * Trạng thái disable
     */
    disabled?: boolean;
} | {
    /**
     * Kiểu button tương tác
     */
    style: | "Primary" | "Secondary" | "Success" | "Danger";
    /**
     * Custom ID để xử lý interaction
     * 
     * @remarks
     * Bắt buộc với button tương tác
     */
    customId: string;
    /**
     * Nội dung hiển thị trên button
     */
    label: string;
    /**
     * Emoji hiển thị trên button
     */
    emoji?: string;
    /**
     * Trạng thái disable
     */
    disabled?: boolean;
} | {
    /**
     * Button Premium (mua SKU). Discord không cho phép `customId`, `label`, `emoji` với kiểu này.
     */
    style: "Premium";
    /** ID của SKU cần mua. */
    skuId: string;
    disabled?: boolean;
};

/**
 * Cấu hình cơ bản cho tất cả các loại Select Menu
 * 
 * @remarks
 * `BaseMenu` định nghĩa các thuộc tính chung được sử dụng bởi mọi loại select menu
 * trong hệ thống (`stringmenu`, `rolemenu`, `usermenu`, `channelmenu`, `mentionmenu`).
 * 
 * Type này giúp:
 * - Tránh lặp lại cấu hình giữa các loại menu
 * - Đảm bảo tính nhất quán khi build component
 * - Dễ dàng mở rộng trong tương lai
 * 
 * Các thuộc tính trong `BaseMenu` sẽ được áp dụng trực tiếp lên Discord Select Menu:
 * - `customId`: dùng để định danh interaction
 * - `placeholder`: hiển thị khi chưa có lựa chọn
 * - `minValues` / `maxValues`: giới hạn số lượng lựa chọn
 * 
 * ⚠️ Lưu ý:
 * - `customId` là bắt buộc và phải unique trong cùng một message
 * - `minValues` và `maxValues` phải tuân theo giới hạn của Discord (0–25)
 * - Nếu không cung cấp:
 *   - `minValues` mặc định là `1`
 *   - `maxValues` mặc định là `1`
 * 
 * @example
 * ```ts
 * const base: BaseMenu = {
 *   customId: "menu_1",
 *   placeholder: "Chọn một giá trị",
 *   minValues: 1,
 *   maxValues: 3
 * };
 * ```
 * 
 * @see SelectMenu
 */
export type BaseMenu = {
    /**
     * ID định danh của menu
     * 
     * @remarks
     * Được sử dụng để xác định interaction khi người dùng chọn giá trị.
     * Phải là duy nhất trong cùng một message.
     */
    customId: string;
    /**
     * Nội dung placeholder khi chưa chọn
     * 
     * @remarks
     * Hiển thị dưới dạng text mờ trong select menu.
     */
    placeholder?: string;
    /**
     * Số lượng lựa chọn tối thiểu
     * 
     * @remarks
     * - Giá trị nhỏ nhất là `0`
     * - Nếu không set, mặc định là `1`
     */
    minValues?: number;
    /**
     * Số lượng lựa chọn tối đa
     * 
     * @remarks
     * - Giá trị lớn nhất là `25`
     * - Nếu không set, mặc định là `1`
     */
    maxValues?: number;
};
/**
 * Định nghĩa cấu hình cho các loại Select Menu trong ComponentBuilder
 * 
 * @remarks
 * `SelectMenu` là union type đại diện cho tất cả các loại select menu
 * mà Discord hỗ trợ và builder có thể xử lý.
 * 
 * Bao gồm:
 * - String Select Menu (chọn từ danh sách option)
 * - Role Select Menu (chọn role)
 * - User Select Menu (chọn user)
 * - Channel Select Menu (chọn channel)
 * - Mentionable Select Menu (chọn user hoặc role)
 * 
 * Mỗi cấu hình `SelectMenu` sẽ được convert thành đúng 1 `ActionRowBuilder`
 * chứa select menu tương ứng.
 * 
 * Các thuộc tính chung:
 * - `customId`: định danh duy nhất để xử lý interaction
 * - `placeholder`: text hiển thị khi chưa chọn
 * - `minValues`: số lượng chọn tối thiểu
 * - `maxValues`: số lượng chọn tối đa
 * 
 * ⚠️ Lưu ý:
 * - `minValues` và `maxValues` phải nằm trong range hợp lệ của Discord (0–25)
 * - Nếu không set, Discord sẽ dùng default:
 *   - `minValues = 1`
 *   - `maxValues = 1`
 * 
 * @example
 * ```ts
 * const menu: SelectMenu = {
 *   type: "stringmenu",
 *   options: {
 *     customId: "menu_1",
 *     placeholder: "Chọn một giá trị",
 *     options: [
 *       { label: "A", value: "a" },
 *       { label: "B", value: "b" }
 *     ]
 *   }
 * };
 * ```
 * 
 * @example
 * // Dùng với ComponentBuilder
 * const builder = new ComponentBuilder()
 *   .addSelectMenu({
 *     type: "usermenu",
 *     options: {
 *       customId: "user_select",
 *       placeholder: "Chọn user"
 *     }
 *   });
 */
export type SelectMenu = | {
    /**
     * String Select Menu (chọn từ danh sách option)
     * 
     * @remarks
     * Đây là loại select menu duy nhất yêu cầu `options` (danh sách lựa chọn).
     */
    type: "stringmenu";
    options: BaseMenu & {
        /**
         * Danh sách option cho menu
         * 
         * @remarks
         * Bắt buộc với string menu
         */
        options: APISelectMenuOption[];
    };
} | {
    /**
     * Role Select Menu (chọn role)
     * 
     * @remarks
     * Cho phép người dùng chọn một hoặc nhiều role trong server.
     */
    type: "rolemenu";
    options: BaseMenu;
} | {
    /**
     * User Select Menu (chọn user)
     * 
     * @remarks
     * Cho phép chọn user trong server.
     */
    type: "usermenu";
    options: BaseMenu;
} | {
    /**
     * Channel Select Menu (chọn channel)
     * 
     * @remarks
     * Có thể filter theo loại channel thông qua `channelTypes`.
     */
    type: "channelmenu";
    options: BaseMenu & {
        /**
         * Danh sách loại channel được phép chọn
         * 
         * @example
         * ```ts
         * channelTypes: [ChannelType.GuildText]
         * ```
         */
        channelTypes?: ChannelType[];
    };
} | {
    /**
     * Mentionable Select Menu (user + role)
     * 
     * @remarks
     * Cho phép chọn cả user và role trong cùng một menu.
     */
    type: "mentionmenu";
    options: BaseMenu;
};
/**
 * Định nghĩa cấu hình đầu vào cho ComponentBuilder
 * 
 * @remarks
 * `ComponentInput` là union type đại diện cho tất cả các loại component
 * mà {@link ComponentBuilder} hỗ trợ.
 * 
 * Nó bao gồm:
 * - Button (dạng nhiều button trong một ActionRow)
 * - Các loại Select Menu (thông qua {@link SelectMenu})
 * 
 * Type này được sử dụng trong:
 * - Constructor của `ComponentBuilder`
 * - `addRow`
 * - `replace`
 * - Các method build component khác
 * 
 * Mỗi phần tử trong `ComponentInput[]` sẽ được convert thành một hoặc nhiều
 * `ActionRowBuilder` tương ứng.
 * 
 * ⚠️ Lưu ý:
 * - Với `type: "button"`:
 *   - Có thể chứa nhiều button
 *   - Tự động chia thành nhiều ActionRow (tối đa 5 button / row)
 * 
 * - Với `SelectMenu`:
 *   - Mỗi config tương ứng đúng 1 ActionRow
 * 
 * @example
 * ```ts
 * const components: ComponentInput[] = [
 *   {
 *     type: "button",
 *     options: [
 *       { customId: "a", label: "A", style: "Primary" },
 *       { customId: "b", label: "B", style: "Secondary" }
 *     ]
 *   },
 *   {
 *     type: "stringmenu",
 *     options: {
 *       customId: "menu",
 *       options: [
 *         { label: "Option 1", value: "1" }
 *       ]
 *     }
 *   }
 * ];
 * ```
 * 
 * @example
 * // Sử dụng với builder
 * const builder = new ComponentBuilder(components);
 * 
 * await message.reply({
 *   components: builder.build()
 * });
 */
export type ComponentInput = | {
    /**
     * Loại component: Button
     * 
     * @remarks
     * Đại diện cho một nhóm button sẽ được render trong cùng ActionRow.
     */
    type: "button";
    /**
     * Danh sách cấu hình button
     * 
     * @remarks
     * - Tối đa 5 button trên mỗi ActionRow
     * - Nếu vượt quá, builder sẽ tự động chia thành nhiều row
     */
    options: ButtonInput[];
} | SelectMenu;

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
     * Khởi tạo `ComponentBuilder` với cấu hình component ban đầu (tuỳ chọn).
     *
     * @param components - Danh sách cấu hình component (`ComponentInput[]`)
     *
     * @remarks
     * Constructor này cho phép bạn khởi tạo builder kèm dữ liệu ngay lập tức
     * mà không cần gọi thủ công các method như:
     * - {@link addRow}
     * - {@link addButton}
     * - {@link addSelectMenu}
     *
     * Nếu `components` được cung cấp:
     * - Builder sẽ tự động gọi `parse()` để:
     *   - Convert config → component thực tế
     *   - Tạo `ActionRowBuilder`
     *   - Khởi tạo trạng thái ban đầu của `this.rows`
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Kiểm tra `components` có tồn tại
     * 2. Nếu có → gọi `parse(components)`
     * 3. Nếu không → builder khởi tạo rỗng
     *
     * ---
     *
     * ### Hành vi:
     * - Không validate rỗng (cho phép khởi tạo builder trống)
     * - Dữ liệu được build ngay tại thời điểm khởi tạo
     * - Có thể tiếp tục chain thêm các method sau đó
     *
     * ---
     *
     * ### Phù hợp khi:
     * - Khởi tạo nhanh UI ngay từ đầu
     * - Load dữ liệu từ config / database
     * - Tạo builder từ state có sẵn
     *
     * ---
     *
     * ### Lưu ý:
     * - Method `parse` chịu trách nhiệm xử lý logic build
     * - Constructor không clone dữ liệu đầu vào
     *
     * ---
     *
     * @example
     * ```ts
     * const builder = new ComponentBuilder([
     *   {
     *     type: "button",
     *     options: [
     *       { customId: "btn_1", label: "Click", style: 1 }
     *     ]
     *   }
     * ]);
     * ```
     *
     * @example
     * ```ts
     * // Khởi tạo rỗng rồi build sau
     * const builder = new ComponentBuilder();
     *
     * builder.addButton({
     *   customId: "a",
     *   label: "A",
     *   style: 1
     * });
     * ```
     *
     * @example
     * ```ts
     * await message.reply({
     *   components: new ComponentBuilder(components).build()
     * });
     * ```
     *
     * @see parse
     * @see addRow
     */
    constructor(components?: ComponentInput[]) {
        if (components) this.parse(components);
    }
    /**
     * Parse cấu hình component thành ActionRowBuilder
     * @hidden
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
                    if (btn.style === "Link") {
                        button.setStyle(ButtonStyle.Link).setURL(btn.url);
                    } else if (btn.style === "Premium") {
                        button.setStyle(ButtonStyle.Premium).setSKUId(btn.skuId);
                    } else {
                        button.setCustomId(btn.customId).setStyle(btn.style as any);
                    }
                    if ("label" in btn && btn.label) button.setLabel(btn.label);
                    if ("emoji" in btn && btn.emoji) button.setEmoji(btn.emoji);
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
                    if (comp.options.minValues !== undefined) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues !== undefined) menu.setMaxValues(comp.options.maxValues);
                    if (comp.type === "stringmenu" && !comp.options.options.length) {
                        throw new Error("stringmenu phải có options");
                    }
                    if (comp.options.options) menu.addOptions(comp.options.options);
                    row.addComponents(menu);
                } else if (comp.type === "rolemenu") {
                    const menu = new RoleSelectMenuBuilder().setCustomId(comp.options.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues !== undefined) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues !== undefined) menu.setMaxValues(comp.options.maxValues);
                    row.addComponents(menu);
                } else if (comp.type === "usermenu") {
                    const menu = new UserSelectMenuBuilder().setCustomId(comp.options.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues !== undefined) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues !== undefined) menu.setMaxValues(comp.options.maxValues);
                    row.addComponents(menu);
                } else if (comp.type === "channelmenu") {
                    const menu = new ChannelSelectMenuBuilder().setCustomId(comp.options.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues !== undefined) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues !== undefined) menu.setMaxValues(comp.options.maxValues);
                    if (comp.options.channelTypes) menu.setChannelTypes(comp.options.channelTypes);
                    row.addComponents(menu);
                } else if (comp.type === "mentionmenu") {
                    const opt = comp.options;
                    const menu = new MentionableSelectMenuBuilder().setCustomId(opt.customId);
                    if (comp.options.placeholder) menu.setPlaceholder(comp.options.placeholder);
                    if (comp.options.minValues !== undefined) menu.setMinValues(comp.options.minValues);
                    if (comp.options.maxValues !== undefined) menu.setMaxValues(comp.options.maxValues);
                    row.addComponents(menu);
                }
                this.rows.push(row);
            }
        }
    }
    /**
     * Thêm một hoặc nhiều ActionRow mới từ cấu hình component.
     *
     * @param components - Một hoặc danh sách cấu hình component (`ComponentInput`)
     * @returns Instance hiện tại (chainable)
     *
     * @throws Error nếu danh sách component rỗng
     *
     * @remarks
     * Đây là method “low-level” cho phép bạn thêm trực tiếp các cấu hình
     * component dưới dạng `ComponentInput` mà không cần dùng các shortcut như:
     * - {@link addButton}
     * - {@link addSelectMenu}
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Normalize input thành mảng (`ComponentInput[]`)
     * 2. Validate không được rỗng
     * 3. Gọi `parse()` để:
     *    - Convert config → component thực tế
     *    - Tự động tạo `ActionRowBuilder`
     *    - Push vào `this.rows`
     *
     * ---
     *
     * ### Hành vi:
     * - Hỗ trợ nhiều loại component trong cùng một lần gọi
     * - Mỗi phần tử trong `components` có thể tạo ra một hoặc nhiều `ActionRow`
     *   (tùy vào logic bên trong `parse`)
     *
     * ---
     *
     * ### Phù hợp khi:
     * - Bạn cần full control cấu trúc UI
     * - Kết hợp nhiều loại component (button + select menu)
     * - Build UI phức tạp / dynamic
     *
     * ---
     *
     * ### Lưu ý:
     * - Method này mutate trực tiếp builder
     * - Không validate sâu cấu trúc component (phụ thuộc `parse`)
     * - Là nền tảng cho các method khác như `addButton`, `addSelectMenu`
     *
     * ---
     *
     * @example
     * ```ts
     * builder.addRow({
     *   type: "button",
     *   options: [
     *     { customId: "a", label: "A", style: 1 }
     *   ]
     * });
     * ```
     *
     * @example
     * ```ts
     * // Thêm nhiều loại component cùng lúc
     * builder.addRow([
     *   {
     *     type: "button",
     *     options: [...]
     *   },
     *   {
     *     type: "stringmenu",
     *     options: {...}
     *   }
     * ]);
     * ```
     *
     * @example
     * ```ts
     * await message.reply({
     *   components: builder
     *     .addRow(components)
     *     .build()
     * });
     * ```
     *
     * @see parse
     * @see addButton
     * @see addSelectMenu
     */
    public addRow(components: ComponentInput | ComponentInput[]): this {
        const data = Array.isArray(components) ? components : [components];
        if (!data.length) {
            throw new Error("addRow: components không được rỗng");
        }
        this.parse(data);
        return this;
    }
    /**
     * Thêm một hoặc nhiều Button vào builder.
     *
     * @param buttons - Một hoặc danh sách cấu hình button
     * @returns Instance hiện tại (chainable)
     *
     * @throws Error nếu danh sách button rỗng
     *
     * @remarks
     * Đây là method shortcut giúp bạn thêm button nhanh chóng
     * mà không cần viết đầy đủ cấu trúc `{ type: "button" }`.
     *
     * Method này sẽ tự động:
     * - Wrap dữ liệu thành `{ type: "button", options: [...] }`
     * - Gọi {@link parse} để xử lý và tạo `ActionRow`
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Normalize input thành mảng (`ButtonInput[]`)
     * 2. Validate không được rỗng
     * 3. Wrap thành:
     *    ```ts
     *    { type: "button", options: data }
     *    ```
     * 4. Gọi `parse()` để build component
     *
     * ---
     *
     * ### Hành vi:
     * - Có thể thêm nhiều button trong một lần gọi
     * - Các button sẽ được group vào `ActionRow` theo logic của `parse`
     *
     * ---
     *
     * ### Lưu ý:
     * - Method này mutate trực tiếp builder
     * - Không validate sâu cấu trúc button (phụ thuộc `parse`)
     * - Nếu truyền mảng rỗng → throw error
     *
     * ---
     *
     * @example
     * ```ts
     * builder.addButton({
     *   customId: "btn",
     *   label: "Click",
     *   style: 1
     * });
     * ```
     *
     * @example
     * ```ts
     * // Thêm nhiều button
     * builder.addButton([
     *   { customId: "a", label: "A", style: 1 },
     *   { customId: "b", label: "B", style: 2 }
     * ]);
     * ```
     *
     * @example
     * ```ts
     * await message.reply({
     *   components: builder
     *     .addButton(buttons)
     *     .build()
     * });
     * ```
     *
     * @see parse
     * @see ActionRowBuilder
     */
    public addButton(buttons: ButtonInput | ButtonInput[]): this {
        const data = Array.isArray(buttons) ? buttons : [buttons];
        if (!data.length) {
            throw new Error("addButton: buttons không được rỗng");
        }
        this.parse([{ type: "button", options: data }]);
        return this;
    }
    /**
     * Thêm một hoặc nhiều Select Menu vào builder.
     *
     * @param menu - Một hoặc danh sách cấu hình Select Menu
     * @returns Instance hiện tại (chainable)
     *
     * @throws Error nếu danh sách menu rỗng
     *
     * @remarks
     * Method này hỗ trợ tất cả các loại Select Menu của Discord:
     * - String Select Menu (`stringmenu`)
     * - User Select Menu (`usermenu`)
     * - Role Select Menu (`rolemenu`)
     * - Channel Select Menu (`channelmenu`)
     * - Mentionable Select Menu (`mentionmenu`)
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Normalize input thành mảng (`SelectMenu[]`)
     * 2. Validate không được rỗng
     * 3. Gọi `parse()` để chuyển config → `ActionRowBuilder`
     *
     * ---
     *
     * ### Hành vi:
     * - Có thể thêm nhiều menu cùng lúc
     * - Mỗi menu sẽ được convert thành component tương ứng
     * - Việc grouping vào `ActionRow` được xử lý bên trong `parse`
     *
     * ---
     *
     * ### Lưu ý:
     * - Method này mutate trực tiếp builder
     * - Không validate sâu cấu trúc `options` (phụ thuộc `parse`)
     * - Nếu truyền mảng rỗng → throw error
     *
     * ---
     *
     * @example
     * ```ts
     * builder.addSelectMenu({
     *   type: "stringmenu",
     *   options: {
     *     customId: "menu",
     *     options: [
     *       { label: "A", value: "a" }
     *     ]
     *   }
     * });
     * ```
     *
     * @example
     * ```ts
     * // Thêm nhiều menu
     * builder.addSelectMenu([
     *   {
     *     type: "stringmenu",
     *     options: { customId: "menu1", options: [...] }
     *   },
     *   {
     *     type: "usermenu",
     *     options: { customId: "menu2" }
     *   }
     * ]);
     * ```
     *
     * @example
     * ```ts
     * await message.reply({
     *   components: builder
     *     .addSelectMenu(menuConfig)
     *     .build()
     * });
     * ```
     *
     * @see parse
     * @see ActionRowBuilder
     */
    public addSelectMenu(menu: SelectMenu | SelectMenu[]): this {
        const data = Array.isArray(menu) ? menu : [menu];
        if (!data.length) {
            throw new Error("addSelectMenu: menu không được rỗng");
        }
        this.parse(data);
        return this;
    }
    /**
     * Thay thế một hoặc nhiều ActionRow tại vị trí index bằng config mới.
     *
     * @param index - Vị trí bắt đầu thay thế trong danh sách `ActionRow`
     * @param components - Danh sách cấu hình component để tạo row mới
     * @returns Instance hiện tại (chainable)
     *
     * @remarks
     * Method này cho phép bạn thay thế động một hoặc nhiều `ActionRow`
     * mà không cần rebuild toàn bộ builder.
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Lưu lại `rows` hiện tại
     * 2. Reset tạm `this.rows` để reuse logic `addRow`
     * 3. Gọi `addRow(components)` để build các row mới
     * 4. Lấy kết quả (`newRows`)
     * 5. Khôi phục lại `rows` ban đầu
     * 6. Dùng `splice` để thay thế tại vị trí `index`
     *
     * ---
     *
     * ### Hành vi quan trọng:
     * - Số lượng row bị thay thế = số lượng row mới (`newRows.length`)
     * - Nếu số row mới khác số row cũ:
     *   → danh sách `rows` sẽ bị thay đổi kích thước
     *
     * ---
     *
     * ### Phù hợp khi:
     * - Update UI động (disable button, đổi label, đổi style)
     * - Replace một phần giao diện thay vì rebuild toàn bộ
     * - Làm pagination / step UI
     *
     * ---
     *
     * ### Lưu ý:
     * - Method này mutate trực tiếp `this.rows`
     * - Không validate index (có thể gây out-of-range nếu dùng sai)
     * - `components` sẽ được build lại thông qua `addRow`
     *
     * ---
     *
     * @example
     * ```ts
     * builder.replace(0, [
     *   {
     *     type: "button",
     *     options: [
     *       {
     *         customId: "test",
     *         label: "Test",
     *         style: "Danger"
     *       }
     *     ]
     *   }
     * ]);
     * ```
     *
     * @example
     * ```ts
     * // Replace nhiều row
     * builder.replace(0, [
     *   { type: "button", options: [...] },
     *   { type: "stringmenu", options: {...} }
     * ]);
     * ```
     *
     * @example
     * ```ts
     * // Update UI sau interaction
     * await interaction.update({
     *   components: builder
     *     .replace(0, newComponents)
     *     .build()
     * });
     * ```
     *
     * @see ActionRowBuilder
     * @see addRow
     */
    public replace(index: number, components: ComponentInput[]) {
        if (index < 0 || index >= this.rows.length) {
            throw new Error(`Index ${index} nằm ngoài phạm vi (0 → ${this.rows.length - 1})`);
        }
        const originalRows = this.rows;
        this.rows = [];
        this.addRow(components);
        const newRows = this.rows;
        this.rows = originalRows;
        this.rows.splice(index, newRows.length, ...newRows);
        return this;
    }
    /**
     * Thay thế một đoạn ActionRow liên tiếp bằng các component mới.
     *
     * @param start - Vị trí bắt đầu thay thế
     * @param deleteCount - Số lượng ActionRow cần xóa
     * @param components - Danh sách cấu hình component để tạo row mới
     * @returns Instance hiện tại (chainable)
     *
     * @throws Error nếu `start` hoặc `deleteCount` không hợp lệ
     *
     * @remarks
     * Method này hoạt động tương tự `Array.prototype.splice`,
     * cho phép bạn:
     * - Xóa nhiều row liên tiếp
     * - Chèn các row mới vào vị trí đó
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Validate `start` và `deleteCount`
     * 2. Build `newRows` thông qua `addRow`
     * 3. Dùng `splice(start, deleteCount, ...newRows)` để thay thế
     *
     * ---
     *
     * ### Hành vi:
     * - Có thể thay đổi độ dài `rows`
     * - Có thể:
     *   - Replace (deleteCount > 0 && newRows.length > 0)
     *   - Remove (deleteCount > 0 && newRows.length = 0)
     *   - Insert (deleteCount = 0 && newRows.length > 0)
     *
     * ---
     *
     * ### Phù hợp khi:
     * - Update UI nhiều row cùng lúc
     * - Pagination / step UI
     * - Thay đổi layout động
     *
     * ---
     *
     * ### Lưu ý:
     * - Method này mutate trực tiếp `this.rows`
     * - `components` sẽ được build lại thông qua `addRow`
     *
     * ---
     *
     * @example
     * ```ts
     * // Replace 2 rows từ index 0
     * builder.replaceRange(0, 2, [
     *   { type: "button", options: [...] },
     *   { type: "stringmenu", options: {...} }
     * ]);
     * ```
     *
     * @example
     * ```ts
     * // Insert tại index 1 (không xóa)
     * builder.replaceRange(1, 0, [
     *   { type: "button", options: [...] }
     * ]);
     * ```
     *
     * @example
     * ```ts
     * // Remove 2 rows
     * builder.replaceRange(0, 2, []);
     * ```
     *
     * @see replace
     * @see replaceOne
     */
    public replaceRange(start: number, deleteCount: number, components: ComponentInput[]) {
        if (start < 0 || start > this.rows.length) {
            throw new Error(`Index ${start} vượt ngoài phạm vi (${this.rows.length})`);
        }
        if (deleteCount < 0) {
            throw new Error(`deleteCount ${deleteCount} không hợp lệ`);
        }
        const originalRows = this.rows;
        // Build new rows
        this.rows = [];
        this.addRow(components);
        const newRows = this.rows;
        // Restore + apply splice
        this.rows = originalRows;
        this.rows.splice(start, deleteCount, ...newRows);
        return this;
    }
    /**
     * Thay thế một ActionRow tại vị trí index bằng một config duy nhất.
     *
     * @param index - Vị trí cần thay thế trong danh sách `ActionRow`
     * @param component - Cấu hình component để tạo row mới
     * @returns Instance hiện tại (chainable)
     *
     * @throws Error nếu index không hợp lệ
     *
     * @remarks
     * Đây là method tiện ích (helper) của {@link replace}, dùng khi bạn chỉ cần
     * thay thế một row duy nhất thay vì nhiều row.
     *
     * Internally:
     * - Wrapper của `replace`
     * - Tự động convert `component` → `ComponentInput[]`
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Nhận một `component` duy nhất
     * 2. Wrap thành mảng `[component]`
     * 3. Gọi {@link replace} để thực hiện logic thay thế
     *
     * ---
     *
     * ### Phù hợp khi:
     * - Update một ActionRow duy nhất
     * - Toggle trạng thái button (enable/disable)
     * - Thay đổi UI đơn giản sau interaction
     *
     * ---
     *
     * ### Lưu ý:
     * - Validation `index` được xử lý bên trong {@link replace}
     * - Method này mutate trực tiếp builder hiện tại
     *
     * ---
     *
     * @example
     * ```ts
     * builder.replaceOne(0, {
     *   type: "button",
     *   options: [
     *     {
     *       customId: "confirm",
     *       label: "Confirm",
     *       style: "Success"
     *     }
     *   ]
     * });
     * ```
     *
     * @example
     * ```ts
     * // Update UI sau interaction
     * await interaction.update({
     *   components: builder
     *     .replaceOne(1, newRow)
     *     .build()
     * });
     * ```
     *
     * @see replace
     */
    public replaceOne(index: number, component: ComponentInput) {
        return this.replace(index, [component]);
    }
    /**
     * Disable toàn bộ component trong tất cả ActionRow.
     *
     * @returns Instance hiện tại (chainable)
     *
     * @remarks
     * Method này sẽ duyệt qua toàn bộ các `ActionRow` và:
     * - Tìm các component có hỗ trợ method `setDisabled`
     * - Thiết lập trạng thái `disabled = true`
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Lặp qua từng `ActionRow` trong `this.rows`
     * 2. Lặp qua từng component trong mỗi row
     * 3. Kiểm tra component có method `setDisabled`
     * 4. Gọi `setDisabled(true)` nếu tồn tại
     *
     * ---
     *
     * ### Áp dụng cho:
     * - Button
     * - Select Menu (String, User, Role, Channel, ...)
     * - Các component khác hỗ trợ disable
     *
     * ---
     *
     * ### Use case phổ biến:
     * - Khi collector kết thúc → khóa toàn bộ UI
     * - Sau khi user đã interaction → tránh spam / double click
     * - Khi timeout hoặc error → vô hiệu hóa input
     *
     * ---
     *
     * ### Lưu ý:
     * - Method này mutate trực tiếp builder hiện tại (không clone)
     * - Nên gọi trước {@link build} hoặc trước khi edit message
     *
     * ---
     *
     * @example
     * ```ts
     * builder.disableAll();
     * 
     * await message.edit({
     *   components: builder.build()
     * });
     * ```
     *
     * @example
     * ```ts
     * // Sau khi collector kết thúc
     * collector.on("end", async () => {
     *   await message.edit({
     *     components: builder.disableAll().build()
     *   });
     * });
     * ```
     *
     * @example
     * ```ts
     * // Chain usage
     * await message.reply({
     *   components: builder
     *     .disableAll()
     *     .build()
     * });
     * ```
     *
     * @see ActionRowBuilder
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
     * Build toàn bộ ActionRow để sử dụng trong Discord API.
     *
     * @returns Mảng {@link ActionRowBuilder} đã được cấu hình
     *
     * @remarks
     * Đây là bước cuối cùng trong quá trình sử dụng builder.
     * Method này sẽ trả về toàn bộ các `ActionRow` đã được thêm trước đó
     * để có thể truyền trực tiếp vào các method của Discord như:
     * - `message.reply`
     * - `interaction.reply`
     * - `message.edit`
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * - Không tạo mới dữ liệu
     * - Chỉ trả về reference của `this.rows`
     * - Các component bên trong đã được cấu hình từ trước thông qua builder
     *
     * ---
     *
     * ### Lưu ý:
     * - Không nên mutate trực tiếp kết quả sau khi `build()`
     * - Nếu cần thay đổi, nên thao tác thông qua builder trước khi gọi `build`
     *
     * ---
     *
     * @example
     * ```ts
     * await message.reply({
     *   components: builder.build()
     * });
     * ```
     *
     * @example
     * ```ts
     * const components = builder.build();
     * 
     * await interaction.editReply({
     *   components
     * });
     * ```
     *
     * @example
     * ```ts
     * // Reuse builder
     * const components = builder.build();
     * 
     * await message1.reply({ components });
     * await message2.reply({ components });
     * ```
     *
     * @see ActionRowBuilder
     */
    public build(): ActionRowBuilder<T>[] {
        if (this.rows.length > 5) {
            throw new Error(`ComponentBuilder: một message chỉ có tối đa 5 hàng component (đang có ${this.rows.length}).`);
        }
        return this.rows;
    }
    /**
     * Tạo Interaction Collector từ source (message hoặc interaction).
     *
     * @typeParam ComponentType - Loại component (button, select menu, ...)
     * @typeParam InGuild - Xác định interaction có nằm trong guild hay không
     *
     * @param options - Cấu hình collector và nguồn khởi tạo
     * @returns Promise resolve với {@link InteractionCollector}
     * ---
     * 
     * ### Context trong `onCollector`
     * Callback sẽ nhận object:
     * - `interaction`: Interaction gốc
     * - `customId`: ID của component
     * - `userId`: ID của user
     * - `values`: Giá trị (chỉ có với select menu)
     * - `message`: Message chứa component
     * - `collector`: Instance collector
     * - `stop()`: Dừng collector
     *
     * ---
     *
     * ### Context trong `onEnd`
     * Callback sẽ nhận object:
     * - `message`: Message chứa collector
     * - `reason`: Lý do kết thúc
     * - `total`: Tổng số interaction đã collect
     * - `edit()`: Helper để edit message
     *
     * ---
     *
     * @example
     * ```ts
     * const collector = await builder.createCollector({
     *   source: message,
     *   time: 60000,
     *   onCollector: async (ctx) => {
     *     console.log(ctx.customId);
     *   }
     * });
     * ```
     *
     * @example
     * ```ts
     * // Sử dụng với interaction
     * const collector = await builder.createCollector({
     *   source: interaction,
     *   time: 30000,
     *   onCollector: async ({ interaction, stop }) => {
     *     await interaction.reply("Clicked!");
     *     stop();
     *   },
     *   onEnd: ({ total, reason }) => {
     *     console.log(`Collected: ${total}, reason: ${reason}`);
     *   }
     * });
     * ```
     *
     * @example
     * ```ts
     * // Select menu
     * const collector = await builder.createCollector({
     *   source: message,
     *   componentType: ComponentType.StringSelect,
     *   onCollector: ({ values }) => {
     *     console.log(values); // string[]
     *   }
     * });
     * ```
     *
     * @see InteractionCollector
     * @see Message#createMessageComponentCollector
     */
    public async createCollector<ComponentType extends MessageComponentType, InGuild extends boolean = boolean>(options: CreateMessageComponentCollector<ComponentType, InGuild>): Promise<InteractionCollector<ResolveInteraction<ComponentType, InGuild>>> {
        const message = options.source instanceof Message ? options.source : await options.source.fetchReply();
        const report = (error: unknown) => options.onError ? options.onError(error) : console.error("[ComponentBuilder] collector:", error);
        const collector = message.createMessageComponentCollector(options) as unknown as InteractionCollector<ResolveInteraction<ComponentType, InGuild>>;
        if (options.onCollector) {
            collector.on("collect", async (interaction) => {
                try {
                    return await options.onCollector!({
                        interaction: interaction,
                        customId: interaction.customId,
                        userId: interaction.user.id,
                        values: "values" in interaction ? interaction.values : undefined,
                        message: message,
                        collector: collector,
                        stop: () => collector.stop(),
                    });
                } catch (error) {
                    report(error);
                }
            });
        }
        if (options.onEnd) {
            collector.on("end", async (collected, reason) => {
                try {
                    return await options.onEnd!({
                        message: message,
                        reason: reason,
                        total: collected.size,
                        edit: (editOptions) => message.edit(editOptions as MessageEditOptions),
                    });
                } catch (error) {
                    report(error);
                }
            });
        }
        return collector;
    }
    /**
     * Chuyển toàn bộ `ActionRowBuilder` sang định dạng JSON theo Discord API.
     *
     * @returns Mảng {@link APIActionRowComponent} ở dạng raw JSON
     *
     * @remarks
     * Method này sẽ gọi `.toJSON()` trên từng {@link ActionRowBuilder}
     * để chuyển đổi toàn bộ component sang format mà Discord API yêu cầu.
     *
     * ---
     *
     * ### Cơ chế hoạt động:
     * 1. Lặp qua toàn bộ `this.rows`
     * 2. Gọi `row.toJSON()` trên từng row
     * 3. Trả về mảng JSON tương ứng
     *
     * ---
     *
     * ### Phù hợp khi:
     * - Debug cấu trúc component trước khi gửi
     * - Serialize để lưu trữ (cache / database)
     * - Gửi trực tiếp qua REST API (không dùng builder)
     *
     * ---
     *
     * ### Khác với {@link build}:
     * - `build()` → trả về builder object (dùng trực tiếp với discord.js)
     * - `toJSON()` → trả về raw JSON (Discord API format)
     *
     * ---
     *
     * ### Lưu ý:
     * - Dữ liệu trả về là plain object (không còn method)
     * - Không nên mutate trực tiếp nếu dùng lại builder
     *
     * ---
     *
     * @example
     * ```ts
     * const json = builder.toJSON();
     *
     * console.log(json);
     * ```
     *
     * @example
     * ```ts
     * // Gửi qua REST API
     * await rest.post(Routes.channelMessages(channelId), {
     *   body: {
     *     components: builder.toJSON()
     *   }
     * });
     * ```
     *
     * @example
     * ```ts
     * // Debug cấu trúc component
     * console.dir(builder.toJSON(), { depth: null });
     * ```
     *
     * @see ActionRowBuilder#toJSON
     * @see build
     */
    public toJSON(): APIActionRowComponent<ReturnType<T["toJSON"]>>[] {
        return this.rows.map((r) => r.toJSON());
    }
}