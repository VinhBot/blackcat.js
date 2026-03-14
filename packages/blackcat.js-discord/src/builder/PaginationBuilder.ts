import { APIMessageComponentEmoji, BaseMessageOptions, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, StringSelectMenuBuilder, StringSelectMenuInteraction } from "discord.js";
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, Message, MessageFlags, LabelBuilder } from "discord.js";
import { ComponentBuilder, createMessageComponentCollector, parseTime } from "..";

/**
 * Schema mô tả một button được tạo bởi pagination.
 *
 * Object này dùng để build `ButtonBuilder`
 * thông qua helper `context.button()`.
 */
export type PaginationButtonOption = {
    /**
     * Custom ID của button.
     *
     * Dùng để nhận diện interaction khi user click.
     */
    customId: string;
    /**
     * Style của button.
     *
     * Mapping tới `ButtonStyle` của Discord.
     */
    style: | "Primary" | "Secondary" | "Success" | "Danger" | "Link";
    /**
     * Label hiển thị trên button.
     */
    label?: string;
    /**
     * Emoji hiển thị trên button.
     *
     * Có thể là:
     *
     * - Unicode emoji (`"⬅️"`)
     * - Discord emoji object
     */
    emoji?: string | APIMessageComponentEmoji;
    /**
     * URL cho button kiểu `Link`.
     *
     * Chỉ áp dụng khi `style = "Link"`.
     */
    url?: string;
    /**
     * Trạng thái disabled của button.
     */
    disabled?: boolean;
};
/**
 * Context truyền vào khi build components cho pagination.
 *
 * Context này thường được dùng trong `render`
 * để tạo các button navigation như:
 *
 * - previous
 * - next
 * - first
 * - last
 */
export type PaginationBuildComponentsContext<T> = {
    /**
     * Trang hiện tại.
     */
    page: number;
    /**
     * Tổng số trang.
     */
    totalPages: number;
    /**
     * Dữ liệu của trang hiện tại.
     */
    data: T;
    /**
     * Instance của PaginationBuilder.
     */
    pagination: PaginationBuilder<T>;
    /**
     * Helper function để build `ActionRowBuilder<ButtonBuilder>[]`
     * từ danh sách `PaginationButtonOption`.
     *
     * @example
     * ```ts
     * button([
     *   { customId: "prev", style: "Secondary", emoji: "⬅️" },
     *   { customId: "next", style: "Secondary", emoji: "➡️" }
     * ])
     * ```
     */
    button: (schemas: PaginationButtonOption[]) => ActionRowBuilder<ButtonBuilder>[];
};

/**
 * Context truyền vào khi render nội dung của pagination.
 *
 * Thường được dùng để build:
 *
 * - Embed
 * - Message content
 * - Components
 */
export type PaginationRenderContext<T> = {
    /**
     * Trang hiện tại.
     */
    page: number;
    /**
     * Tổng số trang.
     */
    totalPages: number;
    /**
     * Dữ liệu của trang hiện tại.
     */
    data: T;
    /**
     * Instance của PaginationBuilder.
     */
    pagination: PaginationBuilder<T>;
};

/**
 * Context được truyền vào khi user tương tác
 * với component của pagination.
 *
 * Ví dụ:
 *
 * - click button "next"
 * - click button "previous"
 * - chọn option trong select menu
 */
export type PaginationComponentContext<T> = {
    /**
     * Interaction từ component.
     */
    interaction: | ButtonInteraction | StringSelectMenuInteraction;
    /**
     * Instance của PaginationBuilder.
     */
    pagination: PaginationBuilder<T>;
    /**
     * Trang hiện tại trước khi xử lý interaction.
     */
    page: number;
    /**
     * Tổng số trang.
     */
    totalPages: number;
    /**
     * Dữ liệu của trang hiện tại.
     */
    data: T;
};

/**
 * Cấu hình cho {@link PaginationBuilder}.
 *
 * Cho phép xây dựng hệ thống phân trang cho Discord message
 * với navigation button, select menu và custom component actions.
 *
 * @template T Kiểu dữ liệu của mỗi trang.
 *
 * @example
 * ```ts
 * const pagination = new PaginationBuilder<string>({
 *   pages: ["Page 1", "Page 2", "Page 3"],
 *
 *   renderPage: ({ data, page, totalPages }) => ({
 *     content: `Trang ${page + 1}/${totalPages}\n${data}`
 *   })
 * });
 *
 * await pagination.start(message);
 * ```
 */
