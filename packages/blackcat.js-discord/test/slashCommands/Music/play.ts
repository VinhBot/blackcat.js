import { SlashCommandBuilder } from "../../../src";

const SONGS = ["Lạc trôi", "Nắng ấm xa dần", "Hãy trao cho anh", "Chúng ta của hiện tại", "Có chắc yêu là đây"];

// Slash command có AUTOCOMPLETE: gợi ý bài hát khi người dùng đang gõ.
export default new SlashCommandBuilder({
    commandName: "play",
    description: "Phát một bài hát (demo autocomplete)",
    options: (o) => ({
        song: o.string({
            description: "Tên bài hát",
            required: true,
            // Trả về tối đa 25 gợi ý. Có thể là mảng chuỗi hoặc mảng { name, value }.
            autocomplete: (query) => SONGS.filter((song) => song.toLowerCase().includes(query.toLowerCase())),
        }),
    }),
    execute: (client, interaction, options) => {
        return interaction.reply(`🎵 Đang phát: **${options.song}**`); // options.song: string
    },
});
