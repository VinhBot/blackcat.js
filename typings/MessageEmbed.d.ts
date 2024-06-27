import { JSONEncodable, ColorResolvable, EmbedFooterOptions, RestOrArray, APIEmbedField, EmbedAuthorOptions, APIEmbed } from "discord.js";

interface EmbedData {
    /**
     * Mô tả của embed
     *
     * Giới hạn độ dài: 4096 ký tự.
     */
    description?: string;
    /**
     * Thông tin thumbnail.
     */
    thumbnail?: string;
    /**
     * Dấu thời gian của nội dung embed.
     */
    timestamp?: string;
    /**
     * Tiêu đề cho embed.
     */
    title?: {
        /**
         * URL cho embed.
         */
        url?: string;
        /**
         * Văn bản cho tiêu đề.
         * 
         * Giới hạn độ dài: 256 ký tự.
         */
        text?: string;
    };
    /**
     * Thông tin các field
     *
     * Giới hạn độ dài: 25 đối tượng field
     *
     * Xem https://discord.com/developers/docs/resources/channel#embed-object-embed-field-structure
     */
    fields: RestOrArray<{
        /**
         * Tên của field
         *
         * Giới hạn độ dài: 256 ký tự
         */
        name: string;
        /**
         * Giá trị của field
         *
         * Giới hạn độ dài: 1024 ký tự
         */
        value: string;
        /**
         * Field này có được hiển thị cùng dòng hay không
         */
        inline?: boolean;
    }>
    /**
     * Thông tin tác giả.
     */
    author?: {
        /**
         * Tên của tác giả
         *
         * Giới hạn độ dài: 256 ký tự
         */
        name: string;
        /**
         * URL của biểu tượng.
         */
        iconURL?: string;
        /**
         * URL proxy của biểu tượng.
         */
        proxyIconURL?: string;
        /**
         * Link liên kết của tác giả.
         */
        url?: string;
    };
    /**
     * Thông tin footer
     */
    footer?: {
        /**
         * Văn bản footer
         *
         * Giới hạn độ dài: 2048 ký tự
         */
        text: string,
        /**
         * URL của biểu tượng.
         */
        iconURL?: string;
        /**
         * URL proxy của biểu tượng.
         */
        proxyIconURL?: string;
    };
    /**
     * Hình ảnh embed.
     */
    images?: string;
    /**
     * Mã màu của embed.
     */
    colors?: ColorResolvable;
}
/**
 * Một builder tạo dữ liệu JSON tương thích với API cho embeds.
 */
