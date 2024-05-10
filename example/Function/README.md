## Một số Function hữu ích

> [!TIP]
> lấy thông tin về tên của file và tên của folder chứa file một cách nhanh chóng.

```js
import { getFileNameAndFolder } from "blackcat.js";

const getName = getFileNameAndFolder(import.meta.url).fileName.name; // lấy tên của file
const getFolderName = getFileNameAndFolder(import.meta.url).folderName.name; // lấy tên của folder

console.log(getName); // Output: getFileNameAndFolder.js
console.log(getFolderName); // Output: Function
```

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
import { ComponentBuilder, Discord } from "blackcat.js";

const createComponent = new ComponentBuilder([
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