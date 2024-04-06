import Discord from "discord.js";
/**
* Chuyển đổi chuỗi kiểu nút cũ của bạn thành ButtonStyle.
* @link Documentation: https://discord-api-types.dev/api/discord-api-types-v10/enum/ButtonStyle
* @param style
* @example toButtonStyle("Primary")
*/
export function toButtonStyle(style) {
    // Các tùy chọn kiểu là tùy chọn vì vậy nếu nó không được xác định thì đừng quan tâm
    if (style == undefined) return;
    // Tổ hợp combination
    const combination = [
      { key: 'Secondary', value: Discord.ButtonStyle.Secondary },
      { key: 'Primary', value: Discord.ButtonStyle.Primary },
      { key: 'Success', value: Discord.ButtonStyle.Success },
      { key: 'Danger', value: Discord.ButtonStyle.Danger },
      { key: 'Link', value: Discord.ButtonStyle.Link }
    ];
    // Sử dụng .find(callback) để lấy combination
    const buttonstyle = combination.find((item) => item.key == style);
    // Nếu nó không tồn tại, chỉ cần trả về không có gì
    if (Number(style) >= 1 && Number(style) <= 5) return Number(style);
    if (!buttonstyle || buttonstyle == undefined) return;
    return buttonstyle.value;
  };