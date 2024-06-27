module.exports = {
    tokenBot: "Bạn vẫn chưa thêm token cho bot",
    commandHander: {
        prefix: {
            // bảng điều khiển (commandTable)
            cmd1: "Tên Lệnh",
            cmd2: "Trạng thái",
            cmd3: "✔️ sẵn sàng",
            cmd4: "❌ Lỗi",
            cmd5: "[blackcat-prefixCommand]: vui lòng kiểm tra lại đường dẫn đến thư mục lệnh của bạn.",
            cmd6: "[blackcat-MessageCreate]: Bạn chỉ có thể gán 2 giá trị boolean thôi.",
            // tin nhắn trong messageCreate
            mes1: "Thiếu quyền",
            mes2: "Bạn không có quyền {permissions} để sử dụng lệnh này",
            mes3: "❌ Bạn đã sử dụng lệnh quá nhanh vui lòng đợi {timestamp} giây trước khi sử dụng lại `{cmdName}`",
            mes4: "Bạn không thể sử dụng lệnh này chỉ có <@{developer}> mới có thể sử dụng",
            mes5: "Sai lệnh. nhập {prefix}help để xem lại tất cả các lệnh",
            mes6: "Xin chào. prefix của tôi là: {prefix}",
        },
        slash: {
            // bảng điều khiển (slashTable) 
            cmd1: "Tên Lệnh",
            cmd2: "Trạng thái",
            cmd3: "❌ Lỗi",
            cmd4: "✔️ sẵn sàng",
            cmd5: "Lỗi nhập {slashCmds}: {slashCmds1}",
            // tin nhắn trong interaction 
            slash1: "Thiếu quyền sử dụng lệnh",
            slash2: "Tôi, không phải là bot ngu ngốc, chỉ chủ sở hữu mới có thể sử dụng lệnh này",
            slash3: "Xin lỗi, bạn không có quyền {cmd1} trong <#{cmd2}> để sử dụng lệnh {cmd3} này",
            slash4: "Đã xảy ra lỗi khi thực hiện lệnh, xin lỗi vì sự bất tiện <3",
            slash5: "Bạn sử dụng lệnh `{commandName}` quá nhanh. vui lòng sử dụng lại sau `{cooldown}` giây."
        },
    },
    eventHandler: {
        event1: "Tên events",
        event2: "Trạng thái",
        event3: "✔️ sẵn sàng",
        event4: "[BlackCat-EVENTS]: Bạn vẫn chưa thêm tên thư mục cho event",
        event5: "[BlackCat-EVENTS]: Đầu vào phải là giá trị như sau eventFolder: ['Tên thư mục']",
        event6: "[BlackCat-EVENTS]: Bạn vẫn chưa thêm đường dẫn cụ thể hoặc đã bị sai vui lòng kiểm trai lại"
    }
}