export type PaginationOptions<T> = {
    /**
     * Danh sách dữ liệu cho từng trang.
     *
     * Nếu cung cấp `pages` thì `pageLoader` sẽ bị bỏ qua.
     *
     * @example
     * ```ts
     * pages: [
     *   "Trang 1",
     *   "Trang 2",
     *   "Trang 3"
     * ]
     * ```
     */
    pages?: T[];
    /**
     * Hàm tải dữ liệu động cho từng trang.
     *
     * Thường dùng khi dữ liệu rất lớn
     * hoặc cần load từ database / API.
     *
     * @example
     * ```ts
     * pageLoader: async (page) => {
     *   return database.getUsers(page);
     * }
     * ```
     */
    pageLoader?: (page: number) => Promise<T>;
    /**
     * Hàm render nội dung message của mỗi trang.
     *
     * Bắt buộc phải cung cấp.
     *
     * @example
     * ```ts
     * renderPage: ({ page, totalPages, data }) => ({
     *   content: `Page ${page + 1}/${totalPages}\n${data}`
     * })
     * ```
     */
    renderPage: | ((ctx: PaginationRenderContext<T>) => Promise<BaseMessageOptions>) | ((ctx: PaginationRenderContext<T>) => BaseMessageOptions);
    /**
     * Thêm các component tùy chỉnh vào pagination.
     *
     * Dùng để thêm button hoặc select menu riêng.
     *
     * @example
     * ```ts
     * buildComponents: ({ button }) => button([
     *    {
     *        customId: "example",
     *        label: "example",
     *        style: ButtonStyle
     *    }
     * ])
     * ```
     */
    buildComponents?: (ctx: PaginationBuildComponentsContext<T>) => ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[];
    /**
     * Gọi mỗi khi có interaction xảy ra.
     */
    onComponent?: (ctx: PaginationComponentContext<T>) => Promise<any> | any;
    /**
     * Gọi khi trang thay đổi.
     */
    onPageChange?: (ctx: {
        oldPage: number;
        newPage: number;
        interaction: | ButtonInteraction | StringSelectMenuInteraction;
        pagination: PaginationBuilder<T>;
    }) => Promise<any> | any;
    /**
     * Filter cho interaction.
     *
     * Trả về `false` để chặn user.
     *
     * @example
     * ```ts
     * interactionFilter: (i) => i.user.id === message.author.id
     * ```
     */
    interactionFilter?: (interaction: | ButtonInteraction | StringSelectMenuInteraction) => boolean;
    /**
     * Cấu hình navigation buttons.
     *
     * Mặc định tất cả đều bật.
     */
    navigation?: {
        first?: boolean;
        prev?: boolean;
        next?: boolean;
        last?: boolean;
        jump?: boolean;
    };
    /**
     * Cấu hình select menu để nhảy trang.
     */
    selectMenu?: {
        /**
         * Bật hoặc tắt select menu.
         */
        enabled?: boolean;
        /**
         * Placeholder hiển thị trên menu.
         */
        placeholder?: string;
        /**
         * Tùy chỉnh label cho từng trang.
         *
         * @example
         * ```ts
         * pageLabel: (page) => `Trang ${page + 1}`
         * ```
         */
        pageLabel?: (page: number) => string;
    };
    /**
     * Gọi khi pagination bắt đầu.
     */
    onStart?: (ctx: { message: Message }) => any;
    /**
     * Gọi khi collector dừng.
     */
    onStop?: (ctx: { message: Message }) => any;
    /**
     * Gọi khi collector timeout.
     */
    onTimeout?: (ctx: { message: Message }) => any;
    /**
     * Bắt lỗi nội bộ.
     */
    onError?: (error: unknown) => any;
    /**
     * Thời gian collector (s).
     *
     * @default 120 // giây
     */
    timeout?: number;
};
/**
 * Pagination builder cho Discord bot.
 *
 * Hỗ trợ:
 *
 * - Navigation buttons (first / prev / next / last)
 * - Jump to page (modal)
 * - Select menu jump
 * - Custom components
 * - Dynamic page loading
 *
 * @template T Kiểu dữ liệu mỗi trang
 *
 * @example
 * ```ts
 * const pagination = new PaginationBuilder<string>({
 *   pages: [
 *     "Trang 1",
 *     "Trang 2",
 *     "Trang 3"
 *   ],
 *
 *   renderPage: ({ page, totalPages, data }) => ({
 *     content: `Trang ${page + 1}/${totalPages}\n${data}`
 *   })
 * });
 *
 * await pagination.start(message);
 * ```
 */
