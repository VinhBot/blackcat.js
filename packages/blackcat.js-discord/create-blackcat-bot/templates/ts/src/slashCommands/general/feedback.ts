import { ModalBuilder, SlashCommandBuilder, Discord } from "blackcat.js-discord";

// Modal (form popup) với ô nhập có kiểu.
const feedbackModal = new ModalBuilder({
    customId: "feedback",
    title: "Góp ý cho bot",
    fields: (f) => ({
        subject: f.short({ label: "Tiêu đề", minLength: 3, maxLength: 50 }),                  // bắt buộc (mặc định)
        detail: f.paragraph({ label: "Nội dung chi tiết", required: false, maxLength: 1000 }), // tuỳ chọn
    }),
});

export default new SlashCommandBuilder({
    commandName: "feedback",
    description: "Gửi góp ý cho bot",
    execute: async (client, interaction) => {
        const result = await feedbackModal.show(interaction);
        if (!result) return; // người dùng không gửi trong thời gian chờ (mặc định 5 phút)

        const { subject, detail } = result.values; // subject: string  |  detail: string | null
        await result.interaction.reply({
            content: `Cảm ơn bạn! **${subject}**${detail ? `\n${detail}` : ""}`,
            flags: Discord.MessageFlags.Ephemeral,
        });
    },
});
