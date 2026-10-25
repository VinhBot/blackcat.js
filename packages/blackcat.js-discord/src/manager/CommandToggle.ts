/**
 * Thông tin được truyền cho callback `onToggle` mỗi khi trạng thái bật/tắt của một lệnh thay đổi.
 */
export interface CommandToggleInfo {
    /** Tên lệnh (đã chuẩn hoá: chữ thường, bỏ khoảng trắng hai đầu). */
    commandName: string;
    /** ID của guild bị thay đổi. */
    guildID: string;
    /** `true` nếu lệnh vừa bị tắt, `false` nếu vừa được bật lại. */
    disabled: boolean;
}

/**
 * Dữ liệu có thể lưu / khôi phục: `{ [guildID]: [tên lệnh bị tắt, ...] }`.
 *
 * @example
 * ```ts
 * { "123456789012345678": ["ping", "help"] }
 * ```
 */
export type DisabledCommandsSnapshot = Record<string, string[]>;

/**
 * Bộ nhớ trạng thái bật/tắt lệnh theo từng guild, dùng chung cho
 * `CommandManager`, `SlashCommandManager` và `ContextMenuManager`.
 *
 * Mặc định trạng thái chỉ lưu trong bộ nhớ. Muốn lưu bền vững (file/DB), hãy dùng
 * `onToggle` để ghi mỗi khi có thay đổi và `import()` để nạp lại khi khởi động.
 */
export class CommandToggle {
    private readonly disabled = new Map<string, Set<string>>();
    private readonly onChange?: (info: CommandToggleInfo) => void;
    public constructor(onChange?: (info: CommandToggleInfo) => void) {
        this.onChange = onChange;
    }
    /** 
     * Chuẩn hoá tên lệnh để so sánh. 
     */
    private normalize(commandName: string): string {
        return commandName.trim().toLowerCase();
    }
    /**
     * Tắt lệnh trong một guild.
     *
     * @returns `true` nếu trạng thái thực sự thay đổi (trước đó lệnh đang bật).
     */
    public disable(commandName: string, guildID: string): boolean {
        const name = this.normalize(commandName);
        if (!name || !guildID) return false;
        let set = this.disabled.get(guildID);
        if (!set) {
            set = new Set<string>();
            this.disabled.set(guildID, set);
        }
        if (set.has(name)) return false;
        set.add(name);
        this.onChange?.({ commandName: name, guildID, disabled: true });
        return true;
    }
    /**
     * Bật lại lệnh trong một guild.
     *
     * @returns `true` nếu trạng thái thực sự thay đổi (trước đó lệnh đang tắt).
     */
    public enable(commandName: string, guildID: string): boolean {
        const name = this.normalize(commandName);
        const set = this.disabled.get(guildID);
        if (!set || !set.delete(name)) return false;
        if (set.size === 0) this.disabled.delete(guildID);
        this.onChange?.({ commandName: name, guildID, disabled: false });
        return true;
    }
    /**
     * Kiểm tra lệnh có đang bị tắt trong guild hay không.
     * Trong DM (không có `guildID`) lệnh luôn được coi là đang bật.
     */
    public isDisabled(commandName: string, guildID?: string | null): boolean {
        if (!guildID) return false;
        return this.disabled.get(guildID)?.has(this.normalize(commandName)) ?? false;
    }
    /** 
     * Danh sách tên lệnh đang bị tắt trong một guild. 
     */
    public list(guildID: string): string[] {
        return [...(this.disabled.get(guildID) ?? [])];
    }
    /**
     * Xoá toàn bộ trạng thái tắt của một guild (hoặc của tất cả guild nếu không truyền `guildID`).
     * Không gọi `onToggle`.
     */
    public clear(guildID?: string): void {
        if (guildID) this.disabled.delete(guildID);
        else this.disabled.clear();
    }
    /** 
     * Xuất trạng thái hiện tại để lưu xuống file / database. 
     */
    public export(): DisabledCommandsSnapshot {
        const snapshot: DisabledCommandsSnapshot = {};
        for (const [guildID, set] of this.disabled) snapshot[guildID] = [...set];
        return snapshot;
    }
    /**
     * Nạp lại trạng thái đã lưu. Không gọi `onToggle`.
     *
     * @param data Dữ liệu từ `export()`
     * @param options.merge `true` để gộp vào trạng thái hiện có; mặc định thay thế hoàn toàn.
     */
    public import(data: DisabledCommandsSnapshot, options: { merge?: boolean } = {}): void {
        if (!options.merge) this.disabled.clear();
        for (const [guildID, names] of Object.entries(data ?? {})) {
            if (!Array.isArray(names)) continue;
            const set = this.disabled.get(guildID) ?? new Set<string>();
            for (const name of names) {
                const normalized = this.normalize(String(name));
                if (normalized) set.add(normalized);
            }
            if (set.size > 0) this.disabled.set(guildID, set);
        }
    }
}

/** 
 * Chuẩn hoá tham số `guildID` kiểu `string | string[]` thành mảng không rỗng, không trùng. 
 */
export function toGuildIDList(guildID: string | readonly string[]): string[] {
    const list = (Array.isArray(guildID) ? guildID : [guildID]) as string[];
    return [...new Set(list.filter((id) => typeof id === "string" && id.length > 0))];
}
