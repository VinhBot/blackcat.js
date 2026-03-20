import type { BaseMessageOptions, ButtonInteraction, ChatInputCommandInteraction, InteractionCollector, StringSelectMenuInteraction } from "discord.js";
import { ModalBuilder, TextInputBuilder, TextInputStyle, Message, LabelBuilder, Collection } from "discord.js";
import {
    createMessageComponentCollector,
    CollectorInteraction,
    ComponentBuilder,
    ComponentInput,
    AnyComponent,
    ButtonInput,
    parseTime,
} from "..";

/**
 * Context được truyền vào khi build components (buttons, select menu)
 * dùng để điều hướng pagination.
 */
type PaginationBuildComponentsContext<T> = {
    /** 
     * Trang hiện tại (bắt đầu từ 1) 
     */
    page: number;
    /** 
     * Tổng số trang 
     */
    totalPages: number;
    /** 
     * Dữ liệu của trang hiện tại 
     */
    data: T;
    /** 
     * Instance của PaginationBuilder
     */
    pagination: PaginationBuilder<T>;

    components: ComponentBuilder<AnyComponent>;
};

/**
 * Context dùng trong renderPage
 */
type PaginationRenderContext<T> = {
    /** 
     * Trang hiện tại 
     * */
    page: number;
    /** 
     * Tổng số trang
     */
    totalPages: number;
    /** 
     * Data của trang hiện tại 
     * */
    data: T;
    /** Instance pagination */
    pagination: PaginationBuilder<T>;
};

/**
 * Context khi người dùng tương tác với component
 */
type PaginationComponentContext<T> = {
    /** 
     * Interaction từ button hoặc select menu 
     * */
    interaction: ButtonInteraction | StringSelectMenuInteraction;
    /** 
     * Instance pagination
     */
    pagination: PaginationBuilder<T>;
    /** 
     * Trang hiện tại 
     */
    page: number;
    /** 
     * Tổng số trang
     */
    totalPages: number;
    /** 
     * Data của trang hiện tại 
     */
    data: T;
};

/**
 * Cấu hình cho PaginationBuilder
 * 
 * @typeParam T Kiểu dữ liệu của mỗi trang
 * 
 * @remarks
 * Pagination hỗ trợ **2 chế độ dữ liệu (data source)**:
 * 
 * ### 1. Dữ liệu tĩnh (`pages`)
 * - Cung cấp toàn bộ dữ liệu ngay từ đầu
 * - Phù hợp với dataset nhỏ
 * 
 * ### 2. Dữ liệu động (`pageLoader`)
 * - Load dữ liệu theo từng trang (lazy loading)
 * - Phù hợp với API / database
 * 
 * ⚠️ **Chỉ nên dùng một trong hai**:
 * - `pages` **hoặc** `pageLoader + totalPages`
 * 
 * @example
 * // Dữ liệu tĩnh
 * const options: PaginationOptions<string> = {
 *   pages: ["A", "B", "C"],
 *   renderPage: ({ data }) => ({ content: data })
 * };
 * 
 * @example
 * // Dữ liệu động
 * const options: PaginationOptions<string[]> = {
 *   totalPages: 5,
 *   pageLoader: async (page) => {
 *     return [`Item ${page}`];
 *   },
 *   renderPage: ({ data }) => ({
 *     content: data.join("\n")
 *   })
 * };
 */