export class MessageEmbed {
    /**
     * Dữ liệu API liên kết với embed này.
     */
    readonly data: APIEmbed;
    /**
     * Tạo một embed mới từ dữ liệu API.
     *
     * @param data - Dữ liệu API để tạo embed này, bạn có thể tùy chọn bất kì giá trị nào dưới ví dụ sau.
     * @example
     * const embeds = new MessageEmbed({
     *    title: {
     *        text: "Tiêu đề của embed",
     *        url: "https://discord.js.org"
     *    },
     *    description: "mô tả ",
     *    timestamp: Date.now(),
     *    color: "Màu tùy chọn",
     *    author: {
     *        name: "Tên của tác giả",
     *        iconURL: "https://i.imgur.com/AfFp7pu.png",
     *        url: "https://discord.js.org",
     *    },
     *    thumbnail: "https://i.imgur.com/AfFp7pu.png",
     *    fields: [
     *        {
     *            name: "name 1",
     *            value: "value 1",
     *            inline: false
     *        },
     *        {
     *            name: "name 2",
     *            value: "value 2",
     *            inline: false
     *        }
     *    ],
     *    footer: {
     *        text: "văn bản của footer.",
     *        iconURL: "https://i.imgur.com/AfFp7pu.png"
     *    },
     *    images: "https://i.imgur.com/AfFp7pu.png"
     * });
     */
    constructor(data?: EmbedData);
    /**
     * Thêm các field vào embed.
     *
     * @remarks
     * Phương thức này chấp nhận một mảng các field hoặc một số lượng biến đổi các tham số field.
     * Số lượng tối đa các field có thể thêm là 25.
     * @example
     * Sử dụng một mảng:
     * ```ts
     * const fields: APIEmbedField[] = ...;
     * const embed = new EmbedBuilder()
     * 	.addFields(fields);
     * ```
     * @example
     * Sử dụng tham số dạng rest (variadic):
     * ```ts
     * const embed = new EmbedBuilder()
     * 	.addFields(
     * 		{ name: 'Field 1', value: 'Value 1' },
     * 		{ name: 'Field 2', value: 'Value 2' },
     * 	);
     * ```
     * @param fields - Các field để thêm
     */
    public addFields(...fields: RestOrArray<APIEmbedField>): this;
    /**
     * Loại bỏ, thay thế hoặc chèn các field cho embed này.
     *
     * @remarks
     * Phương thức này hoạt động tương tự như
     * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice | Array.prototype.splice()}.
     * Số lượng tối đa các field có thể thêm là 25.
     *
     * Nó hữu ích cho việc chỉnh sửa và điều chỉnh thứ tự của các field đã tồn tại của một embed.
     * @example
     * Loại bỏ field đầu tiên:
     * ```ts
     * embed.spliceFields(0, 1);
     * ```
     * @example
     * Loại bỏ n field đầu tiên:
     * ```ts
     * const n = 4;
     * embed.spliceFields(0, n);
     * ```
     * @example
     * Loại bỏ field cuối cùng:
     * ```ts
     * embed.spliceFields(-1, 1);
     * ```
     * @param index - Chỉ số để bắt đầu
     * @param deleteCount - Số lượng field để loại bỏ
     * @param fields - Các đối tượng field thay thế
     */
    public spliceFields(index: number, deleteCount: number, ...fields: APIEmbedField[]): this;
    /**
     * Thiết lập các field cho embed này.
     *
     * @remarks
     * Phương thức này là một alias cho {@link EmbedBuilder.spliceFields}. Cụ thể hơn,
     * nó thay thế toàn bộ mảng field bằng các field được cung cấp.
     *
     * Bạn có thể thiết lập tối đa 25 field.
     * @param fields - Các field để thiết lập
     */
    public setFields(...fields: RestOrArray<APIEmbedField>): this;
    /**
     * Thiết lập author cho embed này.
     *
     * @param options - Các tùy chọn để sử dụng
     */
    public setAuthor(options: EmbedAuthorOptions | null): this;
    /**
     * Thiết lập màu sắc cho embed này.
     *
     * @param color - Màu sắc để sử dụng
     */
    public setColor(color: ColorResolvable | null): this;
    /**
     * Thiết lập mô tả cho embed này.
     *
     * @param description - Mô tả để sử dụng
     */
    public setDescription(description: string | null): this;
    /**
     * Thiết lập footer cho embed này.
     *
     * @param options - Footer để sử dụng
     */
    public setFooter(options: EmbedFooterOptions | null): this;
    /**
     * Thiết lập hình ảnh cho embed này.
     *
     * @param url - URL của hình ảnh để sử dụng
     */
    public setImage(url: string | null): this;
    /**
     * Thiết lập thumbnail cho embed này.
     *
     * @param url - URL của thumbnail để sử dụng
     */
    public setThumbnail(url: string | null): this;
    /**
     * Thiết lập timestamp cho embed này.
     *
     * @param timestamp - Timestamp hoặc ngày để sử dụng
     */
    public setTimestamp(timestamp?: Date | number | null): this;
    /**
     * Thiết lập tiêu đề cho embed này.
     *
     * @param title - Tiêu đề để sử dụng
     */
    public setTitle(title: string | null): this;
    /**
     * Thiết lập URL của embed này.
     *
     * @param url - URL để sử dụng
     */
    public setURL(url: string | null): this;
    /**
     * Tuần tự hóa builder này thành dữ liệu JSON tương thích với API.
     *
     * @remarks
     * Phương thức này thực hiện các xác thực trên dữ liệu trước khi tuần tự hóa.
     * Do đó, nó có thể ném ra lỗi nếu dữ liệu không hợp lệ.
     */
    public toJSON(): APIEmbed;
    /**
     * Tạo một instance của MessageEmbed từ dữ liệu JSON hoặc EmbedData hiện có.
     *
     * @param other - Một đối tượng có thể chuyển đổi thành JSON (JSONEncodable) chứa APIEmbed hoặc một đối tượng EmbedData chứa dữ liệu cần thiết để tạo MessageEmbed.
     * @returns Một instance mới của MessageEmbed với dữ liệu được cung cấp.
     */
    public static from(other: JSONEncodable<APIEmbed> | EmbedData): MessageEmbed;
}