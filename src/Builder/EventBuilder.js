/**
 * Đại diện cho một lớp để xây dựng các sự kiện.
 * @param {object} options - Các tùy chọn cho thể hiện EventBuilders.
 * @param {string} options.eventCustomName - Tên tùy chỉnh cho sự kiện.
 * @param {Function} options.executeEvents - Hàm để thực thi các sự kiện.
 * @param {string} options.eventName - Tên của sự kiện.
 * @param {boolean} options.eventOnce - Chỉ ra liệu sự kiện có nên được thực thi một lần hay không.
 */
module.exports = class {
    constructor (options) {
        this.eventCustomName = options.eventCustomName;
        this.executeEvents = options.executeEvents;
        this.eventName = options.eventName;
        this.eventOnce = options.eventOnce;
    };
    /**
     * Chuyển đổi thể hiện EventBuilders thành một đối tượng JSON.
     * @returns {object} đưa EventBuilder thành dạng json.
     */
    toJSON() {
        return { ...this };
    };
};