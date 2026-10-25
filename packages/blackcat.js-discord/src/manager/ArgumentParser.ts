import { ChannelType } from "discord.js";
import type { Message, OmitPartialGroupDMChannel } from "discord.js";
import type { Client } from "../Client.ts";
import type { AnyArgument, ArgumentDefinitions, ArgumentType } from "../builder";
import { findUser, findRole, findChannel, parseTime } from "../Functions";

/**
 * Phân loại lỗi có thể phát sinh khi phân tích argument của lệnh.
 *
 * @remarks
 * - `missing`: thiếu argument bắt buộc.
 * - `invalid`: giá trị sai định dạng hoặc không tìm thấy đối tượng tương ứng.
 * - `range`: giá trị nằm ngoài giới hạn hoặc không thuộc tập lựa chọn hợp lệ.
 * - `guild_only`: argument chỉ dùng được trong server nhưng lệnh được gọi từ DM.
 */
export type ArgumentErrorKind = "missing" | "invalid" | "range" | "guild_only";

/**
 * Lỗi phát sinh khi một argument bị thiếu, không hợp lệ hoặc không thỏa điều kiện.
 *
 * @remarks Thuộc tính `message` chứa thông báo tiếng Việt đã được định dạng sẵn.
 */
export class ArgumentParseError extends Error {
    public readonly kind: ArgumentErrorKind;
    public readonly argument: string;
    public readonly argumentType: ArgumentType;
    public readonly input?: string;
    /**
     * Khởi tạo lỗi phân tích argument.
     *
     * @param kind - Nhóm lỗi.
     * @param argument - Tên argument gây lỗi.
     * @param argumentType - Kiểu dữ liệu được khai báo cho argument.
     * @param message - Nội dung lỗi dành cho người dùng.
     * @param input - Giá trị đầu vào gây lỗi, nếu có.
     */
    public constructor(kind: ArgumentErrorKind, argument: string, argumentType: ArgumentType, message: string, input?: string) {
        super(message);
        this.name = "ArgumentParseError";
        this.kind = kind;
        this.argument = argument;
        this.argumentType = argumentType;
        this.input = input;
    }
}

/** 
 * Nhãn tiếng Việt của từng kiểu argument, dùng trong thông báo lỗi. 
 */
const TYPE_LABEL: Record<ArgumentType, string> = {
    string: "văn bản",
    integer: "số nguyên",
    number: "số",
    boolean: "đúng/sai (yes/no)",
    duration: "khoảng thời gian (vd: 10m, 1h)",
    user: "người dùng",
    member: "thành viên",
    role: "role",
    channel: "kênh",
};

/** 
 * Các giá trị văn bản được chấp nhận là `true` khi parse boolean. 
 */
const TRUE_WORDS = new Set(["true", "yes", "y", "on", "1", "có", "co", "bật", "bat", "đúng", "dung"]);
/** 
 * Các giá trị văn bản được chấp nhận là `false` khi parse boolean. 
 */
const FALSE_WORDS = new Set(["false", "no", "n", "off", "0", "không", "khong", "tắt", "tat", "sai"]);

/**
 * Token được tách từ chuỗi argument.
 *
 * @internal
 */
interface Token {
    value: string;
    /** 
     * Vị trí bắt đầu (trong chuỗi gốc). 
     */
    start: number;
}

const OPEN_QUOTES: Record<string, string> = { '"': '"', "“": "”", "„": "“" };

/**
 * Tách chuỗi đầu vào thành các token, phân cách bằng khoảng trắng ngoài dấu ngoặc kép.
 *
 * @remarks
 * Cụm nằm trong dấu ngoặc kép thẳng (`"..."`) hoặc ngoặc kép cong (`“...”`)
 * được giữ thành một token. Có thể dùng `\\` để thoát dấu ngoặc đóng hoặc
 * dấu gạch chéo ngược bên trong cụm được trích dẫn. Nếu thiếu dấu ngoặc đóng,
 * phần đầu vào được xử lý như văn bản thường.
 *
 * @param input - Chuỗi argument cần tách.
 * @returns Danh sách token, mỗi token gồm giá trị và vị trí bắt đầu trong chuỗi gốc.
 *
 * @example
 * ```ts
 * tokenize('ban "Nguyen Van A" spam');
 * // [
 * //   { value: "ban", start: 0 },
 * //   { value: "Nguyen Van A", start: 4 },
 * //   { value: "spam", start: 20 }
 * // ]
 * ```
 */
