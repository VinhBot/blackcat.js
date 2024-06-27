## Một số Function hữu ích

> [!TIP]
> Chuyển đổi chuỗi thời gian thành tổng thời gian tính bằng mili giây.

```js
import { ms } from "blackcat.js";

const timeString = "1w 3d 5h";
const totalTimeInMs = ms(timeString);
console.log(totalTimeInMs); // Output: 910800000 (tổng thời gian tính bằng mili giây)
```
> [!TIP]
> chuyển đổi một mã màu hex (hexColor) thành một mảng các giá trị RGB tương ứng.

```js
import { toRgb } from "blackcat.js";
const hexColor = "#3498db";
const rgbArray = toRgb(hexColor);
console.log(rgbArray); // Output: [52, 152, 219]
```
>[!TIP]
> Khởi tạo nhanh tương tác button hoặc menu discordBot

```js
import { ComponentBuilders } from "blackcat.js";

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

/**
 * @param {Discord.Message} message.reply({ components: createComponent });
 */
```

>[!TIP]
> Chuyển đổi chuỗi kiểu nút cũ của bạn thành Discord.ButtonStyle.
```js
import { toButtonStyle } from "blackcat.js";

const styles = toButtonStyle("Secondary");
console.log(styles); // Output: 2
```

>[!TIP]
> Tạo 1 tin nhắn embeds.
```js
const { MessageEmbed } = require("../../src/blackcat"); // blackcat.js

const embeds = new MessageEmbed({
    title: {
        text: "Tiêu đề của embed",
        url: "https://discord.js.org"
    },
    description: "mô tả ",
    timestamp: Date.now(),
    color: "Màu tùy chọn",
    author: {
        name: "Tên của tác giả",
        iconURL: "https://i.imgur.com/AfFp7pu.png",
        url: "https://discord.js.org",
    },
    thumbnail: "https://i.imgur.com/AfFp7pu.png",
    fields: [
        {
            name: "name 1",
            value: "value 1",
            inline: false
        },
        {
            name: "name 2",
            value: "value 2",
            inline: false
        }
    ],
    footer: {
        text: "văn bản của footer.",
        iconURL: "https://i.imgur.com/AfFp7pu.png"
    },
    images: "https://i.imgur.com/AfFp7pu.png"
});

console.log(embeds);
```