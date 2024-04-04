<div align="center">
	<br />
	<p>
		<a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
	</p>
	<br />
	<p>
		<a href="https://discord.com/invite/tSTY36dPWa"><img src="https://img.shields.io/discord/222078108977594368?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
		<a href="https://www.npmjs.com/package/blackcat-djs"><img src="https://raw.githubusercontent.com/VinhBot/BlackCat-DJS/45b90ba964b8a6468d4001f10fa4fe776ca549fd/assets/logoDownload.svg" alt="npm downloads" /></a>
	</p>
	<p>
		<a href="https://blackcat-profile.vercel.app/"><img src="https://cdn.discordapp.com/attachments/1092880002695036950/1157163138228174898/f49e344952ef03656682df9af7d7e65a.jpg?ex=65729327&is=65601e27&hm=910512a26e1b9cecfe323f1f2a869c85c5e111a16474bc6278b1b71e8468a9de&" alt="Cloudflare Workers" height="44" /></a>
	</p>
  <br/>
</div>

## Một số đặc điểm chính
- Tên lệnh và lệnh phụ đơn giản
- Phân tích cú pháp mạnh mẽ các đối số (có hỗ trợ "chuỗi trích dẫn")
- Hệ thống lập luận tùy chọn
  * Tự động nhắc nhở các đối số không được cung cấp
  * Nhập hệ thống với các quy tắc, xác thực tự động và phân tích cú pháp thành các giá trị có thể sử dụng
    - Các kiểu cơ bản (string, number, float, boolean)
    - Các loại tùy chỉnh do người dùng xác định
  * Tự động nhắc lại các đối số không hợp lệ 
  * Đối số vô hạn (đối số chấp nhận nhiều giá trị được cung cấp)

## Cài đặt 
```js
npm install blackcat.js
```

## Thí dụ về cài đặt bot 
Bạn có thể lấy thông tin của bot qua Github sau: [BlackCat-Bot](https://github.com/VinhBot/BlackCat-DJS/blob/main/test/index.js)


## Thí dụ 
```js
import { Client } from "blackcat.js";
// hoặc
const { Client } = require("blackcat.js");
```

### Ra mắt mô-đun
```js
import { Client as BlackCatClient, chalk } from "blackcat.js";
// hàm chalk được lấy từ chalk (https://github.com/chalk/chalk)

const client = new BlackCatClient({
  /* 
  discordClient: {
    // Discord.Client
  }, 
  */
  config: {
    tokenBot: "Token Bot",
    prefix: "!",
    developer: "owner id",
		// bạn có thể thêm bất cứ gì bạn thích 
		// đầu ra: client.config.etc
  },
  // Chạy các sự kiện được đề xuất bởi blackcat
  commandHandler: {
    setCurrentLanguage: "en", // ngôn ngữ tùy chỉnh của gói. Hiện tại chỉ hỗ trợ 2 ngôn ngữ: vi: Tiếng Việt và en: Tiếng Anh
    prefixCommand: true, // bật hoặc tắt lệnh chạy bằng tiền tố
    slashCommand: true, // bật hoặc tắt các lệnh gạch chéo đang chạy
    pathToCommand: {
      prefixCommand: "./Commands", // đường dẫn đến các lệnh tiền tố
      slashCommand: "./slashCommands", // đường dẫn lệnh gạch chéo
    },
  },
});

client.on("ready", async (bot) => {
  console.log(chalk.blue(bot.user.username + " sẵn sàng hoạt động"));
});
```

## Prefix Commands
```js
import { commandBuilders, getFileNameAndFolder } from "blackcat.js";
const cmdName = getFileNameAndFolder(import.meta.url);
const commands = new CommandBuilder({
  name: cmdName.fileName.name, // Tên chính của lệnh
  usage: cmdName.fileName.name, // Cách sử dụng khi sử dụng lệnh trợ giúp
  category: cmdName.folderName.name, // Thể loại của lệnh
  aliases: [], // Bí danh cho lệnh
  description: "", // Mô tả cho lệnh
  cooldown: 5, // Thời gian cooldown của lệnh
  owner: false, // Chế độ phát triển viên
  permissions: [] // Quyền yêu cầu khi sử dụng lệnh
  /*
   * @
   */
  executeCommand: async({ client, message, args }) => {
    // đoạn code mà bạn muốn thực thi
  },
});

// console.log(commands.toJSON()); // Hiển thị thông tin lệnh ở định dạng JSON
export default commands;
```
---
**NOTE**
- Các mô-đun 'path' và 'url' sẽ giúp bạn truy xuất tên lệnh và danh mục nhanh hơn, loại bỏ nhu cầu xử lý thủ công. Bạn có thể tự tin sử dụng chúng mà không cần thực hiện các tác vụ này một cách thủ công.
- [Bạn có thể xem hướng dẫn sau](https://github.com/VinhBot/BlackCat-DJS/blob/main/test/Commands/Utility/ping.js)
---

## slash Commands
```js
import { SlashCommandBuilder, Discord } from "blackcat.js";

// Request structure
const slashCommand = new SlashCommandBuilder({
  name: getFileNameAndFolder(import.meta.url).fileName.name, // Tên lệnh, có thể viết hoa hoặc viết thường tùy ý
  description: "", // Mô tả lệnh
  userPerms: [], // Quyền cần thiết cho các thành viên để sử dụng lệnh
  owner: false, // Đặt thành true để biến nó thành lệnh của chủ sở hữu bot, false để tắt
  cooldown: 3, // Thời gian hồi lệnh
  type: "",
  // options: [],
  executeCommand: ({ client, interaction }) => {
    // code 
  },
});
// console.log(slashCommand.toJSON());
export default slashCommand;

```
---
**NOTE**
- Các mô-đun 'path' và 'url' sẽ giúp bạn truy xuất tên lệnh và danh mục nhanh hơn, loại bỏ nhu cầu xử lý thủ công. Bạn có thể tự tin sử dụng chúng mà không cần thực hiện các tác vụ này một cách thủ công.
- [Bạn có thể xem hướng dẫn sau](https://github.com/VinhBot/BlackCat-DJS/blob/main/test/slashCommands/Utility/ping.js)
---

## Chuyển đổi mã màu hex sang định dạng RGB.
```js
import { toRgb } from "blackcat.js";
const hexColor = "#3498db";
const rgbArray = toRgb(hexColor);
console.log(rgbArray); // Output: [52, 152, 219]
```

## Chuyển đổi chuỗi thời gian thành giá trị tương ứng tính bằng mili giây.
```js
import { ms } from "blackcat.js";

const timeString = "1w 3d 5h";
const totalTimeInMs = ms(timeString);
console.log(totalTimeInMs); // Output: 910800000 (tổng thời gian tính bằng mili giây)
```