export function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const n = input.length;
    while (i < n) {
        while (i < n && /\s/.test(input[i])) i++;
        if (i >= n) break;
        const start = i;
        const closing = OPEN_QUOTES[input[i]];
        if (closing) {
            // Tìm dấu ngoặc đóng tương ứng; nếu không có thì coi cả cụm là văn bản thường.
            let j = i + 1;
            let value = "";
            let closed = false;
            while (j < n) {
                const ch = input[j];
                if (ch === "\\" && j + 1 < n && (input[j + 1] === closing || input[j + 1] === "\\")) {
                    value += input[j + 1];
                    j += 2;
                    continue;
                }
                if (ch === closing) {
                    closed = true;
                    break;
                }
                value += ch;
                j++;
            }
            if (closed) {
                tokens.push({ value, start });
                i = j + 1;
                continue;
            }
        }
        let j = i;
        while (j < n && !/\s/.test(input[j])) j++;
        tokens.push({ value: input.slice(i, j), start });
        i = j;
    }
    return tokens;
}

/**
 * Tạo chuỗi hướng dẫn cách sử dụng lệnh từ các định nghĩa argument.
 *
 * @param prefix - Tiền tố gọi lệnh, ví dụ `!`.
 * @param commandName - Tên lệnh.
 * @param defs - Các định nghĩa argument theo thứ tự; bỏ qua nếu lệnh không có argument.
 * @returns Chuỗi usage; argument bắt buộc dùng `<>`, argument tùy chọn dùng `[]`.
 *
 * @example
 * ```ts
 * buildUsage("!", "ban", defs);
 * // "!ban <user> [days] [reason...]"
 * ```
 */
export function buildUsage(prefix: string, commandName: string, defs?: ArgumentDefinitions): string {
    const parts = Object.entries(defs ?? {}).map(([name, def]) => {
        const label = def.type === "string" && def.rest ? `${name}...` : name;
        return def.required ? `<${label}>` : `[${label}]`;
    });
    return `${prefix}${commandName}${parts.length ? " " + parts.join(" ") : ""}`;
}

/**
 * Kiểm tra tính hợp lệ và thứ tự của các định nghĩa argument khi đăng ký lệnh.
 *
 * @remarks Kiểm tra cấu trúc định nghĩa, thứ tự argument bắt buộc/tùy chọn và quy tắc `rest`.
 *
 * @param defs - Các định nghĩa argument cần kiểm tra.
 * @param commandName - Tên lệnh dùng trong thông báo lỗi; mặc định là `"?"`.
 * @returns Không trả về giá trị.
 * @throws {Error} Nếu định nghĩa không hợp lệ, argument bắt buộc đứng sau argument tùy chọn,
 * `rest` được dùng với kiểu khác `string`, hoặc argument `rest` không nằm cuối danh sách.
 */
export function validateArgumentDefinitions(defs: ArgumentDefinitions | undefined, commandName = "?"): void {
    if (!defs) return;
    const entries = Object.entries(defs);
    let seenOptional = false;
    entries.forEach(([name, def], index) => {
        if (!def || typeof def !== "object" || !def.type) {
            throw new Error(`Lệnh "${commandName}": argument "${name}" không hợp lệ.`);
        }
        if (def.required && seenOptional) {
            throw new Error(`Lệnh "${commandName}": argument bắt buộc "${name}" không được đứng sau argument tuỳ chọn.`);
        }
        if (!def.required) seenOptional = true;
        if ((def as { rest?: boolean }).rest) {
            if (def.type !== "string") throw new Error(`Lệnh "${commandName}": chỉ argument kiểu string mới dùng được "rest" ("${name}").`);
            if (index !== entries.length - 1) throw new Error(`Lệnh "${commandName}": argument "rest" ("${name}") phải là argument cuối cùng.`);
        }
    });
}

/**
 * Tạo lỗi cho giá trị argument không hợp lệ.
 *
 * @param name - Tên argument.
 * @param def - Định nghĩa argument.
 * @param input - Giá trị đầu vào không hợp lệ.
 * @param hint - Gợi ý định dạng mong đợi; mặc định lấy từ kiểu argument.
 * @returns Lỗi {@link ArgumentParseError} thuộc nhóm `invalid`.
 *
 * @internal
 */
