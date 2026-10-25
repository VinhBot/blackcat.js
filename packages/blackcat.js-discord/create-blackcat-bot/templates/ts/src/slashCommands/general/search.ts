import { SlashCommandBuilder } from "blackcat.js-discord";

const FRUITS = ["Táo", "Chuối", "Cam", "Xoài", "Dưa hấu", "Nho", "Dứa", "Ổi", "Mít", "Vải"];

// Slash command có AUTOCOMPLETE: gợi ý ngay khi người dùng đang gõ.
export default new SlashCommandBuilder({
    commandName: "search",
    description: "Tìm một loại trái cây (demo autocomplete)",
    options: (o) => ({
        fruit: o.string({
            description: "Tên trái cây",
            required: true,
            // Trả về tối đa 25 gợi ý: mảng chuỗi hoặc mảng { name, value }.
            autocomplete: (query) => FRUITS.filter((name) => name.toLowerCase().includes(query.toLowerCase())),
        }),
    }),
    execute: (client, interaction, options) => {
        return interaction.reply(`🍎 Bạn chọn: **${options.fruit}**`); // options.fruit: string
    },
});
