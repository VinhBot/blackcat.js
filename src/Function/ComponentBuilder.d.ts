import Discord from "discord.js";
// Định nghĩa kiểu cho một nút
interface ButtonBuilder {
    /**
     * Kiểu của thành phần (ButtonBuilder).
     */
    type: "ButtonBuilder",
    /**
     * Các lựa chọn cho ButtonBuilder
     */
    options: Array<{
        /**
         * ID tùy chỉnh cho button.
         */
        customId: string;
        /**
         * Cho biết button có bị vô hiệu hóa không.
         */
        disabled?: boolean;
        /**
         * tên được hiển thị trên button.
         */
        label: string;
        /**
         * Kiểu của button. Có thể là "Primary", "Secondary", "Success", "Danger" hoặc "Link".
         */
        style: "Primary" | "Secondary" | "Success" | "Danger" | "Link";
        /**
         * Emoji được hiển thị trên button.
         */
        emoji?: string | Discord.EmojiIdentifierResolvable;
        /**
         * URL mà button sẽ chuyển hướng đến nếu được nhấp.
         */
        url?: string;
    }>
}
// Định nghĩa kiểu cho một menu lựa chọn
interface SelectMenuBuilder {
    /**
     * Kiểu của thành phần (SelectMenuBuilder).
     */
    type: "SelectMenuBuilder",
    /**
     * Các lựa chọn cho SelectMenuBuilder - https://discord.js.org/docs/packages/builders/1.7.0/StringSelectMenuOptionBuilder:Class
     */
    options: {
        /**
         * ID tùy chỉnh cho menu lựa chọn.
         */
        customId: string;
        /**
         * được hiển thị trong menu lựa chọn.
         */
        placeholder: string;
        /**
         * Mảng các tùy chọn cho menu lựa chọn.
         */
        options: Array<{
            /**
             * Có phải là giá trị mặc định không.
             */
            default?: boolean;
            /**
             * Mô tả cho tùy chọn.
             */
            description?: string;
            /**
             * Emoji hiển thị bên cạnh tùy chọn.
             */
            emoji?: {
                /**
                 * Emoji id
                 */
                id?: string;
                /**
                 * Tên Emoji
                 */
                name?: string;
                /**
                 * Biểu tượng cảm xúc này có hoạt hình hay không
                 */
                animated?: boolean;
            };
            /**
             * Nhãn cho tùy chọn.
             */
            label: string;
            /**
             * Giá trị của tùy chọn.
             */
            value: string;
        }>;
        /**
         * Cho biết menu lựa chọn có bị vô hiệu hóa không.
         */
        disabled?: boolean;
        /**
         * Số lượng giá trị tối đa có thể được chọn.
         */
        maxValues?: number;
        /**
         * Số lượng giá trị tối thiểu có thể được chọn.
         */
        minValues?: number;
    }
}
// Lớp ComponentBuilder cho phép xây dựng các thành phần của Discord
declare class ComponentBuilder {
    /**
     * Constructor cho ComponentBuilder.
     * @param {Array} components - Mảng để lưu trữ các thành phần.
     */
    constructor(components: Array<ButtonBuilder | SelectMenuBuilder>);
    // Phương thức xây dựng một nút
    /**
     * @param {Discord.BaseButtonComponentData} o - Dữ liệu của nút.
     * @returns {Discord.ButtonBuilder} - Xây dựng nút Discord.
     */
    private buildButton(o: Discord.BaseButtonComponentData): Discord.ButtonBuilder;
    // Phương thức xây dựng một menu lựa chọn
    /**
     * @param {Discord.SelectMenuComponentOptionData} o - Dữ liệu của menu lựa chọn.
     * @returns {Discord.ActionRowBuilder} - Xây dựng hàng động Discord.
     */
    private buildSelectMenu(o: Discord.SelectMenuComponentOptionData): Discord.ActionRowBuilder;
    // Phương thức xây dựng một hàng động với các thành phần
    /**
     * @param {(Discord.MessageActionRowComponent | Discord.MessageActionRowComponent[])[]} components - Các thành phần để thêm vào hàng động.
     * @returns {Discord.MessageActionRowComponent} - Xây dựng hàng động Discord.
     */
    private buildActionRow(components: (Discord.MessageActionRowComponent | Discord.MessageActionRowComponent[])[]): Discord.MessageActionRowComponent;
}

export { ComponentBuilder };
