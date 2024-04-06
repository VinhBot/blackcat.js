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