const invalid = (name: string, def: AnyArgument, input: string, hint?: string) => new ArgumentParseError("invalid", name, def.type, `Giá trị **${name}** không hợp lệ: \`${input}\` (cần ${hint ?? TYPE_LABEL[def.type]}).`, input);
/**
 * Tạo lỗi khi giá trị argument không thỏa giới hạn hoặc tập lựa chọn hợp lệ.
 *
 * @param name - Tên argument.
 * @param def - Định nghĩa argument.
 * @param input - Giá trị đầu vào không hợp lệ.
 * @param hint - Mô tả giới hạn hoặc lựa chọn hợp lệ.
 * @returns Lỗi {@link ArgumentParseError} thuộc nhóm `range`.
 *
 * @internal
 */
const outOfRange = (name: string, def: AnyArgument, input: string, hint: string) => new ArgumentParseError("range", name, def.type, `Giá trị **${name}** không hợp lệ: \`${input}\` (${hint}).`, input);

/**
 * Kiểm tra giá trị số có nằm trong giới hạn `min` và `max` đã khai báo hay không.
 *
 * @param name - Tên argument đang được kiểm tra.
 * @param def - Định nghĩa chứa giới hạn và kiểu argument.
 * @param value - Giá trị số sau khi chuyển đổi.
 * @param input - Chuỗi đầu vào ban đầu, dùng trong thông báo lỗi.
 * @param format - Hàm định dạng giới hạn trong thông báo; mặc định dùng `String`.
 * @throws {ArgumentParseError} Nếu giá trị nhỏ hơn `min` hoặc lớn hơn `max`.
 *
 * @internal
 */
function checkRange(name: string, def: { min?: number; max?: number; type: ArgumentType }, value: number, input: string, format: (n: number) => string = String): void {
    if (def.min !== undefined && value < def.min) throw outOfRange(name, def as AnyArgument, input, `tối thiểu ${format(def.min)}`);
    if (def.max !== undefined && value > def.max) throw outOfRange(name, def as AnyArgument, input, `tối đa ${format(def.max)}`);
}

/**
 * Kiểu tin nhắn Discord đã loại trừ trường hợp partial group DM.
 *
 * @internal
 */
type GuildMessage = OmitPartialGroupDMChannel<Message>;

/**
 * Chuyển đổi một token thành giá trị theo kiểu argument đã khai báo.
 *
 * @remarks
 * Hỗ trợ `string`, `integer`, `number`, `boolean`, `duration`, `user`, `member`,
 * `role` và `channel`. Với kiểu Discord, hàm tra cứu đối tượng tương ứng; các kiểu
 * có giới hạn sẽ được kiểm tra trước khi trả về.
 *
 * @param client - Client của bot dùng để tra cứu dữ liệu Discord.
 * @param message - Tin nhắn gọi lệnh, cung cấp ngữ cảnh server và người dùng.
 * @param name - Tên argument đang được chuyển đổi.
 * @param def - Định nghĩa và các ràng buộc của argument.
 * @param input - Token đầu vào cần chuyển đổi.
 * @returns Giá trị đã chuyển đổi; kiểu cụ thể phụ thuộc vào `def.type`.
 * @throws {ArgumentParseError} Nếu đầu vào không hợp lệ, ngoài phạm vi hoặc cần server trong khi tin nhắn được gửi từ DM.
 * @throws {Error} Nếu kiểu argument không được hỗ trợ.
 *
 * @internal
 */