export class PaginationBuilder<T> {
    private options: PaginationOptions<T>;
    private message!: Message;
    private componentBuilder!: ComponentBuilder<any>;
    private page = 0;
    private totalPages = 0;
    private pages?: T[];
    public state: Record<string, any> = {};
    constructor(options: PaginationOptions<T>) {
        this.options = options;
        this.pages = options.pages;
        if (this.pages) {
            this.totalPages = this.pages.length;
        }
    }
    /**
     * Khởi động hệ thống pagination và gửi message đầu tiên.
     *
     * Method này sẽ:
     *
     * 1. Lấy dữ liệu của trang đầu (`page = 0`)
     * 2. Gọi `renderPage()` để tạo nội dung message
     * 3. Tạo navigation buttons và select menu
     * 4. Gửi message tới Discord
     * 5. Khởi tạo `InteractionCollector`
     *
     * Hỗ trợ cả:
     * - **Prefix command** (`Message`)
     * - **Slash command** (`ChatInputCommandInteraction`)
     *
     * @param source Nguồn gọi pagination.
     * - `Message` khi dùng prefix command
     * - `ChatInputCommandInteraction` khi dùng slash command
     *
     * @returns Promise<any>
     *
     * @throws {Error}
     * Nếu không có `pages` hoặc `pageLoader` được cung cấp.
     *
     * @example Prefix Command
     * ```ts
     * const pagination = new PaginationBuilder<string>({
     *   pages: [
     *     "Trang 1",
     *     "Trang 2",
     *     "Trang 3"
     *   ],
     *
     *   renderPage: ({ page, totalPages, data }) => ({
     *     content: `Trang ${page + 1}/${totalPages}\n${data}`
     *   })
     * });
     *
     * await pagination.start(message);
     * ```
     *
     * @example Slash Command
     * ```ts
     * const pagination = new PaginationBuilder<string>({
     *   pages: [
     *     "Page 1",
     *     "Page 2",
     *     "Page 3"
     *   ],
     *
     *   renderPage: ({ page, totalPages, data }) => ({
     *     content: `Page ${page + 1}/${totalPages}\n${data}`
     *   })
     * });
     *
     * await pagination.start(interaction);
     * ```
     *
     * @example Dynamic Page Loader
     * ```ts
     * const pagination = new PaginationBuilder<User[]>({
     *   pageLoader: async (page) => {
     *     return database.getUsers(page);
     *   },
     *
     *   renderPage: ({ data }) => ({
     *     embeds: [createUserEmbed(data)]
     *   })
     * });
     *
     * await pagination.start(message);
     * ```
     *
     * @remarks
     * - Sau khi `start()` chạy, pagination sẽ tạo một `InteractionCollector`
     * để xử lý button và select menu.
     *
     * - Collector sẽ tự động dừng sau `timeout`.
     *
     * - Khi dừng sẽ gọi các hook:
     *   - `onTimeout`
     *   - `onStop`
     */
    public async start(source: Message | ChatInputCommandInteraction) {
        const data = await this.getPageData(this.page);
        const content = await this.options.renderPage({
            page: this.page,
            totalPages: this.totalPages,
            data: data,
            pagination: this
        });
        const components = await this.buildComponents(data);
        if (source instanceof Message) {
            this.message = await source.reply({ ...content, components: components });
        } else {
            await source.reply({ ...content, components: components });
            this.message = await source.fetchReply() as Message;
        }
        await this.createCollector();
        await this.createCollector2();
        this.options.onStart?.({
            message: this.message
        });
    }
    /**
     * Lấy dữ liệu của một trang.
     *
     * Ưu tiên sử dụng `pages`, nếu không sẽ gọi `pageLoader`.
     */
    private async getPageData(page: number): Promise<T> {
        if (this.pages) return this.pages[page];
        if (this.options.pageLoader) {
            return this.options.pageLoader(page);
        }
        throw new Error("No pages or pageLoader provided.");
    }
    /**
     * Xây dựng toàn bộ message components
     * bao gồm navigation, select menu và custom components.
     */
    private async buildComponents(data: T) {
        const schema: any[] = [];
        const nav = this.buildNavigationSchema();
        const select = this.buildSelectSchema();
        if (nav) schema.push(nav);
        if (select) schema.push(select);
        this.componentBuilder = new ComponentBuilder(schema);
        const rows = [...this.componentBuilder.build()];
        const button = (schemas: PaginationButtonOption[]): ActionRowBuilder<ButtonBuilder>[] => {
            const builtRows: ActionRowBuilder<ButtonBuilder>[] = [];
            for (let i = 0; i < schemas.length; i += 5) {
                const row = new ActionRowBuilder<ButtonBuilder>();
                for (let j = i; j < i + 5 && j < schemas.length; j++) {
                    const btn = schemas[j];
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
                builtRows.push(row);
            }
            rows.push(...builtRows);
            return builtRows;
        };

        if (this.options.buildComponents) {
            this.options.buildComponents({
                page: this.page,
                totalPages: this.totalPages,
                data: data,
                pagination: this,
                button: button
            });
        }
        return rows;
    }
    /**
     * Tạo schema navigation buttons
     * (first, prev, next, last, jump).
     */
    private buildNavigationSchema() {
        const config = {
            first: true,
            prev: true,
            next: true,
            last: true,
            jump: true,
            ...this.options.navigation
        };
        const isFirst = this.page === 0;
        const isLast = this.page === this.totalPages - 1;
        const buttons = [];
        if (config.first) {
            buttons.push({
                customId: "pagination:first",
                label: "<<",
                style: "Secondary",
                disabled: isFirst
            });
        }
        if (config.prev) {
            buttons.push({
                customId: "pagination:prev",
                label: "<",
                style: "Secondary",
                disabled: isFirst
            });
        }
        if (config.next) {
            buttons.push({
                customId: "pagination:next",
                label: ">",
                style: "Secondary",
                disabled: isLast
            });
        }
        if (config.last) {
            buttons.push({
                customId: "pagination:last",
                label: ">>",
                style: "Secondary",
                disabled: isLast
            });
        }
        if (config.jump) {
            buttons.push({
                customId: "pagination:jump",
                label: "Nhảy trang",
                style: "Primary",
            });
        }

        return {
            type: "button",
            options: buttons
        };
    }
    /**
     * Tạo schema select menu để nhảy trang.
     */
    private buildSelectSchema() {
        const options = [];
        if (!this.options.selectMenu?.enabled !== true) return null;

        for (let i = 0; i < this.totalPages; i++) options.push({
            label: this.options.selectMenu?.pageLabel ? this.options.selectMenu.pageLabel(i) : `Trang ${i + 1}`,
            value: String(i),
            default: i === this.page
        });

        return {
            type: "stringmenu",
            options: {
                customId: "pagination:select",
                placeholder: this.options.selectMenu?.placeholder ?? "Nhảy đến trang",
                options: options
            }
        };
    }
    /**
     * Khởi tạo InteractionCollector
     * để xử lý button và select menu interactions.
     */
    private async createCollector() {
        const collector = await this.componentBuilder.createCollector({
            source: this.message,
            time: this.options.timeout ?? 120,
            onCollector: async ({ interaction, customId }) => {
                try {
                    if (this.options.interactionFilter && !this.options.interactionFilter(interaction as any)) {
                        return await interaction.reply({
                            content: "Bạn không thể sử dụng cái này.",
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    if (customId === "pagination:jump") {
                        const modal = new ModalBuilder({
                            customId: "pagination:jumpModal",
                            title: "Nhảy đến trang",
                        });
                        modal.addLabelComponents(
                            new LabelBuilder()
                                .setLabel("Nhập số trang")
                                .setDescription("Nhập số trang bạn muốn chuyển đến")
                                .setTextInputComponent(
                                    new TextInputBuilder({
                                        customId: "page",
                                        style: TextInputStyle.Short,
                                        required: true,
                                    })
                                )
                        );
                        await interaction.showModal(modal);
                        try {
                            const submit = await interaction.awaitModalSubmit({
                                time: parseTime(60),
                                filter: (i) => i.user.id === interaction.user.id,
                            });
                            await submit.deferUpdate();
                            const page = Number(submit.fields.getTextInputValue("page")) - 1;
                            if (Number.isNaN(page) || page < 0) return;
                            await this.goto(page);
                        } catch (error) {
                            this.options.onError?.(error);
                        }
                        return;
                    }
                    if (interaction.isButton()) {
                        if (customId === "pagination:first") return this.goto(0, interaction);
                        if (customId === "pagination:prev") return this.goto(this.page - 1, interaction);
                        if (customId === "pagination:next") return this.goto(this.page + 1, interaction);
                        if (customId === "pagination:last") return this.goto(this.totalPages - 1, interaction);
                    }
                    if (interaction.isStringSelectMenu()) {
                        if (customId === "pagination:select") return this.goto(Number(interaction.values[0]), interaction);
                    }
                } catch (error) {
                    this.options.onError?.(error);
                }
            },
            onEnd: (ctx) => {
                this.options.onTimeout?.({ message: ctx.message });
                this.options.onStop?.({ message: ctx.message });
            }
        });
        return collector;
    }

    private async createCollector2() {
        if (!this.message) return;
        const collector = await createMessageComponentCollector(this.message, {
            time: this.options.timeout ?? 120,
            onCollector: async ({ interaction }) => {
                try {
                    if (!interaction.isMessageComponent()) return;
                    if (this.options.interactionFilter && !this.options.interactionFilter(interaction as any)) {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: "Bạn không thể sử dụng cái này.",
                                flags: MessageFlags.Ephemeral
                            });
                        }
                        return;
                    }
                    const data = await this.getPageData(this.page);
                    await this.options.onComponent?.({
                        interaction: interaction as | ButtonInteraction | StringSelectMenuInteraction,
                        pagination: this,
                        page: this.page,
                        totalPages: this.totalPages,
                        data: data
                    } as PaginationComponentContext<T>);
                } catch (error) {
                    this.options.onError?.(error);
                }
            },
            onEnd: ({ reason, message }) => {
                try {
                    if (reason === "time" || reason === "idle") {
                        this.options.onTimeout?.({ message: message });
                    }
                    this.options.onStop?.({ message: message });
                } catch (error) {
                    this.options.onError?.(error);
                }
            },
        });
        return collector;
    }
    /**
     * Chuyển sang một trang cụ thể trong pagination.
     *
     * Method này sẽ:
     *
     * 1. Kiểm tra giới hạn trang (`0 → totalPages - 1`)
     * 2. Lấy dữ liệu trang mới
     * 3. Gọi `renderPage()` để render lại nội dung
     * 4. Cập nhật message với nội dung và components mới
     * 5. Gọi hook `onPageChange` nếu được cấu hình
     *
     * Nếu `interaction` được cung cấp, message sẽ được cập nhật
     * bằng `interaction.update()` thay vì `message.edit()`.
     *
     * @param page Số trang cần chuyển tới (bắt đầu từ `0`)
     * @param interaction Interaction gây ra việc chuyển trang
     *
     * @returns Promise<any>
     *
     * @example
     * ```ts
     * await pagination.goto(2);
     * ```
     *
     * @example Dùng trong action handler
     * ```ts
     * actions: {
     *   next: ({ pagination }) => {
     *     pagination.goto( pagination.page + 1 );
     *   }
     * }
     * ```
     *
     * @example Jump page từ modal
     * ```ts
     * const page = Number(input) - 1;
     * await pagination.goto(page, interaction);
     * ```
     *
     * @remarks
     * - Nếu `page` nhỏ hơn `0` → sẽ tự động đặt thành `0`
     * - Nếu `page` lớn hơn `totalPages` → sẽ đặt thành trang cuối
     * - Method này **không dừng collector**
     */
    public async goto(page: number, interaction?: | ButtonInteraction | StringSelectMenuInteraction) {
        if (page < 0) page = 0;
        if (page >= this.totalPages) page = this.totalPages - 1;
        const oldPage = this.page;
        this.page = page;
        const data = await this.getPageData(page);
        const content = await this.options.renderPage({
            page: page,
            totalPages: this.totalPages,
            data: data,
            pagination: this
        });
        const components = await this.buildComponents(data);
        if (interaction) {
            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                await interaction.update({ ...content, components: components });
            } else { // ModalSubmitInteraction
                await this.message.edit({ ...content, components: components });
            }
            await this.options.onPageChange?.({
                oldPage: oldPage,
                newPage: page,
                interaction: interaction,
                pagination: this
            });
        } else {
            await this.message.edit({ ...content, components: components });
        }
    }
    /**
     * Render lại trang hiện tại.
     *
     * Method này sẽ:
     *
     * 1. Lấy lại dữ liệu của trang hiện tại
     * 2. Gọi `renderPage()`
     * 3. Cập nhật message với nội dung mới
     *
     * Không thay đổi trang hiện tại.
     *
     * @returns Promise<any>
     *
     * @example Refresh dữ liệu
     * ```ts
     * await pagination.reload();
     * ```
     * @remarks
     * - Hữu ích khi dữ liệu trang thay đổi (database, API)
     * - Collector và state pagination vẫn giữ nguyên
     */
    public async reload() {
        const data = await this.getPageData(this.page);
        const content = await this.options.renderPage({
            page: this.page,
            totalPages: this.totalPages,
            data: data,
            pagination: this,
        });
        await this.message.edit({
            ...content,
            components: await this.buildComponents(data),
        });
    }
}