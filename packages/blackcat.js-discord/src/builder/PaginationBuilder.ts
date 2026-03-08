import { Message, ChatInputCommandInteraction, MessageCreateOptions, MessageFlags } from "discord.js";
import { ComponentBuilder } from "./ComponentBuilder";

type PaginationSource = | Message | ChatInputCommandInteraction;

/**
 * Cấu hình cho hệ thống Pagination
 */
type PaginationOptions<T> = {
    /**
     * Nguồn gửi message
     * - `Message` (prefix command)
     * - `ChatInputCommandInteraction` (slash command)
     */
    source: PaginationSource;
    /**
     * Danh sách dữ liệu của các trang
     */
    pages: readonly T[];
    /**
     * ID user được phép sử dụng pagination
     * Nếu không đặt → mọi user đều dùng được
     */
    userId?: string;
    /**
     * Thời gian collector (ms)
     * @default 60000
     */
    time?: number;
    /**
     * Hàm render nội dung mỗi trang
     *
     * @param page dữ liệu trang hiện tại
     * @param index index của trang
     * @param total tổng số trang
     */
    render: (page: T, index: number, total: number) => MessageCreateOptions;
};
/**
 * Hệ thống **Pagination (phân trang)** cho Discord message.
 *
 * Class này tạo sẵn:
 * - Button điều hướng trang (`first`, `prev`, `next`, `last`)
 * - Select menu để nhảy tới trang bất kỳ
 * - Collector tự xử lý interaction
 * - Tự disable components khi collector kết thúc
 *
 * Hỗ trợ cả:
 * - **Prefix Command** (`Message`)
 * - **Slash Command** (`ChatInputCommandInteraction`)
 *
 * @template T Kiểu dữ liệu của mỗi trang
 *
 * @example
 * ```ts
 * const pagination = new Pagination({
 *   source: message,
 *   userId: message.author.id,
 *   pages: Array.from({ length: 5 }, (_, i) => i + 1),
 *
 *   render: (page, index, total) => ({
 *     embeds: [
 *       new EmbedBuilder()
 *         .setTitle(`Page ${page}`)
 *         .setDescription(`Trang ${index + 1}/${total}`)
 *     ]
 *   })
 * });
 *
 * await pagination.start();
 * ```
 *
 * @example
 * // Slash command
 * const pagination = new Pagination({
 *   source: interaction,
 *   userId: interaction.user.id,
 *   pages: data,
 *
 *   render: (page, index, total) => ({
 *     content: `Trang ${index + 1}/${total}`,
 *     embeds: [buildEmbed(page)]
 *   })
 * });
 *
 * await pagination.start();
 * 
 * @remarks
 * - Mỗi lần chuyển trang sẽ gọi lại `render()`
 * - Button sẽ tự disable khi ở trang đầu hoặc cuối
 * - Khi collector kết thúc, tất cả components sẽ bị disable
 */
export class PaginationBuilder<T> {
    private page = 0;
    private options: PaginationOptions<T>;
    constructor(options: PaginationOptions<T>) {
        this.options = options;
    }
    /**
     * Tạo button + select menu cho pagination
     * disabled = true khi collector kết thúc
     */
    private buildComponents(disabled = false) {
        const total = this.options.pages.length;
        const last = total - 1;
        return new ComponentBuilder([
            {
                type: "button",
                options: [
                    {
                        customId: "first",
                        emoji: "⏮",
                        style: "Secondary",
                        disabled: disabled || this.page === 0
                    },
                    {
                        customId: "prev",
                        emoji: "◀",
                        style: "Primary",
                        disabled: disabled || this.page === 0
                    },
                    {
                        customId: "next",
                        emoji: "▶",
                        style: "Primary",
                        disabled: disabled || this.page === last
                    },
                    {
                        customId: "last",
                        emoji: "⏭",
                        style: "Secondary",
                        disabled: disabled || this.page === last
                    }
                ]
            },
            {
                type: "select",
                options: {
                    customId: "jump",
                    placeholder: `Trang ${this.page + 1}/${total}`,
                    minValues: 1,
                    maxValues: 1,
                    disabled,
                    options: this.options.pages.map((_, i) => ({
                        label: `Trang ${i + 1}`,
                        value: String(i),
                        default: i === this.page
                    }))
                }
            }
        ] as const);
    }
    /**
     * Lấy **index của trang hiện tại**.
     *
     * ⚠ Lưu ý:
     * - Giá trị bắt đầu từ `0`
     * - Số trang hiển thị cho user thường là `currentPage + 1`
     *
     * @example
     * console.log(pagination.currentPage); // 0
     * console.log(pagination.currentPage + 1); // Trang 1
     */
    public get currentPage() {
        return this.page;
    }
    /**
     * Render nội dung trang hiện tại
     */
    private render(): MessageCreateOptions {
        return this.options.render(this.options.pages[this.page], this.page, this.options.pages.length);
    }
    /**
     * Khởi chạy hệ thống pagination.
     *
     * Quy trình:
     * 1. Gửi message trang đầu
     * 2. Tạo collector cho button / select menu
     * 3. Cập nhật message khi user chuyển trang
     * 4. Disable components khi collector kết thúc
     *
     * @returns Promise<void>
     */
    public async start(): Promise<void> {
        const builder = this.buildComponents();
        const data = this.render();
        let message: Message;
        if (this.options.source instanceof Message) {
            message = await this.options.source.reply({
                ...data,
                components: builder.components()
            });
        } else {
            const response = await this.options.source.reply({
                ...data,
                components: builder.components(),
                flags: MessageFlags.Ephemeral,
                withResponse: true
            });
            message = response.resource?.message!;
        }
        const collector = await builder.createCollector({
            source: message,
            userId: this.options.userId,
            time: this.options.time ?? 60000,
            onCollect: async (interaction, id) => {
                const last = this.options.pages.length - 1;
                if (interaction.isButton()) {
                    if (id === "first") {
                        this.page = 0;
                    } else if (id === "prev") {
                        this.page = Math.max(this.page - 1, 0);
                    } else if (id === "next") {
                        this.page = Math.min(this.page + 1, last);
                    } else if (id === "last") {
                        this.page = last;
                    }
                }
                if (interaction.isStringSelectMenu()) {
                    const index = Number(interaction.values[0]);
                    if (!Number.isNaN(index)) {
                        this.page = index;
                    }
                }
                const newBuilder = this.buildComponents();
                const content = this.render();
                await interaction.update({
                    ...content,
                    components: newBuilder.components(),
                } as any);
            }
        });
        collector.on("end", async () => {
            const disabled = this.buildComponents(true);
            try {
                if (!message) return;
                await message.edit({
                    components: disabled.components(),
                });
            } catch (error: any) {
                if (error?.code !== 10008) {
                    console.error("Pagination end error:", error);
                }
            }
        });
    }
}