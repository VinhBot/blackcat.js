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

import { CollectorInteraction, CreateMessageComponentCollector, createMessageComponentCollector } from "..";
/**
 * Union type đại diện cho tất cả component builder có thể được sử dụng
 * trong ActionRow của Discord.
 * @hidden
 */
export type AnyComponent = | ButtonBuilder | StringSelectMenuBuilder | RoleSelectMenuBuilder | UserSelectMenuBuilder | ChannelSelectMenuBuilder | MentionableSelectMenuBuilder;
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
    style: | "Primary" | "Secondary" | "Success" | "Danger" | "Premium";
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
     * Tạo ComponentBuilder
     *
     * @param components Danh sách cấu hình component ban đầu
     * 
     * @remarks
     * Nếu truyền `components`, builder sẽ tự động parse và build ngay từ constructor.
     * 
     * Constructor này giúp bạn khởi tạo nhanh component mà không cần gọi thủ công `addRow` hoặc `parse`.
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
                    if (comp.type === "stringmenu" && !comp.options.options.length) {
                        throw new Error("stringmenu phải có options");
                    }
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
     * Thêm một hoặc nhiều ActionRow mới từ config
     *
     * @param components Danh sách component input
     * @returns void
     * 
     * Sử dụng khi bạn muốn thêm nhiều loại component cùng lúc.
     * 
     * @example
     * ```ts
     * builder.addRow([
     *   {
     *     type: "button",
     *     options: [{ customId: "a", label: "A", style: 1 }]
     *   }
     * ]);
     * ```
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
     * Thêm button vào builder
     *
     * @param buttons Danh sách button config
     * @returns void
     * 
     * @remarks
     * Shortcut cho việc thêm button mà không cần viết full structure.
     * 
     * Tự động wrap thành `{ type: "button" }`
     * 
     * @example
     * ```ts
     * builder.addButton([
     *   { customId: "btn", label: "Click", style: 1 }
     * ]);
     * ```
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
     * Thêm Select Menu vào builder
     *
     * @param menu Danh sách select menu config
     * @returns void
     * 
     * @remarks
     * Hỗ trợ tất cả loại select menu (string, role, user, channel, mention)
     * 
     * @example
     * ```ts
     * builder.addSelectMenu([
     *   {
     *     type: "stringmenu",
     *     options: {
     *       customId: "menu",
     *       options: [{ label: "A", value: "a" }]
     *     }
     *   }
     * ]);
     * ```
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
     * Thay thế một hoặc nhiều ActionRow tại vị trí index bằng config mới
     *
     * @param index Vị trí bắt đầu thay thế
     * @param components Danh sách component config
     * @returns this
     * 
     * Phù hợp khi bạn muốn:
     * - Update UI động (VD: disable button, đổi label,...)
     * - Replace toàn bộ row bằng config mới
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
     * // Replace nhiều row
     * builder.replace(0, [
     *   { type: "button", options: [...] },
     *   { type: "stringmenu", options: {...} }
     * ]);
     */
    public replace(index: number, components: ComponentInput[]) {
        const originalRows = this.rows;
        this.rows = [];
        this.addRow(components);
        const newRows = this.rows;
        this.rows = originalRows;
        this.rows.splice(index, newRows.length, ...newRows);
        return this;
    }
    /**
     * Disable toàn bộ component
     *
     * @returns this
     * 
     * @remarks
     * Áp dụng cho tất cả component có method `setDisabled`
     * 
     * Hữu ích khi:
     * - Collector kết thúc
     * - Lock UI sau khi user interaction
     * 
     * @example
     * ```ts
     * builder.disableAll();
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
     * Build toàn bộ ActionRow
     *
     * @returns ActionRowBuilder[]
     * 
     * @remarks
     * Đây là method dùng để lấy output cuối cùng để gửi vào Discord API
     * 
     * @example
     * ```ts
     * await message.reply({
     *   components: builder.build()
     * });
     * ```
     */
    public build(): ActionRowBuilder<T>[] {
        return this.rows;
    }
    /**
     * Tạo Interaction Collector từ source
     *
     * @param options Cấu hình collector + nguồn (message hoặc interaction)
     * @returns Promise<InteractionCollector>
     * 
     * @remarks
     * Wrapper của `createMessageComponentCollector` giúp tích hợp dễ dàng với builder.
     * 
     * Method này sẽ:
     * 1. Tạo collector từ message hoặc interaction
     * 2. Map lại lifecycle:
     *    - `onCollector`
     *    - `onEnd`
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
     */
    public async createCollector(options: CreateMessageComponentCollector & { source: Message | ChatInputCommandInteraction }): Promise<InteractionCollector<CollectorInteraction>> {
        const { source, time, idle, ...rest } = options;
        const collector = await createMessageComponentCollector(source, {
            time: time ?? 20,
            idle: idle ? idle : undefined,
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