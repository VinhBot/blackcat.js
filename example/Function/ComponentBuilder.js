import { ComponentBuilders } from "../../src/blackcat.js";

const createComponent = new ComponentBuilders([
    // https://discordjs.guide/message-components/buttons.html#building-buttons
    {
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
    }, 
]);

/**
 * @param {Discord.Message} message.reply({ components: createComponent });
 */