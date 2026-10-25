import { CommandBuilder } from "../../../src";

// Message command với argument CÓ KIỂU:  !ban @user [số ngày] [lý do...]
// Lưu ý: đặt `options` TRƯỚC `execute` để TypeScript suy ra kiểu cho `options`.
export default new CommandBuilder({
    commandName: "ban",
    description: "Ban một thành viên (demo, không thực sự ban)",
    permission: { userPermissions: ["BanMembers"] },
    options: (a) => ({
        user: a.user({ required: true, description: "người bị ban" }),
        days: a.integer({ min: 0, max: 7, description: "số ngày xoá tin nhắn" }),
        reason: a.string({ rest: true, description: "lý do" }),
    }),
    execute: async (client, message, args, options) => {
        // options.user: User  |  options.days: number | null  |  options.reason: string | null
        return message.reply(`Sẽ ban **${options.user.tag}** — xoá ${options.days ?? 0} ngày tin nhắn. Lý do: ${options.reason ?? "không có"}`);
    },
});