export type PaginationOptions<T> = {
    /**
     * Bật / tắt cơ chế cache dữ liệu page
     * 
     * Tùy chọn này chỉ có hiệu lực khi bạn sử dụng `pageLoader`.
     * Nếu bạn sử dụng `pages` (static data) thì cache sẽ không được dùng.
     * 
     * @defaultValue false
     * 
     * @remarks
     * Khi `useCache = true`, dữ liệu của từng page sẽ được lưu lại sau lần load đầu tiên
     * thông qua `pageLoader`, nhằm tránh việc gọi lại nhiều lần cho cùng một page.
     * 
     * Cơ chế hoạt động:
     * 1. Khi gọi `getPageData(page)`
     * 2. Nếu page đã tồn tại trong `pageCache` → trả về ngay (cache hit)
     * 3. Nếu chưa có → gọi `pageLoader(page)` để lấy dữ liệu (cache miss)
     * 4. Sau đó lưu vào cache (nếu bật `useCache`)
     * 
     * Phù hợp khi:
     * - Dữ liệu load từ API / database (tốn tài nguyên)
     * - Pagination có thể quay lại page cũ nhiều lần
     * - Muốn tối ưu performance và giảm latency
     * 
     * Không nên bật khi:
     * - Dữ liệu thay đổi liên tục (real-time)
     * - Cần luôn fetch dữ liệu mới nhất
     * 
     * @example
     * ```ts
     * const pagination = new PaginationBuilder({
     *   pageLoader: async (page) => {
     *     return fetchData(page); // gọi API
     *   },
     *   useCache: true
     * });
     * 
     * // Lần đầu → gọi API
     * await pagination.getPageData(0);
     * 
     * // Lần sau → dùng cache (không gọi lại API)
     * await pagination.getPageData(0);
     * ```
     * 
     * @example
     * // Tắt cache (luôn gọi lại pageLoader)
     * const pagination = new PaginationBuilder({
     *   pageLoader: async (page) => fetchData(page),
     *   useCache: false
     * });
     * 
     * @see getPageData
     */
    useCache?: boolean;
    /**
     * Danh sách dữ liệu tĩnh cho từng trang
     * 
     * Dùng khi bạn đã có sẵn toàn bộ dữ liệu.
     * Pagination sẽ truy cập trực tiếp từ mảng này.
     * 
     * ⚠️ Không nên dùng nếu dữ liệu lớn (nên dùng pageLoader)
     * 
     * @example
     * pages: ["Page 1", "Page 2", "Page 3"]
     */
    pages?: T[];
    /**
     * Tổng số trang (dùng với pageLoader)
     * 
     * Bắt buộc khi bạn dùng `pageLoader`.
     * 
     * Vì pagination không biết trước số trang nếu load động.
     * 
     * @example
     * totalPages: 10
     */
    totalPages?: number;
    /**
     * Hàm bất đồng bộ dùng để load dữ liệu cho từng trang
     * 
     * @param page Số trang cần load (0-based index)
     * 
     * @returns Promise<T> Dữ liệu tương ứng của trang
     * 
     * @remarks
     * Đây là nguồn dữ liệu động (dynamic data source) cho pagination.
     * 
     * Khi sử dụng `pageLoader`:
     * - Bạn **bắt buộc phải cung cấp `totalPages`**
     * - Dữ liệu sẽ được load theo từng trang khi cần (lazy loading)
     * - Có tích hợp cache nội bộ (trừ khi bị tắt)
     * 
     * Dùng trong các trường hợp:
     * - Dữ liệu lớn (database, API, phân trang server-side)
     * - Không muốn load toàn bộ dữ liệu vào memory
     * - Cần tối ưu performance và bandwidth
     * 
     * ### Cơ chế hoạt động
     * - Khi chuyển trang → `pageLoader(page)` sẽ được gọi
     * - Nếu đã load trước đó → có thể dùng cache (tuỳ cấu hình)
     * - Dữ liệu trả về sẽ được truyền vào `renderPage`
     * 
     * ⚠️ Lưu ý:
     * - `page` là **0-based**, không phải 1-based
     * - Phải đảm bảo luôn trả về đúng kiểu `T`
     * - Không nên throw error trực tiếp → nên handle hoặc dùng `onError`
     * 
     * @example
     * // Dùng với database
     * pageLoader: async (page) => {
     *   return await db.getUsers({
     *     skip: page * 10,
     *     limit: 10
     *   });
     * }
     * 
     * @example
     * // Dùng với REST API
     * totalPages: 5,
     * pageLoader: async (page) => {
     *   const res = await fetch(`/api/items?page=${page + 1}`);
     *   const json = await res.json();
     *   return json.data;
     * }
     * 
     * @example
     * // Ví dụ mock data (test nhanh)
     * totalPages: 5,
     * pageLoader: async (page) => {
     *   await new Promise(r => setTimeout(r, 500)); // giả lập delay
     * 
     *   return Array.from({ length: 5 }, (_, i) => {
     *     return `Item ${page}-${i}`;
     *   });
     * }
     * 
     * @see PaginationOptions.totalPages
     * @see PaginationBuilder.getPageData
     */
    pageLoader?: (page: number) => Promise<T>;
    /**
     * Hàm render nội dung của trang
     * 
     * @param ctx Context render
     * 
     * @returns BaseMessageOptions
     * 
     * Đây là function bắt buộc.
     * 
     * Dùng để:
     * - Tạo content (text, embed,...)
     * - Hiển thị data của trang
     * 
     * @example
     * renderPage: ({ data, page, totalPages }) => ({
     *   content: `Trang ${page + 1}/${totalPages}\n${data}`
     * })
     */
    renderPage: | ((ctx: PaginationRenderContext<T>) => Promise<BaseMessageOptions>) | ((ctx: PaginationRenderContext<T>) => BaseMessageOptions);
    /**
     * Tuỳ chỉnh components (buttons, select menu)
     * 
     * @param ctx Context build components
     * 
     * Dùng khi:
     * - Muốn thêm button riêng
     * - Thêm action custom
     * 
     * @example
     * // Custom thêm button
     * const pagination = new PaginationBuilder<string[]>({
     *   pages: ["Trang 1: Hello", "Trang 2: World", "Trang 3: Pagination"],
     *   renderPage: ({ data }) => ({
     *     content: data
     *   }),
     *   buildComponents: ({ components }) => {
     *     components.addButton([
     *         {
     *            customId: "custom:hello",
     *            label: "Hello",
     *            style: "Success"
     *         }
     *     ]);
     *     return components;
     *   }
     * });
     */
    buildComponents?: (ctx: PaginationBuildComponentsContext<T>) => ComponentBuilder<AnyComponent> | Promise<ComponentBuilder<AnyComponent>>;
    /**
     * Xử lý interaction custom (ngoài navigation mặc định)
     * 
     * @param ctx Context interaction
     * 
     * Dùng khi:
     * - Bạn có button riêng
     * - Cần handle logic riêng
     * 
     * @example
     * onComponent: ({ interaction }) => {
     *   if (interaction.customId === "custom:hello") {
     *     interaction.reply("Hello!");
     *   }
     * }
     */
    onComponent?: (ctx: PaginationComponentContext<T>) => Promise<any> | any;
    /**
     * Callback khi trang thay đổi
     * 
     * 
     * Dùng để:
     * - Log
     * - Analytics
     * - Trigger side effects
     * 
     * @example
     * onPageChange: ({ oldPage, newPage }) => {
     *   console.log(`Từ ${oldPage} -> ${newPage}`);
     * }
     */
    onPageChange?: (ctx: {
        oldPage: number;
        newPage: number;
        interaction: ButtonInteraction | StringSelectMenuInteraction;
        pagination: PaginationBuilder<T>;
    }) => Promise<any> | any;
    /**
     * Filter interaction
     * 
     * 
     * Dùng để:
     * - Chỉ cho phép user cụ thể sử dụng
     * - Chặn người khác
     * 
     * @example
     * interactionFilter: (i) => i.user.id === message.author.id
     * // hoặc
     * interactionFilter: (interaction) => {
     *   if (interaction.user.id !== message.author.id) {
     *      interaction.reply({
     *        content: "❌ Chỉ người dùng lệnh mới có thể sử dụng.",
     *        flags: MessageFlags.Ephemeral
     *       });
     *       return false;
     *    }
     *    return true;
     * },
     */
    interactionFilter?: (interaction: ButtonInteraction | StringSelectMenuInteraction) => boolean;
    /**
     * Cấu hình navigation buttons
     * 
     * Bật/tắt các nút:
     * - first, prev, next, last
     * - jump (modal)
     * - menu (select menu)
     * 
     * @example
     * navigation: {
     *   first: true,
     *   prev: true,
     *   next: true,
     *   last: true,
     *   jump: false,
     *   menu: true
     * }
     */
    navigation?: {
        first?: boolean;
        prev?: boolean;
        next?: boolean;
        last?: boolean;
        jump?: boolean;
        menu?: boolean;
    };
    /**
     * Cấu hình select menu
     * 
     * 
     * Tuỳ chỉnh dropdown chọn trang
     * 
     * @example
     * selectMenu: {
     *   enabled: true,
     *   placeholder: "Chọn trang",
     *   pageLabel: (page) => `Trang ${page + 1}`
     * }
     */
    selectMenu?: {
        enabled?: boolean;
        placeholder?: string;
        pageLabel?: (page: number) => string;
    };
    /**
     * Callback khi pagination bắt đầu
     * 
     * @example
     * onStart: ({ message }) => {
     *   console.log("Started:", message.id);
     * }
     */
    onStart?: (ctx: {
        message: Message;
        pagination: PaginationBuilder<T>;
    }) => any;
    /**
     * Callback khi pagination dừng
     * 
     * @example
     * onStop: () => {
     *   console.log("Stopped");
     * }
     */
    onStop?: (ctx: {
        message: Message;
        pagination: PaginationBuilder<T>;
    }) => any;
    /**
     * Callback khi hết thời gian (timeout)
     * 
     * @example
     * onTimeout: () => {
     *   console.log("Timeout");
     * }
     */
    onTimeout?: (ctx: {
        message: Message;
        pagination: PaginationBuilder<T>;
    }) => any;
    /**
     * Xử lý lỗi toàn cục
     * 
     * @param error Lỗi phát sinh
     * 
     * 
     * Dùng để:
     * - Log lỗi
     * - Tránh crash
     * 
     * @example
     * onError: (err) => {
     *   console.error(err);
     * }
     */
    onError?: (error: unknown) => any;
    /**
     * Thời gian timeout (giây)
     * 
     * @default 120
     * 
     * 
     * Sau thời gian này:
     * - Collector sẽ stop
     * - Trigger onTimeout
     * 
     * @example
     * timeout: 60
     */
    timeout?: number;
};

