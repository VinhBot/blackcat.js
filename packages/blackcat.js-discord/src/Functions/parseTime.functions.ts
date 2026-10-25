/**
 * Phân tích (parse) một chuỗi thời gian dễ đọc hoặc số thành **milliseconds**.
 *
 * Hỗ trợ nhiều đơn vị thời gian, alias (tên thay thế), số thập phân và
 * các biểu thức thời gian kết hợp.
 *
 * Nếu truyền vào **number** hoặc **chuỗi số**, giá trị sẽ được hiểu là **giây**.
 *
 * Các đơn vị được hỗ trợ:
 * - ms, millisecond, milliseconds
 * - s, sec, secs, second, seconds
 * - m, min, mins, minute, minutes
 * - h, hr, hrs, hour, hours
 * - d, day, days
 * - mo, month, months
 * - y, yr, yrs, year, years
 *
 * Hỗ trợ biểu thức kết hợp:
 * `1h 30m`, `2day 5hour`, `1year 2month`
 *
 * Hỗ trợ số thập phân:
 * `1.5h`, `2.25day`
 *
 * @param input Giá trị thời gian cần chuyển đổi.  
 * Nếu là `number` hoặc chuỗi số → sẽ được hiểu là **giây**.
 *
 * @returns Thời gian sau khi chuyển đổi sang **milliseconds**
 *
 * @throws {Error} Nếu chuỗi rỗng, chứa ký tự thừa (vd `"5s abc"`, `"1d2"`), có đơn vị không hợp lệ,
 * hoặc số âm / `NaN` / `Infinity` (không còn âm thầm trả về `0`).
 *
 * @example
 * ```ts
 * parseTime("60") // 60000
 * parseTime(120) // 120000
 *
 * parseTime("5sec") // 5000
 * parseTime("2min") // 120000
 * parseTime("1hour") // 3600000
 * parseTime("3day") // 259200000
 *
 * parseTime("1hour 30min") // 5400000
 * parseTime("2day 5hour") // 190800000
 * parseTime("1year 2month") // 36720000000
 *
 * parseTime("1.5h") // 5400000
 * ```
 */
export const parseTime = (input: string | number): number => {
    const UNIT_VALUES: Record<"ms" | "s" | "m" | "h" | "d" | "mo" | "y", number> = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        mo: 30 * 24 * 60 * 60 * 1000,
        y: 365 * 24 * 60 * 60 * 1000,
    };
    const UNIT_ALIASES: Record<string, "ms" | "s" | "m" | "h" | "d" | "mo" | "y"> = {
        // milli giây
        ms: "ms",
        millisecond: "ms",
        milliseconds: "ms",
        // giây
        s: "s",
        sec: "s",
        secs: "s",
        second: "s",
        seconds: "s",
        // phút
        m: "m",
        min: "m",
        mins: "m",
        minute: "m",
        minutes: "m",
        // giờ
        h: "h",
        hr: "h",
        hrs: "h",
        hour: "h",
        hours: "h",
        // ngày
        d: "d",
        day: "d",
        days: "d",
        // tháng
        mo: "mo",
        month: "mo",
        months: "mo",
        // năm
        y: "y",
        yr: "y",
        yrs: "y",
        year: "y",
        years: "y",
    };
    if (typeof input === "number") {
        if (!Number.isFinite(input) || input < 0) {
            throw new RangeError(`Thời gian không hợp lệ: ${input}`);
        }
        return input * UNIT_VALUES.s;
    }
    if (typeof input !== "string") {
        throw new TypeError(`parseTime chỉ nhận string hoặc number, nhận được: ${typeof input}`);
    }
    const str = input.trim().toLowerCase();
    if (!str) throw new Error("Chuỗi thời gian không được rỗng.");
    // auto detect: "60" -> 60s
    if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str) * UNIT_VALUES.s;
    // Toàn bộ chuỗi phải là dãy "<số><đơn vị>" (cho phép khoảng trắng giữa các cụm).
    if (!/^(?:\d+(?:\.\d+)?\s*[a-z]+\s*)+$/.test(str)) {
        throw new Error(`Chuỗi thời gian không hợp lệ: "${input}"`);
    }
    let total = 0;
    const regex = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(str)) !== null) {
        const value = parseFloat(match[1]);
        const unitRaw = match[2];
        const unit = UNIT_ALIASES[unitRaw];
        if (!unit) {
            throw new Error(`Unknown time unit: ${unitRaw}`);
        }
        total += value * UNIT_VALUES[unit];
    }
    return total;
};