async function convert(client: Client, message: GuildMessage, name: string, def: AnyArgument, input: string): Promise<unknown> {
    if (def.type === "string") {
        if (def.choices?.length) {
            const matched = def.choices.find((c) => c.toLowerCase() === input.toLowerCase());
            if (matched === undefined) throw outOfRange(name, def, input, `chọn một trong: ${def.choices.join(", ")}`);
            return matched;
        }
        if (def.minLength !== undefined && input.length < def.minLength) throw outOfRange(name, def, input, `tối thiểu ${def.minLength} ký tự`);
        if (def.maxLength !== undefined && input.length > def.maxLength) throw outOfRange(name, def, input, `tối đa ${def.maxLength} ký tự`);
        return input;
    } else if (def.type === "integer") {
        if (!/^[+-]?\d+$/.test(input)) throw invalid(name, def, input);
        const value = Number(input);
        if (!Number.isSafeInteger(value)) throw invalid(name, def, input);
        checkRange(name, def, value, input);
        return value;
    } else if (def.type === "number") {
        const normalized = input.replace(",", ".");
        const value = normalized === "" ? NaN : Number(normalized);
        if (!Number.isFinite(value)) throw invalid(name, def, input);
        checkRange(name, def, value, input);
        return value;
    } else if (def.type === "boolean") {
        const lower = input.toLowerCase();
        if (TRUE_WORDS.has(lower)) return true;
        if (FALSE_WORDS.has(lower)) return false;
        throw invalid(name, def, input);
    } else if (def.type === "duration") {
        let ms: number;
        try {
            ms = parseTime(input);
        } catch {
            throw invalid(name, def, input);
        }
        checkRange(name, def, ms, input, (n) => `${n}ms`);
        return ms;
    } else if (def.type === "user") {
        const user = await findUser(client, message, input);
        if (!user) throw invalid(name, def, input, "người dùng tồn tại (mention, ID hoặc tên)");
        return user;
    } else if (def.type === "member") {
        if (!message.guild) throw new ArgumentParseError("guild_only", name, def.type, `Argument **${name}** chỉ dùng được trong server.`, input);
        const user = await findUser(client, message, input);
        const member = user ? (message.guild.members.cache.get(user.id) ?? (await message.guild.members.fetch(user.id).catch(() => null))) : null;
        if (!member) throw invalid(name, def, input, "thành viên trong server (mention, ID hoặc tên)");
        return member;
    } else if (def.type === "role") {
        if (!message.guild) throw new ArgumentParseError("guild_only", name, def.type, `Argument **${name}** chỉ dùng được trong server.`, input);
        const role = await findRole(message.guild, input);
        if (!role) throw invalid(name, def, input, "role tồn tại (mention, ID hoặc tên)");
        return role;
    } else if (def.type === "channel") {
        if (!message.guild) throw new ArgumentParseError("guild_only", name, def.type, `Argument **${name}** chỉ dùng được trong server.`, input);
        const channel = await findChannel(client, message.guild, input);
        if (!channel) throw invalid(name, def, input, "kênh tồn tại (mention, ID hoặc tên)");
        if (def.channelTypes?.length) {
            const allowed = def.channelTypes.map((t) => ChannelType[t]);
            if (!allowed.includes(channel.type as number)) {
                throw outOfRange(name, def, input, `loại kênh hợp lệ: ${def.channelTypes.join(", ")}`);
            }
        }
        return channel;
    } else {
        throw new Error(`Kiểu argument không được hỗ trợ: ${String((def as { type: unknown }).type)} ("${name}")`);
    }
}

/**
 * Phân tích chuỗi argument của tin nhắn theo các định nghĩa đã khai báo.
 *
 * @remarks
 * Chuỗi đầu vào được tách bằng {@link tokenize}. Mỗi token được chuyển đổi theo
 * định nghĩa tương ứng và thứ tự trong `defs`. Argument tùy chọn bị bỏ qua sẽ có
 * giá trị `null`. Với argument `string` có `rest: true`, toàn bộ phần chuỗi còn lại
 * được dùng làm giá trị của argument đó.
 *
 * @param client - Client của bot dùng để tra cứu user, member, role và channel.
 * @param message - Tin nhắn gốc, dùng làm ngữ cảnh để tìm đối tượng Discord.
 * @param input - Chuỗi argument nằm sau tên lệnh, chưa được tách thành token.
 * @param defs - Các định nghĩa argument theo thứ tự nhập.
 * @returns Bản ghi ánh xạ tên argument sang giá trị đã chuyển đổi; argument tùy chọn
 * không được nhập sẽ có giá trị `null`.
 * @throws {ArgumentParseError} Nếu thiếu argument bắt buộc hoặc có giá trị không hợp lệ.
 *
 * @example
 * ```ts
 * const args = await parseArguments(client, message, '123 "lý do kiểm duyệt"', {
 *   user: { type: "user", required: true, description: "người dùng" },
 *   reason: { type: "string", required: false, rest: true }
 * });
 * ```
 */
export async function parseArguments(client: Client, message: GuildMessage, input: string, defs: ArgumentDefinitions,): Promise<Record<string, unknown>> {
    const tokens = tokenize(input);
    const result: Record<string, unknown> = {};
    let index = 0;

    for (const [name, def] of Object.entries(defs)) {
        const token = tokens[index];
        if (!token) {
            if (def.required) {
                throw new ArgumentParseError("missing", name, def.type, `Thiếu argument **${name}** (${def.description ?? TYPE_LABEL[def.type]}).`);
            }
            result[name] = null;
            continue;
        }

        if (def.type === "string" && def.rest) {
            const remainder = input.slice(token.start).trim();
            result[name] = await convert(client, message, name, def, remainder);
            index = tokens.length;
            continue;
        }

        index++;
        result[name] = await convert(client, message, name, def, token.value);
    }
    return result;
}