export class PaginationBuilder<T> {
    private pageCache = new Collection<number, T>();
    private options: PaginationOptions<T>;
    private message!: Message;
    private page = 0;
    private totalPages = 0;
    private pages?: T[];
    private useCache: boolean;
    public state: Record<string, any> = {};
    private collector: InteractionCollector<CollectorInteraction> | null = null;
    /**
     * Khởi tạo một instance PaginationBuilder
     * 
     * @param options Cấu hình pagination
     * 
     * @remarks
     * Constructor này chịu trách nhiệm:
     * - Lưu lại cấu hình (`options`)
     * - Xác định nguồn dữ liệu:
     *   - Nếu có `pages` → dùng dữ liệu tĩnh
     *   - Nếu không → dùng `pageLoader` + `totalPages`
     * - Thiết lập `totalPages` ban đầu
     * 
     * 
     * Có 2 cách sử dụng chính:
     * 
     * ### 1. Dữ liệu tĩnh (pages)
     * Khi bạn đã có sẵn toàn bộ dữ liệu:
     * - `pages` sẽ được ưu tiên
     * - `totalPages` được tính tự động từ `pages.length`
     * 
     * ### 2. Dữ liệu động (pageLoader)
     * Khi dữ liệu đến từ API / database:
     * - Phải cung cấp `totalPages`
     * - `pageLoader` sẽ được gọi khi cần load trang
     * 
     * ⚠️ Nếu không cung cấp `pages` và cũng không có `pageLoader`
     * thì hệ thống sẽ không có nguồn dữ liệu và sẽ throw error khi chạy.
     * 
     * @example
     * // Dùng dữ liệu tĩnh
     * const pagination = new PaginationBuilder<string>({
     *   pages: ["Trang 1", "Trang 2", "Trang 3"],
     *   renderPage: ({ data }) => ({ content: data })
     * });
     * 
     * @example
     * // Dùng dữ liệu động (API)
     * const pagination = new PaginationBuilder<string[]>({
     *   totalPages: 10,
     *   pageLoader: async (page) => {
     *     const res = await fetch(`/api?page=${page + 1}`);
     *     const json = await res.json();
     *     return json.data;
     *   },
     *   renderPage: ({ data }) => ({
     *     content: data.join("\n")
     *   })
     * });
     * 
     * @example
     * // Dùng database (Prisma)
     * const pagination = new PaginationBuilder<User[]>({
     *   totalPages: 20,
     *   pageLoader: async (page) => {
     *     return prisma.user.findMany({
     *       skip: page * 10,
     *       take: 10
     *     });
     *   },
     *   renderPage: ({ data }) => ({
     *     content: data.map(u => u.username).join("\n")
     *   })
     * });
     */
    constructor(options: PaginationOptions<T>) {
        this.options = options;
        this.pages = options.pages;
        this.useCache = options.useCache ?? false;
        if (this.pages) {
            this.totalPages = this.pages.length;
        } else if (options.totalPages) {
            this.totalPages = options.totalPages;
        }
    }
    /**
     * Khởi động hệ thống pagination và gửi message ban đầu
     * 
     * @param source Message hoặc ChatInputCommandInteraction dùng để reply
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Đây là method entry point (điểm bắt đầu) của toàn bộ PaginationBuilder.
     * 
     * Khi gọi method này, hệ thống sẽ:
     * 1. Lấy dữ liệu của trang đầu tiên (`page = 0`)
     * 2. Gọi `renderPage` để tạo nội dung message
     * 3. Build components (buttons, select menu,...)
     * 4. Gửi message (reply)
     * 5. Tạo `InteractionCollector` để lắng nghe interaction
     * 6. Gọi hook `onStart` (nếu có)
     * 
     * 
     * Method này phải được gọi sau khi bạn đã cấu hình đầy đủ:
     * - `renderPage` (bắt buộc)
     * - `pages` hoặc `pageLoader`
     * 
     * Nó hỗ trợ 2 nguồn gọi:
     * - `Message`: dùng trong message command
     * - `ChatInputCommandInteraction`: dùng trong slash command
     * 
     * ⚠️ Sau khi gọi `start`, pagination sẽ bắt đầu hoạt động
     * và người dùng có thể tương tác ngay lập tức.
     * 
     * @example
     * // Dùng với message command
     * await pagination.start(message);
     * 
     * @example
     * // Dùng với slash command
     * await pagination.start(interaction);
     * 
     * @example
     * // Ví dụ đầy đủ
     * const pagination = new PaginationBuilder<string[]>({
     *   totalPages: 5,
     *   pageLoader: async (page) => {
     *     return Array.from({ length: 5 }, (_, i) => `Item ${page}-${i}`);
     *   },
     *   renderPage: ({ data, page, totalPages }) => ({
     *     content: `Trang ${page + 1}/${totalPages}\n\n` + data.join("\n")
     *   }),
     *   onStart: ({ message }) => {
     *     console.log("Pagination started:", message.id);
     *   }
     * });
     * 
     * await pagination.start(interaction);
     * 
     * @throws {Error}
     * Có thể throw nếu:
     * - Không có data source (`pages` hoặc `pageLoader`)
     * - `renderPage` bị lỗi
     * - Gửi message thất bại
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
        this.options.onStart?.({
            message: this.message,
            pagination: this,
        });
    }
    /**
     * Lấy dữ liệu của một trang cụ thể
     * 
     * 
     * @param page Số trang (0-based index)
     * 
     * @returns Promise<T> Dữ liệu tương ứng với trang
     * 
     * @remarks
     * Đây là method core chịu trách nhiệm truy xuất dữ liệu cho pagination.
     * 
     * Method này hỗ trợ 2 nguồn dữ liệu:
     * - `pages`: dữ liệu tĩnh (array có sẵn)
     * - `pageLoader`: dữ liệu động (load theo từng page)
     * 
     * Đồng thời tích hợp cơ chế cache (nếu `useCache = true`) để tối ưu hiệu năng.
     * Luồng xử lý:
     * 
     * ### 1. Dữ liệu tĩnh (`pages`)
     * - Kiểm tra phạm vi `page`
     * - Trả về trực tiếp `pages[page]`
     * 
     * ### 2. Dữ liệu động (`pageLoader`)
     * - Nếu `useCache = true` và đã có cache → trả về cache (cache hit)
     * - Nếu chưa có → gọi `pageLoader(page)` (cache miss)
     * - Sau khi load xong:
     *   - Lưu vào cache (nếu bật cache)
     *   - Trả về dữ liệu
     * 
     * ### 3. Không có data source
     * - Throw error
     * 
     * ⚠️ Cache sử dụng `Collection<number, T>` với key là index của page.
     * 
     * @example
     * // Sử dụng dữ liệu tĩnh
     * const pagination = new PaginationBuilder<string>({
     *   pages: ["A", "B", "C"],
     *   renderPage: ({ data }) => ({ content: data })
     * });
     * 
     * await pagination.getPageData(1); // "B"
     * 
     * @example
     * // Sử dụng dữ liệu động + cache
     * const pagination = new PaginationBuilder<string[]>({
     *   totalPages: 5,
     *   useCache: true,
     *   pageLoader: async (page) => {
     *     console.log("Loading page:", page);
     *     return [`Item ${page}`];
     *   },
     *   renderPage: ({ data }) => ({
     *     content: data.join("\n")
     *   })
     * });
     * 
     * await pagination.getPageData(0); // gọi pageLoader
     * await pagination.getPageData(0); // dùng cache
     * 
     * @throws {Error}
     * - `"Trang nằm ngoài phạm vi cho phép."` nếu `page` không hợp lệ khi dùng `pages`
     * - `"Không có nguồn dữ liệu."` nếu không có cả `pages` và `pageLoader`
     */
    public async getPageData(page: number): Promise<T> {
        if (this.pages) {
            if (page < 0 || page >= this.pages.length) {
                throw new Error("Trang nằm ngoài phạm vi cho phép.");
            }
            return this.pages[page];
        }
        if (this.options.pageLoader) {
            if (this.useCache && this.pageCache.has(page)) {
                return this.pageCache.get(page)!;
            }
            const data = await this.options.pageLoader(page);
            if (this.useCache && !this.pageCache.has(page)) {
                this.pageCache.set(page, data);
            }
            return data;
        }
        throw new Error("Không có nguồn dữ liệu.");
    }
    /**
     * Xây dựng danh sách components (buttons, select menu) cho trang hiện tại
     * @hidden  
     */
    private async buildComponents(data: T) {
        const { navigation = {}, selectMenu } = this.options;
        const config = {
            first: true,
            prev: true,
            next: true,
            last: true,
            jump: true,
            menu: true,
            ...navigation
        };

        const isFirstPage = this.page === 0;
        const isLastPage = this.page === this.totalPages - 1;

        const buttonMap: Record<string, ButtonInput> = {
            first: {
                customId: "pagination:first",
                label: "<<",
                style: "Secondary",
                disabled: isFirstPage
            },
            prev: {
                customId: "pagination:prev",
                label: "<",
                style: "Secondary",
                disabled: isFirstPage
            },
            next: {
                customId: "pagination:next",
                label: ">",
                style: "Secondary",
                disabled: isLastPage
            },
            last: {
                customId: "pagination:last",
                label: ">>",
                style: "Secondary",
                disabled: isLastPage
            },
            jump: {
                customId: "pagination:jump",
                label: "Nhảy trang",
                style: "Primary"
            }
        };

        const schemas: ComponentInput[] = [
            {
                type: "button",
                options: Object.entries(buttonMap).filter(([key]) => config[key as keyof typeof config]).map(([, value]) => value),
            }
        ];

        if (config.menu) {
            schemas.push({
                type: "stringmenu",
                options: {
                    customId: "pagination:select",
                    placeholder: selectMenu?.placeholder ?? "Nhảy đến trang",
                    options: Array.from({ length: this.totalPages }, (_, i) => ({
                        label: selectMenu?.pageLabel ? selectMenu.pageLabel(i) : `Trang ${i + 1}`,
                        value: String(i),
                        default: i === this.page
                    }))
                }
            });
        }

        const componentBuilder = new ComponentBuilder(schemas);

        if (this.options.buildComponents) {
            this.options.buildComponents({
                page: this.page,
                totalPages: this.totalPages,
                data: data,
                pagination: this,
                components: componentBuilder,
            });
        }

        return componentBuilder.build();
    }
    /**
     * Khởi tạo InteractionCollector để xử lý button và select menu interactions.
     * @hidden
     */
    private async createCollector() {
        this.collector = await createMessageComponentCollector(this.message, {
            time: this.options.timeout ?? 120,
            onCollector: async ({ interaction, customId }) => {
                try {
                    if (this.options.interactionFilter && !this.options.interactionFilter(interaction as any)) return;
                    if (customId === "pagination:jump") {
                        const modal = new ModalBuilder({
                            customId: "pagination:jumpModal",
                            title: "Nhảy đến trang",
                        });
                        modal.addLabelComponents(
                            new LabelBuilder()
                                .setLabel("Nhập số trang")
                                .setDescription("Nhập số trang bạn muốn chuyển đến")
                                .setTextInputComponent(new TextInputBuilder({ customId: "page", style: TextInputStyle.Short, required: true }))
                        );
                        await interaction.showModal(modal);
                        try {
                            const submit = await interaction.awaitModalSubmit({
                                time: parseTime("60s"),
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
                        if (customId === "pagination:first") return this.first(interaction);
                        if (customId === "pagination:prev") return this.prev(interaction);
                        if (customId === "pagination:next") return this.next(interaction);
                        if (customId === "pagination:last") return this.last(interaction);
                    } else if (interaction.isStringSelectMenu()) {
                        if (customId === "pagination:select") return this.goto(Number(interaction.values[0]), interaction);
                    }
                    // custom 
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
            onEnd: (ctx) => {
                if (ctx.reason === "time") {
                    this.options.onTimeout?.({
                        message: ctx.message,
                        pagination: this
                    });
                }
                this.options.onStop?.({
                    message: ctx.message,
                    pagination: this
                });
            }
        });
    }
    /**
     * Chuyển đến một trang cụ thể và cập nhật message
     * 
     * @param page Số trang cần chuyển đến (0-based)
     * @param interaction Interaction (button hoặc select menu) nếu có
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Đây là method trung tâm (core) của hệ thống pagination.
     * 
     * Hầu hết các hành động điều hướng như:
     * - `next()`
     * - `prev()`
     * - `first()`
     * - `last()`
     * - select menu
     * 
     * đều gọi vào method này.
     * 
     * 
     * Quy trình hoạt động:
     * 
     * ### 1. Chuẩn hoá page (boundary check)
     * - Nếu `page < 0` → set về `0`
     * - Nếu `page >= totalPages` → set về `totalPages - 1`
     * 
     * ### 2. Cập nhật state
     * - Lưu lại `oldPage`
     * - Gán `this.page = page`
     * 
     * ### 3. Lấy dữ liệu trang mới
     * - Gọi `getPageData(page)`
     * 
     * ### 4. Render lại nội dung
     * - Gọi `renderPage`
     * - Build lại components
     * 
     * ### 5. Update message
     * - Nếu có `interaction` → dùng `interaction.update()`
     * - Nếu không → dùng `message.edit()`
     * 
     * ### 6. Trigger hook
     * - Gọi `onPageChange` (nếu có)
     * 
     * ⚠️ Method này không tạo collector mới, chỉ update UI.
     * 
     * @example
     * // Chuyển đến trang 2
     * await pagination.goto(2);
     * 
     * @example
     * // Dùng trong custom button
     * onComponent: async ({ interaction, pagination }) => {
     *   if (interaction.customId === "go:page5") {
     *     await pagination.goto(4, interaction);
     *   }
     * }
     * 
     * @example
     * // Gọi từ nội bộ (next/prev)
     * await pagination.next(); // thực chất gọi goto(this.page + 1)
     * 
     * @example
     * // Boundary handling
     * await pagination.goto(-10); // => page = 0
     * await pagination.goto(999); // => page = last
     * 
     * @throws {Error}
     * Có thể throw nếu:
     * - `getPageData` thất bại (API lỗi, out of bounds,...)
     * - `renderPage` lỗi
     * - Discord API update message thất bại
     * 
     * @see PaginationBuilder.next
     * @see PaginationBuilder.prev
     * @see PaginationBuilder.first
     * @see PaginationBuilder.last
     * @see PaginationOptions.onPageChange
     */
    public async goto(page: number, interaction?: | ButtonInteraction | StringSelectMenuInteraction) {
        if (page < 0) page = 0;
        if (page >= this.totalPages) page = this.totalPages - 1;

        const oldPage = this.page;
        this.page = page;

        const data = await this.getPageData(page);
        const content = await this.options.renderPage({
            page,
            totalPages: this.totalPages,
            data,
            pagination: this
        });

        const components = await this.buildComponents(data);
        if (interaction) {
            await interaction.update({ ...content, components });
            await this.options.onPageChange?.({
                oldPage: oldPage,
                newPage: page,
                interaction,
                pagination: this
            });
        } else {
            await this.message.edit({ ...content, components });
        }
    }
    /**
     * Cập nhật lại toàn bộ components (buttons, select menu) của message hiện tại
     * mà không thay đổi nội dung (content/embed)
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Đây là method dùng để **refresh UI** mà không re-render nội dung trang.
     * 
     * Nó sẽ:
     * - Lấy lại data của trang hiện tại
     * - Build lại components (buttons, select menu)
     * - Gọi `message.edit()` chỉ với phần `components`
     * 
     * 
     * Dùng khi:
     * - Trạng thái button thay đổi (disable/enable)
     * - Custom component cần update (label, style,...)
     * - State nội bộ (`pagination.state`) ảnh hưởng đến UI
     * 
     * ⚠️ Không gọi `renderPage`, nên:
     * - Content sẽ giữ nguyên
     * - Chỉ thay đổi phần interactive components
     * 
     * @example
     * // Refresh lại button sau khi thay đổi state
     * pagination.state.isLocked = true;
     * await pagination.refreshComponents();
     * 
     * @example
     * // Update label button động
     * buildComponents: ({ components, pagination }) => {
     *   components.addButton([
     *      {
     *         customId: "toggle",
     *         label: pagination.state.enabled ? "ON" : "OFF",
     *         style: "Primary"
     *       }
     *   ]);
     * }
     * 
     * // Sau khi toggle state
     * pagination.state.enabled = !pagination.state.enabled;
     * await pagination.refreshComponents();
     * 
     * @example
     * // Disable toàn bộ button theo điều kiện
     * if (someCondition) {
     *   pagination.state.disabled = true;
     *   await pagination.refreshComponents();
     * }
     * 
     * @throws {Error}
     * Có thể throw nếu:
     * - `getPageData` thất bại
     * - `buildComponents` lỗi
     * - Discord API `message.edit` thất bại
     */
    public async refreshComponents() {
        const data = await this.getPageData(this.page);
        await this.message.edit({
            components: await this.buildComponents(data),
        });
    }
    /**
     * Cập nhật lại toàn bộ danh sách pages (dữ liệu tĩnh) và render lại pagination
     * 
     * @param pages Mảng dữ liệu mới cho từng trang
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Method này dùng để thay thế hoàn toàn dữ liệu hiện tại (`pages`)
     * và đồng bộ lại toàn bộ trạng thái pagination.
     * 
     * Nó sẽ:
     * - Xóa cache hiện tại (`clearCache`)
     * - Gán lại `pages`
     * - Cập nhật `totalPages`
     * - Điều chỉnh lại `page` nếu vượt giới hạn
     * - Gọi `reload()` để render lại message
     * 
     * 
     * Dùng khi:
     * - Dữ liệu thay đổi hoàn toàn (refetch, filter, search,...)
     * - Chuyển từ dataset cũ sang dataset mới
     * - Muốn reset pagination theo data mới
     * 
     * ⚠️ Method này chỉ áp dụng cho mode `pages` (data tĩnh).
     * Nếu bạn đang dùng `pageLoader`, nên xử lý logic ở backend hoặc dùng `state` + `reload`.
     * 
     * ### Hành vi đặc biệt
     * - Nếu `page hiện tại >= totalPages mới`
     *   → tự động set về trang cuối (`totalPages - 1`)
     * 
     * @example
     * // Cập nhật dữ liệu mới
     * await pagination.updatePages(["A", "B", "C"]);
     * 
     * @example
     * // Sau khi filter dữ liệu
     * const filtered = allItems.filter(i => i.includes("test"));
     * await pagination.updatePages(filtered);
     * 
     * @example
     * // Reset data khi search
     * pagination.state.keyword = "discord";
     * const result = await fetchSearchData();
     * await pagination.updatePages(result);
     * 
     * @example
     * // Khi data giảm số lượng trang
     * // page hiện tại = 5
     * // pages mới chỉ có 2 trang
     * await pagination.updatePages(["A", "B"]);
     * // => page sẽ tự động về 1 (trang cuối)
     * 
     * @throws {Error}
     * Có thể throw nếu:
     * - `reload()` thất bại (renderPage lỗi, Discord API lỗi,...)
     * 
     * @see PaginationBuilder.reload
     * @see PaginationBuilder.clearCache
     */
    public async updatePages(pages: T[]) {
        this.clearCache();
        this.pages = pages;
        this.totalPages = pages.length;
        if (this.page >= this.totalPages) {
            this.page = this.totalPages - 1;
        }
        await this.reload();
    }
    /**
     * Dừng pagination và vô hiệu hóa toàn bộ interaction
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Method này dùng để kết thúc vòng đời của pagination.
     * 
     * Nó sẽ:
     * - Dừng `InteractionCollector` (ngừng nhận interaction)
     * - Xóa toàn bộ components khỏi message (disable UI)
     * - Gọi hook `onStop` (nếu có)
     * 
     * 
     * Dùng khi:
     * - Không muốn người dùng tiếp tục tương tác
     * - Command đã hoàn tất
     * - Cleanup tài nguyên (collector, UI)
     * 
     * ⚠️ Sau khi gọi `stop()`:
     * - Người dùng không thể click button/select menu nữa
     * - Pagination được coi là "đã kết thúc"
     * 
     * ### Hành vi lỗi
     * - Nếu `message.edit` thất bại → sẽ được catch và chuyển sang `onError`
     * - Không throw ra ngoài (fail-safe)
     * 
     * @example
     * // Dừng pagination thủ công
     * await pagination.stop();
     * 
     * @example
     * // Dừng sau một hành động custom
     * onComponent: async ({ interaction, pagination }) => {
     *   if (interaction.customId === "confirm") {
     *     await interaction.reply("Đã xác nhận!");
     *     await pagination.stop();
     *   }
     * }
     * 
     * @example
     * // Auto stop sau timeout custom
     * setTimeout(() => {
     *   pagination.stop();
     * }, 30000);
     * 
     * @example
     * // Hook onStop
     * const pagination = new PaginationBuilder({
     *   ...options,
     *   onStop: ({ message }) => {
     *     console.log("Pagination stopped:", message.id);
     *   }
     * });
     * 
     * @throws {never}
     * Method này không throw lỗi ra ngoài.
     * Mọi lỗi sẽ được chuyển vào `onError`.
     * 
     * @see PaginationOptions.onStop
     * @see PaginationOptions.onError
     */
    public async stop() {
        if (this.collector) this.collector.stop();
        try {
            if (!this.message) return;
            await this.message.edit({ components: [] });
            this.options.onStop?.({
                message: this.message,
                pagination: this,
            });
        } catch (error) {
            this.options.onError?.(error);
        }
    }
    /**
     * Kiểm tra trạng thái hoạt động của pagination
     * 
     * @returns boolean `true` nếu pagination đang chạy, ngược lại `false`
     * 
     * @remarks
     * Method này dùng để xác định xem `InteractionCollector`
     * của pagination còn hoạt động hay không.
     * 
     * Điều kiện để trả về `true`:
     * - `collector` đã được khởi tạo
     * - `collector` chưa bị kết thúc (`ended = false`)
     * 
     * 
     * Dùng khi:
     * - Cần kiểm tra trước khi thực hiện hành động (update, stop,...)
     * - Tránh gọi method khi pagination đã dừng
     * - Debug trạng thái runtime
     * 
     * ⚠️ Method này không đảm bảo message còn tồn tại,
     * chỉ kiểm tra trạng thái collector.
     * 
     * @example
     * if (pagination.isRunning()) {
     *   console.log("Pagination đang hoạt động");
     * }
     * 
     * @example
     * // Tránh stop nhiều lần
     * if (pagination.isRunning()) {
     *   await pagination.stop();
     * }
     * 
     * @example
     * // Debug
     * console.log("Running:", pagination.isRunning());
     *
     * @see PaginationBuilder.stop
     */
    public isRunning() {
        return !!this.collector && !this.collector.ended;
    }
    /**
     * Lấy số trang hiện tại
     * 
     * @returns number Trang hiện tại (0-based)
     * 
     * @remarks
     * Method này trả về index của trang hiện tại trong pagination.
     * 
     * ⚠️ Giá trị trả về là **0-based**:
     * - Trang đầu = 0
     * - Trang thứ 2 = 1
     * 
     * 
     * Dùng khi:
     * - Hiển thị thông tin trang
     * - Logic điều kiện theo trang
     * - Debug trạng thái pagination
     * 
     * @example
     * const page = pagination.getPage();
     * console.log(`Trang hiện tại: ${page + 1}`);
     * 
     * @example
     * // Kiểm tra có phải trang đầu không
     * if (pagination.getPage() === 0) {
     *   console.log("Đang ở trang đầu");
     * }
     * 
     * @see PaginationBuilder.getTotalPages
     */
    public getPage() {
        return this.page;
    }
    /**
     * Lấy tổng số trang
     * 
     * @returns number Tổng số trang
     * 
     * @remarks
     * Giá trị này được xác định từ:
     * - `pages.length` (nếu dùng dữ liệu tĩnh)
     * - `options.totalPages` (nếu dùng pageLoader)
     * 
     * 
     * Dùng khi:
     * - Hiển thị UI (Trang X/Y)
     * - Kiểm tra giới hạn pagination
     * - Logic điều hướng
     * 
     * @example
     * const total = pagination.getTotalPages();
     * console.log(`Tổng số trang: ${total}`);
     * 
     * @example
     * // Kiểm tra trang cuối
     * if (pagination.getPage() === pagination.getTotalPages() - 1) {
     *   console.log("Đang ở trang cuối");
     * }
     * 
     * @see PaginationBuilder.getPage
     */
    public getTotalPages() {
        return this.totalPages;
    }
    /**
     * Lấy message hiện tại của pagination
     * 
     * @returns Message Message Discord đã được gửi
     * 
     * @remarks
     * Đây là message được tạo ra khi gọi `start()`.
     * 
     * ⚠️ Method này chỉ hợp lệ sau khi đã gọi `start()`.
     * Nếu gọi trước đó có thể trả về `undefined` hoặc gây lỗi.
     * 
     * 
     * Dùng khi:
     * - Cần thao tác trực tiếp với message
     * - Edit message ngoài pagination
     * - Lấy message ID
     * 
     * @example
     * const msg = pagination.getMessage();
     * console.log(msg.id);
     * 
     * @example
     * // Edit message thủ công
     * const msg = pagination.getMessage();
     * await msg.edit({ content: "Updated!" });
     * 
     * @example
     * // React vào message
     * const msg = pagination.getMessage();
     * await msg.react("👍");
     * 
     * @throws {Error}
     * Có thể xảy ra lỗi nếu message chưa được khởi tạo (chưa gọi start)
     * 
     * @see PaginationBuilder.start
     */
    public getMessage() {
        return this.message;
    }
    /**
     * Chuyển sang trang tiếp theo
     * 
     * @param interaction Interaction (button hoặc select menu) nếu có
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Đây là method helper, thực chất gọi:
     * `goto(this.page + 1)`
     * 
     * 
     * Dùng khi:
     * - Xử lý nút "Next"
     * - Điều hướng tiến lên 1 trang
     * 
     * ⚠️ Nếu đang ở trang cuối:
     * - Sẽ tự động giữ nguyên (do `goto` clamp boundary)
     * 
     * @example
     * await pagination.next();
     * 
     * @example
     * // Dùng trong custom button
     * onComponent: async ({ interaction, pagination }) => {
     *   if (interaction.customId === "next") {
     *     await pagination.next(interaction);
     *   }
     * }
     * 
     * @see PaginationBuilder.goto
     */
    public async next(interaction?: ButtonInteraction | StringSelectMenuInteraction) {
        return this.goto(this.page + 1, interaction);
    }
    /**
     * Quay lại trang trước
     * 
     * @param interaction Interaction (button hoặc select menu) nếu có
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Đây là method helper, thực chất gọi:
     * `goto(this.page - 1)`
     * 
     * 
     * Dùng khi:
     * - Xử lý nút "Previous"
     * - Điều hướng lùi 1 trang
     * 
     * ⚠️ Nếu đang ở trang đầu:
     * - Sẽ tự động giữ nguyên (do `goto` clamp boundary)
     * 
     * @example
     * await pagination.prev();
     * 
     * @example
     * // Dùng trong custom button
     * onComponent: async ({ interaction, pagination }) => {
     *   if (interaction.customId === "prev") {
     *     await pagination.prev(interaction);
     *   }
     * }
     * 
     * @see PaginationBuilder.goto
     */
    public async prev(interaction?: ButtonInteraction | StringSelectMenuInteraction) {
        return this.goto(this.page - 1, interaction);
    }
    /**
     * Chuyển đến trang đầu tiên
     * 
     * @param interaction Interaction (button hoặc select menu) nếu có
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Đây là method helper, thực chất gọi:
     * `goto(0)`
     * 
     * 
     * Dùng khi:
     * - Xử lý nút "First"
     * - Reset pagination về trang đầu
     * 
     * @example
     * await pagination.first();
     * 
     * @example
     * // Reset về trang đầu sau khi filter
     * await pagination.first();
     * 
     * @see PaginationBuilder.goto
     */
    public async first(interaction?: ButtonInteraction | StringSelectMenuInteraction) {
        return this.goto(0, interaction);
    }
    /**
     * Chuyển đến trang cuối cùng
     * 
     * @param interaction Interaction (button hoặc select menu) nếu có
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Đây là method helper, thực chất gọi:
     * `goto(this.totalPages - 1)`
     * 
     * 
     * Dùng khi:
     * - Xử lý nút "Last"
     * - Nhảy nhanh đến trang cuối
     * 
     * @example
     * await pagination.last();
     * 
     * @example
     * // Jump đến trang cuối sau khi load data
     * await pagination.last();
     * 
     * @see PaginationBuilder.goto
     */
    public async last(interaction?: ButtonInteraction | StringSelectMenuInteraction) {
        return this.goto(this.totalPages - 1, interaction);
    }
    /**
     * Xóa toàn bộ cache của pagination
     * 
     * @returns void
     * 
     * @remarks
     * Method này sẽ xóa toàn bộ dữ liệu đã cache trong `pageCache`.
     * 
     * Cache được sử dụng khi:
     * - Dùng `pageLoader`
     * - Tránh gọi lại API nhiều lần cho cùng một page
     * 
     * 
     * Dùng khi:
     * - Dữ liệu backend thay đổi
     * - Muốn force reload data mới
     * - Debug hoặc reset state
     * 
     * ⚠️ Sau khi gọi:
     * - Các lần `getPageData` tiếp theo sẽ gọi lại `pageLoader`
     * 
     * @example
     * // Force reload data từ API
     * pagination.clearCache();
     * await pagination.reload();
     * 
     * @example
     * // Sau khi update database
     * await updateUser();
     * pagination.clearCache();
     * 
     * @see PaginationBuilder.getPageData
     */
    public clearCache() {
        this.pageCache.clear();
    }
    /**
     * Lấy context hiện tại của pagination
     * 
     * @returns Promise<PaginationRenderContext<T>>
     * 
     * @remarks
     * Method này trả về object context giống như khi gọi `renderPage`.
     * 
     * Bao gồm:
     * - `page`: trang hiện tại
     * - `totalPages`: tổng số trang
     * - `data`: dữ liệu trang hiện tại
     * - `pagination`: instance hiện tại
     * 
     * 
     * Dùng khi:
     * - Cần lấy data + metadata hiện tại
     * - Viết logic custom ngoài pagination
     * - Debug trạng thái runtime
     * 
     * @example
     * const ctx = await pagination.getContext();
     * console.log(ctx.page, ctx.data);
     * 
     * @example
     * // Dùng trong custom logic
     * const { data } = await pagination.getContext();
     * console.log("Current data:", data);
     * 
     * @throws {Error}
     * Có thể throw nếu:
     * - `getPageData` thất bại
     * 
     * @see PaginationRenderContext
     */
    public async getContext(): Promise<PaginationRenderContext<T>> {
        const data = await this.getPageData(this.page);
        return {
            page: this.page,
            totalPages: this.totalPages,
            data: data,
            pagination: this
        };
    }
    /**
     * Render lại toàn bộ message (content + components) của trang hiện tại
     * 
     * @returns Promise<void>
     * 
     * @remarks
     * Đây là method dùng để "re-render" pagination mà không thay đổi page.
     * 
     * Nó sẽ:
     * - Lấy lại data của trang hiện tại
     * - Gọi `renderPage` để tạo content mới
     * - Build lại components
     * - Edit message
     * 
     * 
     * Dùng khi:
     * - Data thay đổi nhưng vẫn ở cùng page
     * - Cần cập nhật UI + nội dung
     * - Sau khi gọi `clearCache`
     * 
     * ⚠️ Khác với `refreshComponents()`:
     * - `reload()` → update cả content + components
     * - `refreshComponents()` → chỉ update components
     * 
     * @example
     * // Reload sau khi clear cache
     * pagination.clearCache();
     * await pagination.reload();
     * 
     * @example
     * // Update data động
     * pagination.state.keyword = "discord";
     * await pagination.reload();
     * 
     * @example
     * // Refresh nội dung sau khi backend thay đổi
     * await updateDatabase();
     * await pagination.reload();
     * 
     * @throws {Error}
     * Có thể throw nếu:
     * - `getPageData` thất bại
     * - `renderPage` lỗi
     * - Discord API `message.edit` thất bại
     * 
     * @see PaginationBuilder.refreshComponents
     * @see PaginationBuilder.getPageData
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
