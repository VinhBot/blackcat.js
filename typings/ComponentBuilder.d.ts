import { EmojiIdentifierResolvable } from "discord.js";

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
        emoji?: string | EmojiIdentifierResolvable;
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
export declare class ComponentBuilder {
    /**
     * Constructor cho ComponentBuilder.
     * @param {Array} components - Mảng để lưu trữ các thành phần.
     * @example
     * const createComponent = new ComponentBuilder([
     *  // https://discordjs.guide/message-components/buttons.html#building-buttons
     *  {
            type: "ButtonBuilder", // Kiểu của thành phần (ButtonBuilder).
            options: [
                {
                    customId: "button1", // ID tùy chỉnh cho button.
                    label: "Button 1", // tên được hiển thị trên button.
                    style: "Secondary", // Kiểu của button. Có thể là "Primary", "Secondary", "Success", "Danger" hoặc "Link".
                    disabled: false, // Cho biết button có bị vô hiệu hóa không.
                },
                {
                    customId: "button2", // ID tùy chỉnh cho button.
                    label: "Button 2", // tên được hiển thị trên button.
                    style: "Danger", // Kiểu của button. Có thể là "Primary", "Secondary", "Success", "Danger" hoặc "Link".
                    disabled: false, // Cho biết button có bị vô hiệu hóa không.
                }
            ]
        },
        // https://discordjs.guide/message-components/select-menus.html#building-string-select-menus
        {
            type: "SelectMenuBuilder", // Kiểu của thành phần (SelectMenuBuilder).
            options: {
                placeholder: "Vui lòng lựa chọn mục theo yêu cầu", // được hiển thị trong menu lựa chọn 
                customId: "StringSelectMenuBuilder", // ID tùy chỉnh cho menu lựa chọn.
                disabled: false, // Cho biết menu lựa chọn có bị vô hiệu hóa không.
                maxValues: 1, // Số lượng giá trị tối đa có thể được chọn.
                minValues: 1, // Số lượng giá trị tối thiểu có thể được chọn.
                options: [
                    {
                        label: "Option 1", // Nhãn cho tùy chọn.
                        value: "option1", // Giá trị của tùy chọn.
                    },
                ]
            }
        }
    ]);
    client.on("messageCreate", message => {
        if(message.content === "component") {
            message.reply({ components: createComponent });
        };
    });
     */
    constructor(components: Array<ButtonBuilder | SelectMenuBuilder>);
}