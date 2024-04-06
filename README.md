<div align="center">
	<br />
	<p>
		<a href="https://discord.js.org"><img src="https://discord.js.org/static/logo.svg" width="546" alt="discord.js" /></a>
	</p>
	<br />
	<p>
		<a href="https://discord.com/invite/tSTY36dPWa"><img src="https://img.shields.io/discord/222078108977594368?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
		<a href="https://www.npmjs.com/package/blackcat.js"><img src="https://raw.githubusercontent.com/VinhBot/blackcat.js/7f26728efdef2663d6c36f9987f7324973787ba0/assets/logoDownload.svg" alt="npm downloads" /></a>
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
Điều đầu tiên bạn phải hiểu về [ECMAScript modules](https://nodejs.org/api/esm.html) trước khi sử dụng modules

```js
npm install blackcat.js
```

## Thí dụ 
```js
import { Client } from "blackcat.js";
// hoặc
const { Client } = require("blackcat.js");
```

## Thiết lập bot 
Bạn có thể lấy thông tin của bot qua Github sau: [BlackCat-Bot](https://github.com/VinhBot/blackcat.js/tree/main/test)
<br>
Các [Function](https://github.com/VinhBot/blackcat.js/tree/main/test/Function) hữu có thể hữu ích dành cho bạn