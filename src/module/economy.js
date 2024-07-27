const EventEmitter = require("node:events").EventEmitter;
const mongoose = require("mongoose");

const CurrencySystem = class extends EventEmitter {
    constructor() {
        super();
        this.maxWallet = 0;
        this.workCooldown = 0;
        this.wallet = 0;
        this.bank = 0;
        this.maxBank = 0;
        this.inventory = mongoose.model("inventory", new mongoose.Schema({
            lastUpdated: { type: mongoose.SchemaTypes.Date, default: new Date() },
            guildID: { type: mongoose.SchemaTypes.String, default: null },
            inventory: { type: mongoose.SchemaTypes.Array },
        }));
        this.currency = mongoose.model("currency", new mongoose.Schema({
            userName: mongoose.SchemaTypes.String,
            userID: mongoose.SchemaTypes.String,
            guildID: mongoose.SchemaTypes.String,
            inventory: mongoose.SchemaTypes.Array,
            begTimeout: { type: mongoose.SchemaTypes.Number, default: 240 },
            bankSpace: { type: mongoose.SchemaTypes.Number, default: 0 },
            networth: { type: mongoose.SchemaTypes.Number, default: 0 },
            wallet: { type: mongoose.SchemaTypes.Number, default: 0 },
            bank: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastUpdated: { type: mongoose.SchemaTypes.Date, default: new Date() },
            lastQuaterly: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastMonthly: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastGamble: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastHourly: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastYearly: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastBegged: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastWeekly: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastDaily: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastHafly: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastWork: { type: mongoose.SchemaTypes.Number, default: 0 },
            lastRob: { type: mongoose.SchemaTypes.Number, default: 0 },
            streak: {
                quaterly: { type: mongoose.SchemaTypes.Number, default: 1 },
                monthly: { type: mongoose.SchemaTypes.Number, default: 1 },
                yearly: { type: mongoose.SchemaTypes.Number, default: 1 },
                hourly: { type: mongoose.SchemaTypes.Number, default: 1 },
                weekly: { type: mongoose.SchemaTypes.Number, default: 1 },
                hafly: { type: mongoose.SchemaTypes.Number, default: 1 },
                daily: { type: mongoose.SchemaTypes.Number, default: 1 },
            },
        }));
    };
    /**
     * Kết nối đến mongoose.
     * @param {string} mongourl link mongoose của bạn.
     */
    setMongoURL(mongourl) {

    };
    /**
     * Thiết lập số tiền tối đa được phép trong ví.
     * @param {number} amount Số tiền tối đa trong ví.
     */
    setMaxWalletAmount(amount) {
        if (parseInt(amount)) this.maxWallet = amount || 0; // Chỉ đặt giá trị cho maxWallet nếu amount là một số nguyên hợp lệ.
    };
    /**
     * Thiết lập số tiền mặc định trong ví.
     * @param {number} amount Số tiền mặc định trong ví.
     */
    setDefaultWalletAmount(amount) {
        if (parseInt(amount)) this.wallet = amount || 0; // Chỉ đặt giá trị cho wallet nếu amount là một số nguyên hợp lệ.
    };
    /**
     * Thiết lập số tiền mặc định trong ngân hàng.
     * @param {number} amount Số tiền mặc định trong ngân hàng.
     */
    setDefaultBankAmount(amount) {
        if (parseInt(amount)) this.bank = amount || 0; // Chỉ đặt giá trị cho bank nếu amount là một số nguyên hợp lệ.
    };
    /**
     * Thiết lập số tiền tối đa được phép trong ngân hàng.
     * @param {number} amount Số tiền tối đa trong ngân hàng.
     */
    setMaxBankAmount(amount) {
        if (parseInt(amount)) this.maxBank = amount || 0; // Chỉ đặt giá trị cho maxBank nếu amount là một số nguyên hợp lệ.
    };
    /**
     * Thực hiện hành động mua sắm.
     * @param {Object} settings - Các thiết lập cho hành động mua sắm.
     * @returns {Promise<Object>} - Kết quả của hành động mua sắm.
     */
    async buy(settings) {
        return await this._buy(settings);
    };
    /**
     * Thêm một mặt hàng vào người dùng.
     * Chức năng này gọi đến hàm _buy để thực hiện mua sắm.
     * @param {Object} settings - Các thiết lập cho hành động thêm mặt hàng.
     * @returns {Promise<Object>} - Kết quả của hành động thêm mặt hàng.
     */
    async addUserItem(settings) {
        return await this._buy(settings);
    };
    /**
     * Thêm một mục vào inventory và cập nhật vào cơ sở dữ liệu.
     * @param {Object} settings - Các thiết lập và thông tin mục cần thêm.
     * @returns {Object} - Đối tượng chứa kết quả của thao tác thêm.
     */
    async addItem(settings) {
        if (!settings.inventory) return {
            error: true,
            type: "No-Inventory",
        };
        if (!settings.inventory.name) return {
            error: true,
            type: "No-Inventory-Name",
        };
        if (!settings.inventory.price || isNaN(parseInt(settings.inventory.price)) || parseInt(settings.inventory.price) <= 0) return {
            error: true,
            type: "Invalid-Inventory-Price",
        };
        const item = {
            name: String(settings.inventory.name) || "Air",
            price: parseInt(settings.inventory.price) || 0,
            description: String(settings.inventory.description) || "Không có mô tả.",
            itemId: this.makeid(),
        };
        if (typeof settings.guild === "string") settings.guild = {
            id: settings.guild,
        };
        if (!settings.guild) settings.guild = {
            id: null,
        };
        // Cập nhật inventory trong cơ sở dữ liệu
        await this.inventory.findOneAndUpdate({ guildID: settings.guild.id || null },
            {
                $push: { inventory: item },
            },
            { upsert: true, useFindAndModify: false }
        );
        return {
            error: false,
            item: item,
        };
    };
    /**
     * Xóa một mục từ inventory của người dùng và cập nhật vào cơ sở dữ liệu.
     * @param {Object} settings - Các thiết lập và thông tin mục cần xóa.
     * @returns {Object} - Đối tượng chứa kết quả của thao tác xóa.
     */
    async removeItem(settings) {
        let thing = parseInt(settings.item);
        // Kiểm tra thing có phải là một số nguyên dương và nằm trong phạm vi inventory
        if (!Number.isInteger(thing) || thing <= 0 || thing > inventoryData.inventory.length) return {
            error: true,
            type: "Invalid-Item-Number",
        };
        // Lấy dữ liệu inventory và kiểm tra mục cần xóa
        let inventoryData = await this.getInventory(settings);
        if (!inventoryData || !inventoryData.inventory || !inventoryData.inventory[thing - 1]) return {
            error: true,
            type: "Unknown-Item",
        };
        // Lấy thông tin về mục đã xóa
        const deletedDB = inventoryData.inventory[thing - 1];
        // Xóa mục khỏi mảng inventory
        inventoryData.inventory.splice(thing - 1, 1);
        // Lưu cập nhật vào cơ sở dữ liệu
        await inventoryData.save();
        return {
            error: false,
            inventory: deletedDB,
        };
    };
    /**
     * Cập nhật danh sách mặt hàng vào cơ sở dữ liệu.
     * @param {Object} settings - Các thiết lập và thông tin mặt hàng cần cập nhật.
     * @returns {Object} - Đối tượng chứa kết quả của thao tác cập nhật.
     */
    async setItems(settings) {
        if (!settings.shop) return {
            error: true,
            type: "No-Shop",
        };
        if (!Array.isArray(settings.shop)) return {
            error: true,
            type: "Invalid-Shop",
        };
        for (const item of settings.shop) {
            if (!item.name) return {
                error: true,
                type: "Invalid-Shop-name",
            };
            if (!item.price) return {
                error: true,
                type: "Invalid-Shop-price",
            };
            if (!item.description) {
                item.description = "Không có mô tả.";
            };
        };
        // Cập nhật danh sách mặt hàng vào cơ sở dữ liệu
        this.inventory.findOneAndUpdate({ guildID: settings.guild.id || null },
            {
                $set: { inventory: settings.shop },
            },
            {
                upsert: true,
                useFindAndModify: false,
            }).catch((e, d) => {
                if (e) {
                    console.error("Đã sảy ra lỗi:", e);
                };
            });
        return {
            error: false,
            type: "success",
        };
    };
    /**
     * Xóa một item từ inventory của người dùng và cập nhật vào cơ sở dữ liệu.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết để xóa item.
     * @returns {Object} - Đối tượng chứa kết quả của thao tác xóa.
     */
    async removeUserItem(settings) {
        try {
            // Tìm kiếm người dùng và dữ liệu liên quan
            let data = await this.findUser(settings, null, null, "removeUserItem");
            // Kiểm tra và chuyển đổi settings.item thành số nguyên
            let thing = parseInt(settings.item);
            if (!thing || thing <= 0) return {
                error: true,
                type: "Invalid-Item-Number",
            };
            // Chỉ số trong mảng inventory là thing - 1 vì settings.item bắt đầu từ 1
            let index = thing - 1;
            // Kiểm tra xem chỉ số có hợp lệ không
            if (!data.inventory[index]) return {
                error: true,
                type: "Unknown-Item",
            };
            let item = null;
            let data_user = {};
            let done = false;
            if (settings.amount === "all") {
                // Xóa toàn bộ số lượng của một loại item
                let selectedItem = data.inventory[index];
                data_user = {
                    count: 0,
                    name: selectedItem.name,
                    deleted: selectedItem.amount,
                    itemId: selectedItem.itemId,
                };
                item = selectedItem;
                data.inventory.splice(index, 1);
                done = true;
            } else {
                // Xử lý khi chỉ định số lượng cụ thể
                let selectedItem = data.inventory[index];
                if (selectedItem.amount > 1 && !settings.amount) {
                    // Giảm số lượng một loại item khi số lượng lớn hơn 1 và không chỉ định settings.amount
                    selectedItem.amount--;
                    data_user = {
                        count: selectedItem.amount,
                        name: selectedItem.name,
                        deleted: 1,
                        itemId: selectedItem.itemId,
                    };
                    item = selectedItem;
                    done = true;
                } else if (selectedItem.amount === 1 && !settings.amount) {
                    // Xóa một loại item khi số lượng bằng 1 và không chỉ định settings.amount
                    data_user = {
                        count: 0,
                        name: selectedItem.name,
                        deleted: 1,
                        itemId: selectedItem.itemId,
                    };
                    item = selectedItem;
                    data.inventory.splice(index, 1);
                    done = true;
                } else if (settings.amount && settings.amount !== "all") {
                    // Xử lý khi chỉ định settings.amount cụ thể
                    let amountToRemove = parseInt(settings.amount);
                    if (isNaN(amountToRemove) || amountToRemove <= 0) return {
                        error: true,
                        type: "Invalid-Amount",
                    };
                    if (amountToRemove > selectedItem.amount) return {
                        error: true,
                        type: "Invalid-Amount",
                    };
                    selectedItem.amount -= amountToRemove;
                    data_user = {
                        count: selectedItem.amount,
                        name: selectedItem.name,
                        deleted: amountToRemove,
                        itemId: selectedItem.itemId,
                    };
                    item = selectedItem;
                    done = true;
                };
            };
            if (!done) return {
                error: true,
                type: "Invalid-Operation",
            };
            // Lưu cập nhật vào cơ sở dữ liệu
            await this.currency.findOneAndUpdate(
                {
                    guildID: settings.guild.id || null,
                    userID: settings.user.id || null,
                },
                {
                    $set: {
                        inventory: data.inventory,
                    },
                },
                {
                    upsert: true,
                    useFindAndModify: false,
                }
            );
            return {
                error: false,
                inventory: data_user,
                rawData: data,
                item: item,
            };
        } catch (error) {
            console.error("có lỗi sảy ra:", error);
            return {
                error: true,
                type: "Internal-Error",
            };
        };
    };
    /**
     * Thực hiện hành động bán một số lượng mặt hàng từ kho của người dùng.
     * @param {Object} settings - Các thiết lập cho hành động bán mặt hàng.
     * @returns {Promise<Object>} - Kết quả của hành động bán mặt hàng.
     */
    async sell(settings) {
        let data = await this.findUser(settings, null, null, "sell");
        let item = null;
        let itemIndex = parseInt(settings.item) - 1;
        // Kiểm tra item có hợp lệ không
        if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= data.inventory.length) return {
            error: true,
            type: "Invalid-Item-Number",
        };
        // Lưu dữ liệu cũ
        const oldData = { ...data };
        // Biến đổi lượng mặt hàng
        let amountToRemove = settings.amount === "all" ? data.inventory[itemIndex].amount : parseInt(settings.amount || 1);
        // Kiểm tra số lượng mặt hàng bán phải lớn hơn 0
        if (amountToRemove <= 0) return {
            error: true,
            type: "Invalid-Amount",
        };
        // Kiểm tra và cập nhật số lượng mặt hàng
        if (amountToRemove >= data.inventory[itemIndex].amount) {
            // Nếu số lượng bán lớn hơn hoặc bằng số lượng trong kho
            amountToRemove = data.inventory[itemIndex].amount;
            item = data.inventory[itemIndex];
            data.inventory.splice(itemIndex, 1);
        } else {
            // Giảm số lượng mặt hàng trong kho
            data.inventory[itemIndex].amount -= amountToRemove;
            item = {
                ...data.inventory[itemIndex],
                amount: amountToRemove,
            };
        };
        // Giảm giá ngẫu nhiên, nhưng không vượt quá giá trị ban đầu
        const discountedPrice = Math.max(data.inventory[itemIndex].price - data.inventory[itemIndex].price * Math.random() * (0.30 - 0.10) + 0.10, 0);
        // Cộng dồn số tiền vào tài khoản người dùng (sau khi đã trừ giảm giá)
        data.wallet += discountedPrice;
        // Cập nhật dữ liệu người dùng
        await this.currency.findOneAndUpdate(
            {
                guildID: settings.guild.id || null,
                userID: settings.user.id || null,
            },
            {
                $set: {
                    inventory: data.inventory,
                    wallet: data.wallet,
                },
            },
            {
                upsert: true,
                useFindAndModify: false,
            }
        ).catch((e) => {
            console.error("có lỗi trong quá trình cập nhật kho đồ người dùng:", e);
        });
        // Gửi sự kiện cập nhật dữ liệu người dùng
        this.emit("userUpdate", oldData, data);
        // Trả về kết quả hành động bán mặt hàng
        return {
            error: false,
            discountedPrice: discountedPrice,
            inventory: item,
            rawData: data,
        };
    };
    /**
     * Chuyển một mục từ user1 sang user2 trong inventory và cập nhật vào cơ sở dữ liệu.
     * @param {Object} settings - Các thiết lập và thông tin mục cần chuyển.
     * @returns {Object} - Đối tượng chứa kết quả của thao tác chuyển.
     */
    async transferItem(settings) {
        if (!settings.guild) settings.guild = {
            id: null,
        };
        this.emit("debug", `[ CS => Gỡ lỗi ] : Đã thực thi hàm transferItem.`);
        this.emit("debug", `[ CS => Gỡ lỗi ] : Đang truy xuất Người dùng (Chức năng Mua).`);
        // Tìm người dùng user1 và user2
        let user1 = await this.findUser({ user: settings.user1, guild: settings.guild }, null, null, "transferItem");
        let user2 = await this.findUser({ user: settings.user2, guild: settings.guild }, null, null, "transferItem");
        let name, amountToTransfer, itemsLeft;
        // Kiểm tra và xử lý item
        let thing = parseInt(settings.item);
        if (!thing || isNaN(thing) || thing <= 0 || thing > user1.inventory.length) return {
            error: true,
            type: "No-Item",
        };
        thing = thing - 1;
        // Kiểm tra nếu item tồn tại trong inventory của user1
        if (!user1.inventory[thing]) return {
            error: true,
            type: "Invalid-Item",
        };
        // Xử lý amountToTransfer
        amountToTransfer = settings.amount;
        if (amountToTransfer === "all" || amountToTransfer === "max") {
            amountToTransfer = user1.inventory[thing].amount;
            name = user1.inventory[thing].name;
            itemsLeft = 0;
            // Kiểm tra xem user2 có item này không
            let user2ItemIndex = user2.inventory.findIndex(item => item.name === user1.inventory[thing].name);
            if (user2ItemIndex === -1) {
                user2.inventory.push({
                    name: user1.inventory[thing].name,
                    amount: amountToTransfer,
                });
            } else {
                user2.inventory[user2ItemIndex].amount += amountToTransfer;
            };
            // Xóa item khỏi inventory của user1
            user1.inventory.splice(thing, 1);
        } else {
            amountToTransfer = parseInt(amountToTransfer) || 1;
            if (amountToTransfer <= 0) return {
                error: true,
                type: "Invalid-Amount",
            };
            if (amountToTransfer > user1.inventory[thing].amount) return {
                error: true,
                type: "In-Sufficient-Amount",
            };
            name = user1.inventory[thing].name;
            let user2ItemIndex = user2.inventory.findIndex(item => item.name === user1.inventory[thing].name);
            if (user2ItemIndex === -1) {
                user2.inventory.push({
                    name: user1.inventory[thing].name,
                    amount: amountToTransfer,
                });
            } else {
                user2.inventory[user2ItemIndex].amount += amountToTransfer;
            };
            user1.inventory[thing].amount -= amountToTransfer;
            itemsLeft = user1.inventory[thing].amount;
        };
        // Đánh dấu inventory đã được thay đổi
        user1.markModified("inventory");
        user2.markModified("inventory");
        // Lưu cập nhật vào cơ sở dữ liệu
        await saveUser(user1, user2);
        return {
            error: false,
            type: "success",
            transferred: amountToTransfer,
            itemName: name,
            itemsLeft: itemsLeft,
        };
    };
    /**
     * Trả về thông tin chi tiết về các hoạt động của người dùng (hourly, hafly, daily, ...).
     * @param {Object} settings - Cài đặt cho người dùng.
     * @returns {Object} - Thông tin chi tiết về các hoạt động của người dùng.
     */
    async info(settings) {
        // Tìm người dùng dựa trên userID và guildID
        let data = await this.findUser(settings, null, null, "info");
        // Khởi tạo các biến kiểm tra thời gian cooldown của các hoạt động
        let lastHourlyy = true,
            lastHaflyy = true,
            lastDailyy = true,
            lastWeeklyy = true,
            lastMonthlyy = true,
            lastBeggedy = true,
            lastQuaterlyy = true,
            lastWorkk = true,
            lastYearlyy = true;
        // Kiểm tra và cập nhật trạng thái của các hoạt động dựa trên thời gian cooldown
        if (data.lastBegged !== null && (data.begTimeout || 240) - (Date.now() - data.lastBegged) / 1000 > 0) lastBeggedy = false;
        if (data.lastHourly !== null && 3600 - (Date.now() - data.lastHourly) / 1000 > 0) lastHourlyy = false;
        if (data.lastDaily !== null && 86400 - (Date.now() - data.lastDaily) / 1000 > 0) lastDailyy = false;
        if (data.lastHafly !== null && 43200 - (Date.now() - data.lastHafly) / 1000 > 0) lastHaflyy = false;
        if (data.lastQuaterly !== null && 12600 - (Date.now() - data.lastQuaterly) / 1000 > 0) lastQuaterlyy = false;
        if (data.lastWeekly !== null && 604800 - (Date.now() - data.lastWeekly) / 1000 > 0) lastWeeklyy = false;
        if (data.lastMonthly !== null && 2.592e6 - (Date.now() - data.lastMonthly) / 1000 > 0) lastMonthlyy = false;
        if (data.lastWork !== null && this.workCooldown - (Date.now() - data.lastWork) / 1000 > 0) lastWorkk = false;
        if (data.lastYearly !== null && (31536000000 - (Date.now() - data.lastYearly)) / 1000 > 0) lastYearlyy = false;
        // Trả về thông tin chi tiết về các hoạt động của người dùng
        return {
            error: false,
            rawData: data,
            info: Object.entries({
                Hourly: {
                    used: lastHourlyy,
                    timeLeft: this.parseSeconds(Math.floor(3600 - (Date.now() - data.lastHourly) / 1000)),
                },
                Hafly: {
                    used: lastHaflyy,
                    timeLeft: this.parseSeconds(Math.floor(43200 - (Date.now() - data.lastHafly) / 1000)),
                },
                Daily: {
                    used: lastDailyy,
                    timeLeft: this.parseSeconds(Math.floor(86400 - (Date.now() - data.lastDaily) / 1000)),
                },
                Weekly: {
                    used: lastWeeklyy,
                    timeLeft: this.parseSeconds(Math.floor(604800 - (Date.now() - data.lastWeekly) / 1000)),
                },
                Monthly: {
                    used: lastMonthlyy,
                    timeLeft: this.parseSeconds(Math.floor(2.592e6 - (Date.now() - data.lastMonthly) / 1000)),
                },
                Begged: {
                    used: lastBeggedy,
                    timeLeft: this.parseSeconds(Math.floor((data.begTimeout || 240) - (Date.now() - data.lastBegged) / 1000)),
                },
                Quaterly: {
                    used: lastQuaterlyy,
                    timeLeft: this.parseSeconds(Math.floor(12600 - (Date.now() - data.lastQuaterly) / 1000)),
                },
                Work: {
                    used: lastWorkk,
                    timeLeft: this.parseSeconds(Math.floor(12600 - (Date.now() - data.lastWork) / 1000)),
                },
                Yearly: {
                    used: lastYearlyy,
                    timeLeft: this.parseSeconds(Math.floor((31536000000 - (Date.now() - data.lastYearly)) / 1000)),
                },
            }),
        };
    };
    /**
     * Thực hiện công việc và cập nhật số tiền cho người dùng.
     * @param {Object} settings - Thông tin cài đặt.
     * @returns {Object} - Kết quả của công việc, bao gồm lỗi (nếu có).
     */
    async work(settings) {
        // Tìm người dùng dựa trên cài đặt
        let data = await this.findUser(settings, null, null, "work");
        const oldData = data;
        let lastWork = data.lastWork;
        let timeout = settings.cooldown;
        // Kiểm tra nếu công việc đang trong thời gian cooldown
        if (lastWork !== null && (timeout - (Date.now() - lastWork) / 1000) > 0) {
            return {
                error: true,
                type: "time",
                time: this.parseSeconds(Math.floor(timeout - (Date.now() - lastWork) / 1000)),
            };
        } else {
            // Tính số tiền nhận được từ công việc
            let amountt = Math.floor(Math.random() * (settings.maxAmount || 100)) + 1;
            data.lastWork = Date.now();
            // Cập nhật số tiền vào ví người dùng
            data = this.amount(data, "add", "wallet", amountt, "work");
            // Lưu người dùng
            await this.saveUser(data);
            // Phát sự kiện cập nhật người dùng
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                type: "success",
                workType: settings.replies[Math.floor(Math.random() * settings.replies.length)], // Chọn ngẫu nhiên loại công việc đã thực hiện
                amount: amountt,
            };
        };
    };
    /**
     * Chuyển đổi số giây thành định dạng chuỗi ngày, giờ, phút, giây.
     * @param {number} seconds - Số giây cần chuyển đổi.
     * @returns {string} - Chuỗi định dạng thời gian.
     */
    parseSeconds(seconds) {
        // Kiểm tra nếu số giây là số âm, trả về "0 Seconds"
        if (seconds < 0) return "0 giây";
        // Chuyển đổi và tính toán số ngày, giờ, phút và giây còn lại
        const days = Math.floor(seconds / 86400); // 1 ngày = 86400 giây
        seconds %= 86400; // Lấy phần dư sau khi chia cho 86400
        const hours = Math.floor(seconds / 3600); // 1 giờ = 3600 giây
        seconds %= 3600; // Lấy phần dư sau khi chia cho 3600
        const minutes = Math.floor(seconds / 60); // 1 phút = 60 giây
        seconds %= 60; // Lấy phần dư sau khi chia cho 60
        // Tạo chuỗi kết quả dựa trên các giá trị tính được
        if (days > 0) {
            return `${days} ngày, ${hours} giờ, ${minutes} phút`;
        } else if (hours > 0) {
            return `${hours} giờ, ${minutes} phút, ${seconds} giây`;
        } else if (minutes > 0) {
            return `${minutes} phút, ${seconds} giây`;
        };
        return `${seconds} giây`;
    };
    /**
     * Tìm kiếm người dùng trong cơ sở dữ liệu. Nếu không tìm thấy, tạo người dùng mới.
     * @param {Object} settings - Cài đặt cho người dùng.
     * @param {string} [uid] - ID người dùng.
     * @param {string} [gid] - ID guild.
     * @param {string} by - Tác nhân thực hiện hành động.
     * @returns {Object} - Người dùng tìm thấy hoặc mới tạo.
     */
    async findUser(settings, uid, gid, by) {
        // Kiểm tra và định dạng lại các thuộc tính user và guild trong settings
        settings.user = typeof settings.user === "string" ? { id: settings.user } : settings.user || { id: null };
        settings.guild = typeof settings.guild === "string" ? { id: settings.guild } : settings.guild || { id: null };
        // Tìm kiếm người dùng trong cơ sở dữ liệu
        let find = await this.currency.findOne({
            userID: uid || settings.user.id,
            guildID: gid || settings.guild.id || null,
        });
        // console.log(find);
        // Nếu không tìm thấy người dùng, tạo người dùng mới
        if (!find) find = await this.makeUser(settings, false, uid, gid);
        // Thiết lập giá trị mặc định cho streak
        const streakFields = ["hourly", "daily", "weekly", "monthly", "yearly", "hafly", "quaterly"];
        streakFields.forEach((field) => {
            if (!find.streak) find.streak = {};
            if (!find.streak[field]) find.streak[field] = 0;
        });
        // Thiết lập giá trị mặc định cho bankSpace nếu có maxBank
        if (this.maxBank > 0 && find.bankSpace == 0) {
            find.bankSpace = this.maxBank;
        };
        // Phát ra sự kiện userFetch và xử lý ngoại lệ
        try {
            this.emit("userFetch", find, by.split(" ").map(w => w[0].toUpperCase() + w.substring(1).toLowerCase()).join(" "));
        } catch (e) {
            console.error("Lỗi khi phát ra sự kiện userFetch:", e);
        };
        return find;
    };
    /**
     * Tạo người dùng mới trong cơ sở dữ liệu.
     * @param {Object} settings - Cài đặt cho người dùng.
     * @param {boolean} [user2=false] - Xác định có phải là người dùng thứ hai không.
     * @param {string} [userID] - ID người dùng.
     * @param {string} [guildID] - ID guild.
     * @returns {Object} - Người dùng mới tạo.
     */
    async makeUser(settings, user2 = false, userID, guildID) {
        // Kiểm tra và định dạng lại các thuộc tính user và guild trong settings
        settings.user = typeof settings.user === "string" ? { id: settings.user } : settings.user || { id: null };
        settings.guild = typeof settings.guild === "string" ? { id: settings.guild } : settings.guild || { id: null };
        // Lấy thông tin người dùng dựa trên tham số đầu vào
        const user = user2 ? settings.user2 : userID || settings.user;
        // Tạo người dùng mới trong cơ sở dữ liệu
        const newUser = await this.currency.create({
            userName: user.globalName,
            userID: user.id,
            guildID: guildID || settings.guild.id || null,
            wallet: this.wallet || 0,
            bank: this.bank || 0,
            bankSpace: this.maxBank || 0,
            streak: {
                hourly: 0,
                daily: 0,
                weekly: 0,
                monthly: 0,
                yearly: 0,
                hafly: 0,
                quaterly: 0,
            },
        });
        // Phát ra sự kiện userCreate và xử lý ngoại lệ.
        try {
            this.emit("userCreate", newUser);
        } catch (e) {
            console.error("Lỗi khi phát ra sự kiện userCreate:", e);
        };
        return newUser;
    };
    /**
     * Hàm sleep để đợi một khoảng thời gian nhất định.
     * @param {number} milliseconds - Số mili giây cần đợi.
     * @returns {Promise} - Một Promise giải quyết sau khoảng thời gian đã đợi.
     */
    sleep(milliseconds) {
        return new Promise((resolve) => setTimeout(resolve, milliseconds))
    };
    /**
     * Lưu dữ liệu người dùng với thời gian đợi ngẫu nhiên.
     * @param {Object} data - Dữ liệu người dùng đầu tiên.
     * @param {Object} [data2] - Dữ liệu người dùng thứ hai, nếu có.
     */
    async saveUser(data, data2) {
        // Đợi một khoảng thời gian ngẫu nhiên từ 100ms đến 1000ms
        await this.sleep(Math.floor(Math.random() * 10 + 1) * 100);
        // Thử lưu dữ liệu người dùng đầu tiên
        try {
            await data.save();
        } catch (error) {
            console.error(`ĐÃ XẢY RA LỖI TRONG QUÁ TRÌNH LƯU DỮ LIỆU:\n${'='.repeat(50)}\n${error}\n${'='.repeat(50)}`);
        };
        // Nếu có dữ liệu người dùng thứ hai, thử lưu nó
        if (data2) {
            try {
                await data2.save();
            } catch (error) {
                console.error(`ĐÃ XẢY RA LỖI TRONG QUÁ TRÌNH LƯU DỮ LIỆU:\n${'='.repeat(50)}\n${error}\n${'='.repeat(50)}`);
            };
        };
    };
    /**
     * Cập nhật số tiền của người dùng trong ví hoặc ngân hàng.
     * @param {Object} data - Dữ liệu người dùng.
     * @param {string} type - Loại thay đổi, "add" để thêm và "remove" để bớt tiền.
     * @param {string} where - Vị trí thay đổi, "wallet" hoặc "bank".
     * @param {number} amount - Số tiền thay đổi.
     * @param {string} by - Người thực hiện thay đổi.
     * @returns {Object} - Dữ liệu người dùng đã cập nhật.
     */
    amount(data, type = "add", where = "wallet", amount, by) {
        // Khởi tạo không gian ngân hàng nếu chưa có
        if (!data.bankSpace) data.bankSpace = this.maxBank || 0;
        // Cập nhật số tiền trong ngân hàng hoặc ví
        if (where === "bank") {
            if (type === "add") {
                data.bank += amount;
            } else {
                data.bank -= amount;
            };
        } else {
            if (type === "add") {
                data.wallet += amount;
            } else {
                data.wallet -= amount;
            };
        };
        // Điều chỉnh số tiền nếu vượt quá không gian ngân hàng
        if (data.bankSpace > 0 && data.bank > data.bankSpace) {
            const excess = data.bank - data.bankSpace;
            data.bank = data.bankSpace;
            data.wallet += excess;
        };
        // Cập nhật tổng tài sản ròng
        if (!data.networth) data.networth = 0;
        data.networth = data.bank + data.wallet;
        // Phát sự kiện cập nhật số dư
        try {
            this.emit("balanceUpdate", data, by.split(" ").map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase()).join(" "));
        } catch (error) {
            console.error("Lỗi balanceUpdate:", error);
        };
        // Trả về dữ liệu người dùng đã cập nhật
        return data;
    };
    /**
     * Thiết lập dung lượng ngân hàng cho người dùng trong một guild.
     * @param {string} userID - ID của người dùng.
     * @param {string} guildID - ID của guild.
     * @param {number} newAmount - Số lượng mới của dung lượng ngân hàng.
     * @returns {Object} - Đối tượng kết quả chứa thông tin về thành công hoặc lỗi.
     */
    async setBankSpace(userID, guildID, newAmount) {
        // Tìm người dùng dựa trên userID và guildID
        let data = await this.findUser({}, userID, guildID, "setBankSpace");
        // Kiểm tra newAmount có phải là số và không được null hoặc undefined
        newAmount = parseInt(newAmount);
        if (!Number.isInteger(newAmount)) return {
            error: true,
            type: "no-amount-provided",
            rawData: data,
        };
        // Sao chép dữ liệu cũ để phát ra sự kiện sau này
        let oldData = { ...data };
        // Cập nhật dung lượng ngân hàng mới
        data.bankSpace = newAmount;
        // Lưu lại dữ liệu người dùng
        await this.saveUser(data);
        // Phát ra sự kiện userUpdate nếu có sự thay đổi
        if (oldData.bankSpace !== data.bankSpace) {
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                type: "success",
                amount: data.bankSpace,
                rawData: data,
            };
        } else {
            return {
                error: true,
                type: "same-amount",
                rawData: data,
            };
        };
    };

    /**
     * Rút tiền từ ngân hàng của người dùng vào ví.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho quá trình rút tiền.
     * @returns {Object} - Đối tượng kết quả chứa thông tin về thành công hoặc lỗi.
     */
    async withdraw(settings) {
        let data = await this.findUser(settings, null, null, "withdraw");
        const oldData = { ...data }; // Sao chép dữ liệu cũ để phát ra sự kiện sau này
        let money = String(settings.amount);
        // Kiểm tra điều kiện đặc biệt trước khi chuyển đổi money sang số
        if (!money) return {
            error: true,
            type: "money",
        };
        if (money === "all" || money === "max") {
            if (money.includes("-")) return {
                error: true,
                type: "negative-money",
            };
            if (data.bank < 1) return {
                error: true,
                type: "no-money",
            };
            // Logic xử lý khi money là "all" hoặc "max"
            data.wallet += data.bank;
            data.bank = 0;
            data.networth = data.bank + data.wallet;
            // Lưu data vào cơ sở dữ liệu
            await this.saveUser(data);
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                rawData: data,
                type: "all-success",
            };
        } else {
            // Chuyển đổi money sang số nguyên
            money = parseInt(money);
            // Kiểm tra điều kiện khi money là một số nguyên dương
            if (isNaN(money)) return {
                error: true,
                type: "money",
            };
            if (money > data.bank) return {
                error: true,
                type: "low-money",
            };
            // Logic xử lý khi money là một số nguyên dương hợp lệ
            data.wallet += money;
            data.bank -= money;
            data.networth = data.bank + data.wallet;
            // Lưu data vào cơ sở dữ liệu
            await this.saveUser(data);
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                type: "success",
                amount: money,
                rawData: data,
            };
        };
    };
    /**
     * Nạp tiền vào ngân hàng của người dùng.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho quá trình nạp tiền.
     * @returns {Object} - Đối tượng kết quả chứa thông tin về thành công hoặc lỗi.
     */
    async deposite(settings) {
        let data = await this.findUser(settings, null, null, "deposite");
        const oldData = { ...data }; // Sao chép dữ liệu cũ để phát ra sự kiện sau này
        let money = String(settings.amount);
        // Kiểm tra điều kiện đặc biệt trước khi chuyển đổi money sang số
        if (!money) return {
            error: true,
            type: "money",
        };
        if (money === "all" || money === "max") {
            if (String(money).includes("-")) return {
                error: true,
                type: "negative-money",
            };
            if (data.wallet === 0) return {
                error: true,
                type: "no-money",
            };
            if (data.bankSpace > 0 && money === "all" && data.bank === data.bankSpace) return {
                error: true,
                rawData: data,
                type: "bank-full",
            };
            // Chuyển đổi money sang số nguyên
            money = parseInt(money);
            // Logic xử lý khi money là "all" hoặc "max"
            data.bank += data.wallet;
            data.wallet = 0;
            if (data.bankSpace > 0 && data.bank > data.bankSpace) {
                const diff = data.bank - data.bankSpace;
                data.bank = data.bankSpace;
                data.wallet += diff;
            };
            data.networth = data.bank + data.wallet;
            await this.saveUser(data);
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                rawData: data,
                type: "all-success",
            };
        } else {
            // Chuyển đổi money sang số nguyên
            money = parseInt(money);
            // Kiểm tra điều kiện khi money không phải là "all" hoặc "max"
            if (!money) return {
                error: true,
                type: "money",
            };
            if (String(money).includes("-")) return {
                error: true,
                type: "negative-money",
            };
            if (money > data.wallet) return {
                error: true,
                type: "low-money",
            };
            if (data.bankSpace > 0 && data.bank === data.bankSpace) return {
                error: true,
                type: "bank-full",
                rawData: data,
            };
            // Logic xử lý khi money là một số nguyên dương
            data.bank += money;
            if (data.wallet - money < 0) {
                const diff = data.wallet - money;
                data.wallet = 0;
                data.bank -= diff;
            } else {
                data.wallet -= money;
            };
            data.networth = data.bank + data.wallet;
            if (data.bankSpace > 0 && data.bank > data.bankSpace) {
                const diff = data.bank - data.bankSpace;
                data.bank = data.bankSpace;
                data.wallet += diff;
            };
            await this.saveUser(data);
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                rawData: data,
                type: "success",
                amount: money,
            };
        };
    };
    /**
     * Thêm số tiền vào ví hoặc ngân hàng của tất cả người dùng trong một guild.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho quá trình thêm tiền.
     * @returns {Object} - Đối tượng kết quả chứa thông tin về thành công hoặc lỗi.
     */
    async addMoneyToAllUsers(settings) {
        // Kiểm tra số tiền âm
        if (parseInt(settings.amount) < 0) return {
            error: true,
            type: "negative-money",
        };
        let amountt = parseInt(settings.amount) || 0;
        // Thiết lập giá trị cho settings.guild
        settings.guild = typeof settings.guild === "string" ? { id: settings.guild } : settings.guild || { id: null };
        // Tìm tất cả người dùng có trong guild
        let data = await this.currency.find({ guildID: settings.guild.id || null });
        // Kiểm tra nếu không có dữ liệu
        if (!data || data.length === 0) return {
            error: true,
            type: "no-users",
        };
        const oldData = [...data]; // Sao chép dữ liệu cũ để phát ra sự kiện sau này
        // Lặp qua từng người dùng và thực hiện xử lý
        data.forEach((user) => {
            if (settings.wheretoPutMoney === "bank") {
                user = this.amount(user, "add", "bank", amountt, "addMoneyToAllUsers");
            } else {
                user = this.amount(user, "add", "wallet", amountt, "addMoneyToAllUsers");
            };
        });
        // Phát ra sự kiện usersUpdate với dữ liệu cũ và mới
        this.emit("usersUpdate", oldData, data);
        // Lưu lại tất cả người dùng đã thay đổi
        await Promise.all(data.map((user) => user.save()));
        // Trả về kết quả thành công
        return {
            error: false,
            type: "success",
            rawData: data,
        };
    };
    /**
     * Thêm số tiền vào tài khoản người dùng.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho quá trình thêm tiền.
     * @returns {Object} - Đối tượng kết quả chứa thông tin về thành công hoặc lỗi.
     */
    async addMoney(settings) {
        let data = await this.findUser(settings, null, null, "addMoney");
        const oldData = data;
        // Kiểm tra số tiền âm
        if (parseInt(settings.amount) < 0) return {
            error: true,
            type: "negative-money",
        };
        let amountt = parseInt(settings.amount) || 0;
        let actionType = settings.wheretoPutMoney === "bank" ? "addBank" : "addWallet";
        // Thực hiện thay đổi số tiền
        data = this.amount(data, "add", actionType, amountt, "addMoney");
        // Phát ra sự kiện userUpdate
        this.emit("userUpdate", oldData, data);
        // Lưu lại dữ liệu người dùng
        await this.saveUser(data);
        // Trả về kết quả thành công
        return {
            error: false,
            type: "success",
            rawData: data,
        };
    };
    /**
     * Xóa số tiền từ người dùng.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho quá trình xóa tiền.
     * @returns {Object} - Đối tượng kết quả chứa thông tin về thành công hoặc lỗi.
     */
    async removeMoney(settings) {
        let data = await this.findUser(settings, null, null, "removeMoney");
        const oldData = data;
        // Kiểm tra số tiền âm
        if (parseInt(settings.amount) < 0) return {
            error: true,
            type: "negative-money",
        };
        let amountt = parseInt(settings.amount) || 0;
        let actionType = settings.wheretoPutMoney === "bank" ? "removeBank" : "removeWallet";
        // Xử lý trường hợp 'all' hoặc 'max'
        if (settings.amount === "all" || settings.amount === "max") {
            if (settings.wheretoPutMoney === "bank") {
                data.bank = 0;
            } else {
                data.wallet = 0;
            };
        } else {
            // Thực hiện thay đổi số tiền
            data = this.amount(data, "remove", actionType, amountt, "removeMoney");
        };
        // Lưu lại dữ liệu người dùng
        await this.saveUser(data);
        // Phát ra sự kiện userUpdate
        this.emit("userUpdate", oldData, data);
        // Trả về kết quả thành công
        return {
            error: false,
            type: "success",
            rawData: data,
        };
    };
    /**
     * Xóa số tiền từ tất cả người dùng trong một guild.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho quá trình xóa tiền.
     * @returns {Object} - Đối tượng kết quả chứa thông tin về thành công hoặc lỗi.
     */
    async removeMoneyFromAllUsers(settings) {
        // Kiểm tra số tiền âm
        if (parseInt(settings.amount) < 0) return {
            error: true,
            type: "negative-money",
        };
        // Thiết lập giá trị cho settings.guild
        settings.guild = typeof settings.guild === "string" ? { id: settings.guild } : settings.guild || { id: null };
        // Tìm tất cả người dùng có trong guild
        let data = await this.currency.find({ guildID: settings.guild.id || null });
        // Kiểm tra nếu không có dữ liệu
        if (!data || data.length === 0) return {
            error: true,
            type: "no-users",
        };
        const oldData = [...data]; // Sao chép dữ liệu cũ để phát ra sự kiện sau này
        // Lặp qua từng người dùng và thực hiện xử lý
        data.forEach((user) => {
            if (settings.wheretoPutMoney === "bank") {
                if (settings.amount === "all" || settings.amount === "max") {
                    user.bank = 0;
                } else {
                    user = this.amount(user, "remove", "bank", parseInt(settings.amount) || 0, "removeMoneyFromAllUsers");
                };
            } else {
                if (settings.amount === "all" || settings.amount === "max") {
                    user.wallet = 0;
                } else {
                    user = this.amount(user, "remove", "wallet", parseInt(settings.amount) || 0, "removeMoneyFromAllUsers");
                };
            };
        });
        // Phát ra sự kiện usersUpdate với dữ liệu cũ và mới
        this.emit("usersUpdate", oldData, data);
        // Lưu lại tất cả người dùng đã thay đổi
        await Promise.all(data.map((user) => user.save()));
        // Trả về kết quả thành công
        return {
            error: false,
            type: "success",
            rawData: data,
        };
    };
    /**
     * Chuyển tiền từ user1 sang user2.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho việc chuyển tiền.
     * @returns {Object} - Đối tượng chứa kết quả của việc chuyển tiền.
     */
    async transferMoney(settings) {
        // Thiết lập giá trị mặc định cho settings.user và settings.guild nếu chưa có
        settings.user = typeof settings.user === 'string' ? { id: settings.user } : settings.user || {};
        settings.guild = typeof settings.guild === 'string' ? { id: settings.guild } : settings.guild || { id: null };
        // Tìm user1 và lấy dữ liệu cũ của user1
        let user1 = await this.findUser(settings, null, null, "transferMoney");
        const oldData = user1;
        // Tìm user2 hoặc tạo mới nếu chưa tồn tại và lấy dữ liệu cũ của user2
        let user2 = await this.currency.findOne({ userID: settings.user2.id, guildID: settings.guild.id || null }) || await this.makeUser(settings, true);
        const oldData1 = user2;
        // Chuyển đổi amount sang kiểu số nguyên
        let money = parseInt(settings.amount);
        // Kiểm tra xem user1 có đủ tiền để chuyển không
        if (user1.wallet < money) return {
            error: true,
            type: "low-money",
        };
        // Cập nhật số tiền cho user1 và user2
        user1 = this.amount(user1, "remove", "wallet", money, "transferMoney");
        user2 = this.amount(user2, "add", "wallet", money, "transferMoney");
        // Lưu lại thông tin user1 và user2
        await this.saveUser(user1, user2);
        // Phát ra sự kiện userUpdate với các dữ liệu cũ và mới của user1 và user2
        this.emit("userUpdate", oldData, user1, oldData1, user2);
        // Trả về kết quả thành công và thông tin chi tiết về giao dịch
        return {
            error: false,
            type: "success",
            money: money,
            user: settings.user,
            user2: settings.user2,
            rawData: user1,
            rawData1: user2,
        };
    }
    /**
     * Hàm xử lý hành động xin xỏ tiền từ người dùng.
     * @param {Object} settings - Các thiết lập cho hành động xin xỏ.
     * @returns {Object} - Kết quả của hành động xin xỏ.
     */
    async beg(settings) {
        // Tìm thông tin người dùng
        let data = await this.findUser(settings, null, null, "beg");
        const oldData = { ...data }; // Sao chép dữ liệu cũ để so sánh
        let lastBegged = data.lastBegged;
        let timeout = 240;
        if (parseInt(settings.cooldown)) timeout = parseInt(settings.cooldown);
        // Kiểm tra thời gian chờ giữa các lần xin xỏ
        if (lastBegged !== null && timeout - (Date.now() - lastBegged) / 1000 > 0) {
            return {
                error: true,
                type: "time",
                time: this.parseSeconds(Math.floor(timeout - (Date.now() - lastBegged) / 1000)),
            };
        } else {
            // Tính toán số tiền xin xỏ ngẫu nhiên
            const minAmount = settings.minAmount || 200;
            const maxAmount = settings.maxAmount || 600;
            const amountt = Math.round(minAmount + Math.random() * (maxAmount - minAmount));
            // Cập nhật thời gian lần xin xỏ cuối cùng
            data.lastBegged = Date.now();
            data.begTimeout = timeout;
            // Thêm số tiền vào ví của người dùng
            data = this.amount(data, "add", "wallet", amountt, "beg");
            // Lưu dữ liệu người dùng đã cập nhật
            await this.saveUser(data);
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                type: "success",
                amount: amountt,
            };
        };
    };
    /**
     * Thực hiện việc phát hành tiền hàng giờ cho người dùng.
     * @param {Object} settings - Các thiết lập cho phần thưởng hàng giờ.
     * @returns {Object} - Kết quả của việc nhận thưởng hàng giờ.
     */
    async hourly(settings) {
        // Lấy thông tin người dùng
        let data = await this.findUser(settings, null, null, "hourly");
        const oldData = { ...data }; // Sao chép dữ liệu cũ để so sánh
        let lastHourly = data.lastHourly;
        const timeout = 3600; // Thời gian chờ (1 giờ) tính bằng giây
        // Kiểm tra xem người dùng có thể nhận thưởng hàng giờ hay không
        if (lastHourly !== null && timeout - (Date.now() - lastHourly) / 1000 > 0) {
            return {
                error: true,
                type: "time",
                time: this.parseSeconds(Math.floor(timeout - (Date.now() - lastHourly) / 1000)),
            };
        } else {
            // Cập nhật thời gian nhận thưởng lần cuối
            data.lastHourly = Date.now();
            // Thêm số tiền vào ví của người dùng
            data = this.amount(data, "add", "wallet", settings.amount, "hourly");
            // Đặt lại chuỗi nếu lần nhận thưởng cuối cùng cách hơn hai lần thời gian chờ
            if ((Date.now() - lastHourly) / 1000 > timeout * 2) {
                data.streak.hourly = 0;
            };
            // Tăng chuỗi nhận thưởng hàng giờ
            data.streak.hourly += 1;
            // Lưu dữ liệu người dùng đã cập nhật
            await this.saveUser(data);
            // Phát sự kiện cập nhật người dùng
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                type: "success",
                amount: settings.amount,
                rawData: data,
            };
        };
    };
    /**
     * Thực hiện việc phát hành tiền hàng ngày (daily) cho người dùng.
     * @param {Object} settings - Các thiết lập cho phần thưởng hàng ngày.
     * @returns {Object} - Kết quả của việc nhận thưởng hàng ngày.
     */
    async daily(settings) {
        // Lấy thông tin người dùng
        let data = await this.findUser(settings, null, null, "daily");
        const oldData = { ...data }; // Sao chép dữ liệu cũ để so sánh
        let daily = data.lastDaily;
        const timeout = 86400; // Thời gian chờ (24 giờ) tính bằng giây
        // Kiểm tra xem người dùng có thể nhận thưởng hàng ngày hay không
        if (daily !== null && timeout - (Date.now() - daily) / 1000 > 0) {
            return {
                error: true,
                type: "time",
                time: this.parseSeconds(Math.floor(timeout - (Date.now() - daily) / 1000)),
            };
        } else {
            // Cập nhật thời gian nhận thưởng lần cuối
            data.lastDaily = Date.now();
            // Thêm số tiền vào ví của người dùng
            data = this.amount(data, "add", "wallet", settings.amount, "daily");
            // Đặt lại chuỗi nếu lần nhận thưởng cuối cùng cách hơn hai lần thời gian chờ
            if ((Date.now() - daily) / 1000 > timeout * 2) {
                data.streak.daily = 0;
            };
            // Tăng chuỗi nhận thưởng hàng ngày
            data.streak.daily += 1;
            // Lưu dữ liệu người dùng đã cập nhật
            await this.saveUser(data);
            // Phát sự kiện cập nhật người dùng
            this.emit("userUpdate", oldData, data);
            return {
                error: false,
                type: "success",
                amount: settings.amount,
                rawData: data,
            };
        };
    };
    /**
     * Thực hiện việc phát hành tiền nửa ngày (hafly) cho người dùng.
     * @param {Object} settings - Cài đặt cho hành động nửa ngày.
     * @returns {Object} - Kết quả của hành động nửa ngày, bao gồm thông tin lỗi hoặc thành công.
     */
    async hafly(settings) {
        // Lấy dữ liệu người dùng từ cơ sở dữ liệu
        let data = await this.findUser(settings, null, null, "hafly");
        // Tạo một bản sao của dữ liệu hiện tại để tham chiếu
        const oldData = { ...data };
        // Các hằng số cho khoảng thời gian timeout nửa ngày (12 giờ)
        const hafly = data.lastHafly;
        const timeout = 43200;  // 12 giờ
        // Kiểm tra xem hành động nửa ngày gần đây có nằm trong khoảng thời gian timeout không
        if (hafly !== null && (Date.now() - hafly) / 1000 < timeout) return { // Trả về lỗi nếu hành động nửa ngày vẫn nằm trong khoảng thời gian timeout
            error: true,
            type: "time",
            time: this.parseSeconds(Math.floor(timeout - (Date.now() - hafly) / 1000)),
        };
        // Cập nhật thời gian thực hiện hành động nửa ngày mới nhất
        data.lastHafly = Date.now();
        // Thêm số tiền vào ví của người dùng
        data = this.amount(data, "add", "wallet", settings.amount, "hafly");
        // Đặt lại streak nửa ngày nếu thời gian timeout đã nhân đôi
        if ((Date.now() - hafly) / 1000 > timeout * 2) {
            data.streak.hafly = 0;
        };
        // Tăng streak nửa ngày lên 1
        data.streak.hafly += 1;
        // Lưu dữ liệu người dùng đã cập nhật
        await this.saveUser(data);
        // Phát ra sự kiện để thông báo về việc cập nhật thông tin người dùng
        this.emit("userUpdate", oldData, data);
        // Trả về phản hồi thành công
        return {
            error: false,
            type: "success",
            amount: settings.amount,
            rawData: data,
        };
    };
    /**
     * Thực hiện việc phát hành tiền hàng tuần cho người dùng.
     * @param {object} settings - Các thiết lập bao gồm thông tin người dùng và số tiền được cộng vào ví.
     * @returns {object} - Kết quả thực hiện, bao gồm thông tin về lỗi nếu có, số tiền và dữ liệu người dùng.
     */
    async weekly(settings) {
        // Lấy dữ liệu người dùng từ cơ sở dữ liệu
        let data = await this.findUser(settings, null, null, "weekly");
        // Tạo một bản sao của dữ liệu hiện tại để tham chiếu
        const oldData = { ...data };
        // Các hằng số cho khoảng thời gian timeout của tuần
        let weekly = data.lastWeekly;
        let timeout = 604800;
        // Kiểm tra xem hành động hàng tuần gần đây có nằm trong khoảng thời gian timeout không
        if (weekly !== null && timeout - (Date.now() - weekly) / 1000 > 0) {
            // Trả về lỗi nếu hành động hàng tuần vẫn nằm trong khoảng thời gian timeout
            return {
                error: true,
                type: "time",
                time: this.parseSeconds(Math.floor(timeout - (Date.now() - weekly) / 1000)),
            };
        } else {
            // Thực hiện hành động hàng tuần vì đã vượt qua khoảng thời gian timeout
            // Cập nhật thời gian thực hiện hành động hàng tuần mới nhất
            data.lastWeekly = Date.now();
            // Thêm số tiền vào ví của người dùng
            data = this.amount(data, "add", "wallet", settings.amount, "weekly");
            // Đặt lại streak hàng tuần nếu thời gian timeout đã nhân đôi
            if ((Date.now() - data.lastWeekly) / 1000 > timeout * 2) {
                data.streak.weekly = 0;
            };
            // Tăng streak hàng tuần lên 1
            data.streak.weekly += 1;
            // Lưu dữ liệu người dùng đã cập nhật
            await this.saveUser(data);
            // Phát ra sự kiện để thông báo về việc cập nhật thông tin người dùng
            this.emit("userUpdate", oldData, data);
            // Trả về phản hồi thành công
            return {
                error: false,
                type: "success",
                amount: settings.amount,
                rawData: data,
            };
        };
    };
    /**
     * Thực hiện việc phát hành tiền hàng tháng cho người dùng.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho hoạt động hàng tháng.
     * @returns {Object} - Đối tượng chứa kết quả của hoạt động hàng tháng.
     */
    async monthly(settings) {
        // Tìm và lấy dữ liệu của người dùng
        let data = await this.findUser(settings, null, null, "monthly");
        const oldData = data;
        // Kiểm tra thời gian lastMonthly và timeout
        let monthly = data.lastMonthly;
        let timeout = 2.592e6;
        if (monthly !== null && Date.now() - monthly < timeout * 1000) {
            // Nếu chưa đủ thời gian giữa các lần hoạt động hàng tháng
            return {
                error: true,
                type: "time",
                time: this.parseSeconds(Math.floor((monthly + timeout * 1000 - Date.now()) / 1000)),
            };
        } else {
            // Thực hiện hoạt động hàng tháng
            data.lastMonthly = Date.now();
            data = this.amount(data, "add", "wallet", settings.amount, "monthly");
            // Đặt lại streak hàng tháng nếu quá thời gian kéo dài
            if (monthly !== null && (Date.now() - monthly) / 1000 > timeout * 2) {
                data.streak.monthly = 0;
            };
            data.streak.monthly += 1;
            // Lưu lại thông tin người dùng
            await this.saveUser(data);
            // Phát ra sự kiện cập nhật người dùng
            this.emit("userUpdate", oldData, data);
            // Trả về kết quả thành công và thông tin chi tiết
            return {
                error: false,
                type: "success",
                amount: settings.amount,
                rawData: data,
            };
        };
    };
    /**
     * Thực hiện việc phát hành tiền hàng năm cho người dùng.
     * @param {Object} settings - Các thiết lập và thông tin cần thiết cho hoạt động hàng năm.
     * @returns {Object} - Đối tượng chứa kết quả của hoạt động hàng năm.
     */
    async yearly(settings) {
        // Tìm và lấy dữ liệu của người dùng
        let data = await this.findUser(settings, null, null, "yearly");
        const oldData = data;
        // Kiểm tra thời gian lastYearly và timeout
        let yearly = data.lastYearly;
        let timeout = 31536000000; // 1 năm tính bằng mili giây
        if (yearly !== null && Date.now() - yearly < timeout) {
            // Nếu chưa đủ thời gian giữa các lần hoạt động hàng năm
            return {
                error: true,
                type: "time",
                time: this.parseSeconds(Math.floor((timeout - (Date.now() - yearly)) / 1000)),
            };
        } else {
            // Thực hiện hoạt động hàng năm
            data.lastYearly = Date.now();
            data = this.amount(data, "add", "wallet", settings.amount, "yearly");
            // Đặt lại streak hàng năm nếu quá thời gian kéo dài
            if (yearly !== null && (Date.now() - yearly) / 1000 > timeout * 2) {
                data.streak.yearly = 0;
            };
            data.streak.yearly += 1;
            // Lưu lại thông tin người dùng
            await this.saveUser(data);
            // Phát ra sự kiện cập nhật người dùng
            this.emit("userUpdate", oldData, data);
            // Trả về kết quả thành công và thông tin chi tiết
            return {
                error: false,
                type: "success",
                amount: settings.amount,
                rawData: data,
            };
        };
    };
    /**
     * Thực hiện việc phát hành tiền hàng quý cho người dùng.
     * @param {Object} settings - Các cài đặt cho hoạt động.
     * @param {number} settings.amount - Số tiền để thêm vào ví của người dùng.
     * @returns {Object} Kết quả của hoạt động.
     */
    async quaterly(settings) {
        // Lấy dữ liệu người dùng từ cơ sở dữ liệu
        let data = await this.findUser(settings, null, null, "quaterly");
        // Tạo một bản sao của dữ liệu hiện tại để tham chiếu
        const oldData = { ...data };
        // Các hằng số cho khoảng thời gian timeout hàng quý
        const quaterly = data.lastQuaterly;
        const timeout = 21600;  // 6 giờ
        // Kiểm tra xem hành động hàng quý gần đây có nằm trong khoảng thời gian timeout không
        if (quaterly !== null && (Date.now() - quaterly) / 1000 < timeout) return { // Trả về lỗi nếu hành động hàng quý vẫn nằm trong khoảng thời gian timeout
            error: true,
            type: "time",
            time: this.parseSeconds(Math.floor(timeout - (Date.now() - quaterly) / 1000)),
        };
        // Cập nhật thời gian thực hiện hành động hàng quý mới nhất
        data.lastQuaterly = Date.now();
        // Thêm số tiền vào ví của người dùng
        data = this.amount(data, "add", "wallet", settings.amount, "quaterly");
        // Đặt lại streak hàng quý nếu thời gian timeout đã nhân đôi
        if ((Date.now() - quaterly) / 1000 > timeout * 2) {
            data.streak.quaterly = 0;
        };
        // Tăng streak hàng quý lên 1
        data.streak.quaterly += 1;
        // Lưu dữ liệu người dùng đã cập nhật
        await this.saveUser(data);
        // Phát ra sự kiện để thông báo về việc cập nhật thông tin người dùng
        this.emit("userUpdate", oldData, data);
        // Trả về phản hồi thành công
        return {
            error: false,
            type: "success",
            amount: settings.amount,
            rawData: data,
        };
    };
    /**
     * Hàm xử lý hành động cướp tiền giữa hai người dùng.
     * @param {Object} settings - Các thiết lập cho hành động cướp tiền.
     * @returns {Object} - Kết quả của hành động cướp tiền.
     */
    async rob(settings) {
        // Xử lý ID guild và user nếu chúng là chuỗi
        if (typeof settings.guild === "string") settings.guild = { id: settings.guild };
        if (typeof settings.user === "string") settings.user = { id: settings.user };
        if (!settings.guild) settings.guild = { id: null };
        // Tìm thông tin người dùng đầu tiên
        let user1 = await this.findUser(settings, null, null, "rob");
        const oldData = { ...user1 }; // Sao chép dữ liệu cũ để so sánh
        // Tìm thông tin người dùng thứ hai
        let user2 = await this.currency.findOne({ userID: settings.user2.id, guildID: settings.guild.id || null });
        if (!user2) user2 = await this.makeUser(settings, true);
        const oldData2 = { ...user2 }; // Sao chép dữ liệu cũ để so sánh
        let lastRob = user1.lastRob;
        const timeout = settings.cooldown;
        // Kiểm tra thời gian chờ giữa các lần cướp
        if (lastRob !== null && timeout - (Date.now() - lastRob) / 1000 > 0) return {
            error: true,
            type: "time",
            time: this.parseSeconds(Math.floor(timeout - (Date.now() - lastRob) / 1000)),
        };
        // Kiểm tra số dư ví của người dùng đầu tiên
        if (user1.wallet < settings.minAmount - 2) return {
            error: true,
            type: "low-money",
            minAmount: settings.minAmount,
        };
        // Kiểm tra số dư ví của người dùng thứ hai
        if (user2.wallet < settings.minAmount - 2) return {
            error: true,
            type: "low-wallet",
            user2: settings.user2,
            minAmount: settings.minAmount,
        };
        // Tính toán số tiền cướp ngẫu nhiên
        let max = settings.maxRob || 1000;
        max = max < 1000 ? 1000 : max;
        let random = Math.floor(Math.random() * (max - 99)) + 99;
        random = random > user2.wallet ? user2.wallet : random;
        user1.lastRob = Date.now();
        // Xử lý thành công hay thất bại của hành động cướp
        const isSuccess = (Math.random() * 10) < settings.successPercentage || 5;
        if (isSuccess) {
            // Thành công
            user2 = this.amount(user2, "remove", "wallet", random, "rob");
            user1 = this.amount(user1, "add", "wallet", random, "rob");
        } else {
            // Thất bại
            random = random > user1.wallet ? user1.wallet : random;
            user2 = this.amount(user2, "add", "wallet", random, "rob");
            user1 = this.amount(user1, "remove", "wallet", random, "rob");
        };
        await this.saveUser(user1, user2);
        this.emit("userUpdate", oldData, user1, oldData2, user2);
        return isSuccess ? {
            error: false,
            type: "success",
            user2: settings.user2,
            minAmount: settings.minAmount,
            amount: random,
        } : {
            error: true,
            type: "caught",
            user2: settings.user2,
            minAmount: settings.minAmount,
            amount: random,
        };
    };
    /**
     * Lấy số dư hiện tại của người dùng và cập nhật giá trị tài sản ròng.
     * @param {Object} settings - Thông tin  cấu hình để tìm người dùng.
     * @returns {Object} - Dữ liệu số dư, bao gồm ví, ngân hàng và tài sản ròng.
     */
    async balance(settings) {
        // Lấy thông tin người dùng dựa trên các thiết lập
        let data = await this.findUser(settings, null, null, "balance");
        // Kiểm tra và khởi tạo giá trị networth nếu chưa có
        if (!data.networth) data.networth = 0;
        // Cập nhật giá trị tài sản ròng (networth) bằng tổng số tiền trong ví và ngân hàng
        data.networth = data.wallet + data.bank;
        // Tạo đối tượng chứa dữ liệu số dư
        const balanceData = {
            rawData: data, // Dữ liệu thô của người dùng
            bank: data.bank, // Số tiền trong ngân hàng
            wallet: data.wallet, // Số tiền trong ví
            networth: data.networth // Tổng tài sản ròng
        };
        // Phát sự kiện "balance" với dữ liệu số dư
        this.emit("balance", balanceData);
        // Trả về dữ liệu số dư
        return balanceData;
    };
    /**
     * Lấy danh sách xếp hạng người dùng trong một guild dựa trên networth.
     * @param {string} guildID - ID của guild.
     * @returns {Promise<Array>} - Mảng chứa thông tin người dùng được sắp xếp theo networth giảm dần.
     */
    async leaderboard(guildID) {
        // Tìm tất cả người dùng trong guild hoặc tất cả người dùng nếu guildID không được cung cấp
        let query = guildID ? { guildID } : {};
        // Tìm và sắp xếp dữ liệu theo networth giảm dần
        let data = await this.currency.find(query).sort({ networth: -1 });
        return data;
    };
    /**
     * Lấy danh sách các mặt hàng của người dùng dựa trên các thiết lập nhất định.
     * @param {object} settings - Các thiết lập cho việc lấy danh sách mặt hàng của người dùng.
     * @returns {Promise<object>} - Đối tượng chứa danh sách mặt hàng và dữ liệu người dùng.
     */
    async getUserItems(settings) {
        // Tìm người dùng dựa trên các thiết lập
        let data = await this.findUser(settings, null, null, "getUserItems");
        // Trả về đối tượng với thông tin mặt hàng và dữ liệu người dùng
        return {
            error: false,
            inventory: data.inventory,
            rawData: data
        };
    };
    /**
     * Lấy danh sách các mặt hàng trong cửa hàng dựa trên các thiết lập.
     * @param {Object} settings - Các thiết lập cho hành động lấy danh sách mặt hàng.
     * @returns {Promise<Object>} - Đối tượng kết quả của hành động lấy danh sách mặt hàng.
     */
    async getShopItems(settings) {
        // Gọi hàm lấy thông tin kho hàng từ settings
        let data = await this.getInventory(settings);
        // Trả về kết quả lấy danh sách mặt hàng
        return {
            error: false,
            inventory: data.inventory,
            rawData: data,
        };
    };
    /**
     * Lấy danh sách các mặt hàng trong kho của guild dựa trên các thiết lập nhất định.
     * Nếu kho không tồn tại, tạo mới và trả về.
     * @param {object} settings - Các thiết lập cho việc lấy danh sách mặt hàng.
     * @returns {Promise<object>} - Đối tượng chứa danh sách mặt hàng của kho guild.
     */
    async getInventory(settings) {
        // Chuyển đổi settings.user và settings.guild từ string thành object nếu cần
        if (typeof settings.user === "string") settings.user = {
            id: settings.user
        };
        if (typeof settings.guild === "string") settings.guild = {
            id: settings.guild
        };
        // Thiết lập giá trị mặc định cho settings.guild nếu không có
        if (!settings.guild) settings.guild = {
            id: null
        };
        // Tìm kho hàng trong cơ sở dữ liệu dựa trên guildID
        let find = await this.inventory.findOne({ guildID: settings.guild.id || null });
        // Nếu không tìm thấy kho hàng, tạo mới kho hàng và trả về
        if (!find) find = await this.makeInventory(settings);
        // Kiểm tra và thiết lập mô tả mặc định cho các mặt hàng nếu cần
        if (find.inventory.length > 0) {
            find.inventory.forEach((item) => {
                if (!item.description) {
                    item.description = "Không có mô tả.";
                }
            });
        };
        // Phát ra sự kiện guildInventoryFetch với dữ liệu kho hàng
        this.emit("guildInventoryFetch", find);
        // Trả về đối tượng kho hàng
        return find;
    };
    /**
     * Tạo một kho hàng mới cho guild dựa trên các thiết lập nhất định.
     * @param {object} settings - Các thiết lập cho việc tạo kho hàng.
     * @returns {Promise<object>} - Đối tượng kho hàng mới được tạo.
     */
    async makeInventory(settings) {
        // Chuyển đổi settings.user và settings.guild từ string thành object nếu cần
        if (typeof settings.user === "string") {
            settings.user = { id: settings.user };
        };
        if (typeof settings.guild === "string") {
            settings.guild = { id: settings.guild };
        };
        // Thiết lập giá trị mặc định cho settings.guild nếu không có
        if (!settings.guild) {
            settings.guild = { id: null };
        };
        // Tạo một đối tượng kho hàng mới
        const inv = new this.inventory({
            guildID: settings.guild.id || null,
            inventory: [],
        });
        // Phát ra sự kiện guildInventoryCreate với dữ liệu kho hàng mới
        this.emit("guildInventoryCreate", inv);
        // Trả về đối tượng kho hàng mới được tạo
        return inv;
    };
    /**
     * Thực hiện chức năng mua hàng cho người dùng.
     * @param {Object} settings - Thông tin cấu hình cho việc mua hàng.
     * @returns {Object} - Kết quả của giao dịch mua hàng.
     */
    async _buy(settings) {
        this.emit("debug", `[ CS => Debug ] : Chức năng Mua hàng được thực thi.`);
        // Lấy dữ liệu kho hàng
        let inventoryData = await this.getInventory(settings);
        this.emit("debug", `[ CS => Debug ] : Đang lấy dữ liệu kho hàng. (Chức năng Mua hàng)`);
        // Lấy dữ liệu người dùng
        this.emit("debug", `[ CS => Debug ] : Đang lấy dữ liệu người dùng. (Chức năng Mua hàng)`);
        let data = await this.findUser(settings, null, null, "buy");
        // Kiểm tra và khởi tạo guild nếu chưa có giá trị
        if (!settings.guild) settings.guild = { id: null };
        // Chuyển đổi và kiểm tra giá trị số lượng mua và mục hàng
        let amountToAdd = parseInt(settings.amount) || 1;
        let itemIndex = parseInt(settings.item) - 1;
        // Kiểm tra tính hợp lệ của mục hàng
        if (isNaN(itemIndex) || itemIndex < 0) return { error: true, type: "No-Item" };
        // Lấy mục hàng từ dữ liệu kho hàng
        let item = inventoryData.inventory[itemIndex];
        if (!item) return { error: true, type: "Invalid-Item" };
        // Tính giá tiền
        let price = item.price * amountToAdd;
        if (data.wallet < price) return { error: true, type: "low-money" };
        // Kiểm tra số lượng hợp lệ
        if (amountToAdd <= 0) return { error: true, type: "Invalid-Amount" };
        // Trừ tiền trong ví người dùng
        data.wallet -= price;
        let done = false;
        // Cập nhật số lượng hàng trong kho người dùng
        for (let invItem of data.inventory) {
            if (invItem.name === item.name) {
                invItem.amount += amountToAdd;
                if (!invItem.itemId) {
                    invItem.itemId = item.itemId || this.makeid();
                };
                done = true;
                break;
            };
        };
        // Nếu mục hàng chưa tồn tại trong kho người dùng, thêm mới
        if (!done) data.inventory.push({
            name: item.name,
            amount: amountToAdd,
            price: price,
            itemId: item.itemId || this.makeid(),
        });
        // Cập nhật dữ liệu người dùng trong cơ sở dữ liệu
        await this.currency.findOneAndUpdate(
            {
                guildID: settings.guild.id || null,
                userID: settings.user.id || null,
            },
            {
                $set: {
                    inventory: data.inventory,
                    wallet: data.wallet,
                },
            },
            {
                upsert: true,
                useFindAndModify: false,
            }
        );
        this.emit("debug", `[ CS => Debug ] : Đang cập nhật kho hàng (Chức năng Mua hàng)`);
        return {
            error: false,
            type: "success",
            inventory: item,
            price: price,
            amount: amountToAdd,
        };
    };
    /**
     * Tạo chuỗi ngẫu nhiên bao gồm các ký tự chữ cái và số có độ dài chỉ định.
     * @param {number} length - Độ dài của chuỗi cần sinh. Mặc định là 5.
     * @returns {string} - Chuỗi ngẫu nhiên được sinh ra.
     */
    makeid(length = 5) {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let resultArr = [];
        // Sinh từng ký tự của chuỗi ngẫu nhiên.
        for (let i = 0; i < length; i++) {
            // Chọn ngẫu nhiên một ký tự từ 'characters' và thêm vào 'resultArr'.
            resultArr.push(characters.charAt(Math.floor(Math.random() * characters.length)));
        };
        // Ghép 'resultArr' thành một chuỗi duy nhất và trả về.
        return resultArr.join('');
    };
    /**
     * Định dạng số tiền thành chuỗi định dạng tiền tệ Việt Nam.
     * @param {number} money - Số tiền cần định dạng.
     * @returns {string} - Chuỗi đã được định dạng theo tiền tệ Việt Nam.
     */
    formatter(money) {
        const formatter = new Intl.NumberFormat("vi-VN", {
            style: 'currency',
            currency: "VND",
        });
        return formatter.format(money);
    }
    /**
     * Định dạng số thành chuỗi có dấu chấm ngăn cách hàng nghìn.
     * @param {number} number - Số cần định dạng.
     * @returns {string} - Chuỗi đã được định dạng với dấu chấm ngăn cách hàng nghìn.
     */
    formatMoney(number) {
        return number.toLocaleString("vi-VN");
    };
};

module.exports = new CurrencySystem();