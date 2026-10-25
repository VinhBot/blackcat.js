import { randomUUID } from "node:crypto";
import { ActionRowBuilder, ModalBuilder as DiscordModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import type {
    ChatInputCommandInteraction,
    ContextMenuCommandInteraction,
    MessageComponentInteraction,
    ModalSubmitInteraction,
} from "discord.js";
import { parseTime } from "..";

/**
 * Các loại interaction có thể mở modal: slash command, context menu, button, select menu...
 *
 * ⚠️ Discord **không** cho mở modal từ message command (tin nhắn thường). Hãy gửi một nút bấm,
 * rồi mở modal khi người dùng bấm nút đó.
 */
export type ModalOpener = ChatInputCommandInteraction | ContextMenuCommandInteraction | MessageComponentInteraction;

type BaseModalField<S extends "short" | "paragraph"> = {
    /** Kiểu ô nhập: `short` (một dòng) hoặc `paragraph` (nhiều dòng). */
    style: S;
    /** Nhãn hiển thị phía trên ô nhập (tối đa 45 ký tự). */
    label: string;
    /**
     * Bắt buộc nhập hay không. Mặc định **`true`** (giống mặc định của Discord).
     * Ô tuỳ chọn để trống sẽ cho giá trị `null`.
     */
    required: boolean;
    /** 
     * Chữ mờ gợi ý khi ô trống (tối đa 100 ký tự). 
     */
    placeholder?: string;
    /** 
     * Giá trị điền sẵn (tối đa 4000 ký tự).
     */
    value?: string;
    /** 
     * Số ký tự tối thiểu (0–4000). 
     */
    minLength?: number;
    /** 
     * Số ký tự tối đa (1–4000). 
     */
    maxLength?: number;
};

export type ModalShortField = BaseModalField<"short">;
export type ModalParagraphField = BaseModalField<"paragraph">;
export type ModalField = ModalShortField | ModalParagraphField;

/** 
 * Định nghĩa các ô nhập: `{ tênÔ: định nghĩa }`. Tên ô chính là `customId` của ô đó (tối đa 100 ký tự). 
 */
export type ModalFieldDefinitions = Record<string, ModalField>;

type FieldData<F extends ModalField> = Omit<F, "style" | "required">;

/**
 * Dùng overload (thay vì generic) để kiểu `required` luôn chính xác:
 * bỏ trống hoặc `true` → bắt buộc, `false` → tuỳ chọn.
 */
interface DefineField<F extends ModalField> {
    (data: FieldData<F> & { required?: true }): F & { required: true };
    (data: FieldData<F> & { required: false }): F & { required: false };
    (data: FieldData<F> & { required: boolean }): F & { required: boolean };
}

/**
 * Bộ khai báo ô nhập, được truyền vào `fields` của `ModalBuilder`.
 */
export interface ModalFieldFactory {
    /** 
     * Ô nhập một dòng. 
     */
    short: DefineField<ModalShortField>;
    /** 
     * Ô nhập nhiều dòng. 
     */
    paragraph: DefineField<ModalParagraphField>;
}

const defineField = (style: "short" | "paragraph") => (data: Record<string, unknown>) => ({
    ...data,
    required: data.required === undefined ? true : Boolean(data.required),
    style,
});

const fieldFactory: ModalFieldFactory = Object.freeze({
    short: defineField("short"),
    paragraph: defineField("paragraph"),
}) as unknown as ModalFieldFactory;

/** 
 * Kiểu giá trị của một ô: bắt buộc → `string`, tuỳ chọn → `string | null`. 
 */
export type InferModalField<F> = F extends { required?: infer R } ? (R extends true ? string : string | null) : never;

/** 
 * Kiểu object `values` ứng với định nghĩa ô nhập. 
 */
export type ModalValues<TFields> = TFields extends Record<string, any> ? { [K in keyof TFields]: InferModalField<TFields[K]> } : Record<string, never>;

/** 
 * Kết quả khi người dùng gửi modal. 
 */
export interface ModalSubmitResult<TFields = ModalFieldDefinitions> {
    /** 
     * Interaction của lần gửi modal — hãy dùng nó để `reply()` / `deferReply()`. 
     */
    interaction: ModalSubmitInteraction;
    /** 
     * Giá trị các ô nhập, đã có kiểu. 
     */
    values: ModalValues<TFields>;
}

export interface ModalBuilderOptions<TFields extends ModalFieldDefinitions | undefined = undefined> {
    /**
     * Tiền tố `customId` (tối đa 60 ký tự). Mỗi lần `show()` thư viện tự thêm một mã ngẫu nhiên
     * để nhiều người mở cùng lúc không bị lẫn. Mặc định `"blackcat-modal"`.
     */
    customId?: string;
    /** 
     * Tiêu đề modal (tối đa 45 ký tự). 
     */
    title: string;
    /**
     * Khai báo các ô nhập (1–5 ô). 
     */
    fields: (field: ModalFieldFactory) => TFields;
    /**
     * Thời gian chờ người dùng gửi modal. Số = **giây**, hoặc chuỗi như `"5m"`.
     * Mặc định 5 phút.
     */
    timeout?: number | string;
    /**
     * Được gọi khi người dùng gửi modal (tuỳ chọn). Bạn cũng có thể bỏ qua và dùng kết quả của `show()`.
     */
    onSubmit?: (interaction: ModalSubmitInteraction, values: ModalValues<TFields>) => any | Promise<any>;
}

/** 
 * Lỗi do hết thời gian chờ của collector (discord.js ném `InteractionCollectorError`).
 */
const isCollectorTimeout = (error: unknown): boolean => typeof error === "object" && error !== null && (error as { code?: unknown }).code === "InteractionCollectorError";
/**
 * Tạo **Modal** (form popup) có ô nhập typed, tự chờ và đọc dữ liệu khi người dùng gửi.
 *
 * @example
 * ```ts
 * const feedback = new ModalBuilder({
 *     title: "Góp ý cho bot",
 *     fields: (f) => ({
 *         subject: f.short({ label: "Tiêu đề", minLength: 3, maxLength: 50 }),
 *         detail: f.paragraph({ label: "Nội dung", required: false }),
 *     }),
 * });
 *
 * // trong một slash command:
 * const result = await feedback.show(interaction);
 * if (!result) return; // người dùng không gửi trong thời gian chờ
 * await result.interaction.reply(`Cảm ơn! Tiêu đề: ${result.values.subject}`);
 * ```
 */
export class ModalBuilder<TFields extends ModalFieldDefinitions | undefined = undefined> {
    public customId = "blackcat-modal";
    public title!: string;
    public timeout: number | string = "5m";
    private defs?: TFields;
    private submitHandler?: (interaction: ModalSubmitInteraction, values: ModalValues<TFields>) => any;

    public constructor(config?: Partial<ModalBuilderOptions<TFields>>) {
        if (!config) return;
        if (config.customId !== undefined) this.customId = config.customId;
        if (config.title !== undefined) this.title = config.title;
        if (config.timeout !== undefined) this.timeout = config.timeout;
        if (config.fields) this.defs = config.fields(fieldFactory);
        if (config.onSubmit) this.submitHandler = config.onSubmit;
    }
    /**  
     * Định nghĩa các ô nhập đã khai báo. 
     */
    public get fields(): TFields | undefined {
        return this.defs;
    }
    /** 
     * Các ô nhập dưới dạng object tổng quát (dùng nội bộ). 
     */
    private get entries(): Array<[string, ModalField]> {
        return Object.entries((this.defs ?? {}) as ModalFieldDefinitions);
    }
    /**
     * Đặt mã định danh tùy chỉnh cho modal.
     *
     * @param customId - Mã định danh duy nhất của modal.
     */
    public setCustomId(customId: string): this {
        this.customId = customId;
        return this;
    }
    /**
     * Đặt tiêu đề cho modal.
     *
     * @param title - Nội dung tiêu đề của modal.
     */
    public setTitle(title: string): this {
        this.title = title;
        return this;
    }

    /** 
     * Đặt thời gian chờ gửi modal (số = giây, hoặc chuỗi như `"2m"`). 
     */
    public setTimeout(timeout: number | string): this {
        this.timeout = timeout;
        return this;
    }
    /** 
     * Khai báo các ô nhập. Gọi **trước** `setOnSubmit` để `values` có kiểu đúng. 
     */
    public setFields<T extends ModalFieldDefinitions>(fields: (field: ModalFieldFactory) => T): ModalBuilder<T> {
        this.defs = fields(fieldFactory) as unknown as TFields;
        return this as unknown as ModalBuilder<T>;
    }
    /**
     * Thiết lập hàm xử lý khi modal được gửi đi.
     *
     * @param handler - Hàm callback nhận `interaction` chứa thông tin tương tác
     * và `values` chứa dữ liệu các trường đã nhập trong modal.
     * Hỗ trợ hàm đồng bộ hoặc bất đồng bộ.
     */
    public setOnSubmit(handler: (interaction: ModalSubmitInteraction, values: ModalValues<TFields>) => any | Promise<any>): this {
        this.submitHandler = handler;
        return this;
    }

    /**
     * Kiểm tra cấu hình theo giới hạn của Discord.
     *
     * @throws {Error} Nếu thiếu tiêu đề/ô nhập hoặc vượt giới hạn độ dài.
     */
    public validate(): void {
        if (!this.title || this.title.length > 45) throw new Error(`ModalBuilder: title bắt buộc và tối đa 45 ký tự (hiện ${this.title?.length ?? 0}).`);
        if (!this.customId || this.customId.length > 60) throw new Error("ModalBuilder: customId bắt buộc và tối đa 60 ký tự.");
        const entries = this.entries;
        if (entries.length < 1 || entries.length > 5) throw new Error(`ModalBuilder: cần từ 1 đến 5 ô nhập (hiện ${entries.length}).`);
        for (const [key, field] of entries) {
            const where = `ModalBuilder: ô "${key}"`;
            if (!key || key.length > 100) throw new Error(`${where} có tên không hợp lệ (1–100 ký tự).`);
            if (!field.label || field.label.length > 45) throw new Error(`${where} cần label từ 1 đến 45 ký tự.`);
            if (field.placeholder && field.placeholder.length > 100) throw new Error(`${where}: placeholder tối đa 100 ký tự.`);
            if (field.value && field.value.length > 4000) throw new Error(`${where}: value tối đa 4000 ký tự.`);
            if (field.minLength !== undefined && (field.minLength < 0 || field.minLength > 4000)) throw new Error(`${where}: minLength phải từ 0 đến 4000.`);
            if (field.maxLength !== undefined && (field.maxLength < 1 || field.maxLength > 4000)) throw new Error(`${where}: maxLength phải từ 1 đến 4000.`);
            if (field.minLength !== undefined && field.maxLength !== undefined && field.minLength > field.maxLength) {
                throw new Error(`${where}: minLength không được lớn hơn maxLength.`);
            }
        }
    }

    /**
     * Dựng modal của discord.js.
     *
     * @param customId `customId` đầy đủ; mặc định dùng `customId` đã cấu hình.
     */
    public build(customId: string = this.customId): DiscordModalBuilder {
        this.validate();
        const modal = new DiscordModalBuilder().setCustomId(customId).setTitle(this.title);
        for (const [key, field] of this.entries) {
            const input = new TextInputBuilder()
            input.setCustomId(key);
            input.setLabel(field.label);
            input.setStyle(field.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short);
            input.setRequired(field.required);
            if (field.placeholder) input.setPlaceholder(field.placeholder);
            if (field.value) input.setValue(field.value);
            if (field.minLength !== undefined) input.setMinLength(field.minLength);
            if (field.maxLength !== undefined) input.setMaxLength(field.maxLength);
            modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
        }
        return modal;
    }

    /**
     * Đọc giá trị các ô nhập từ một lần gửi modal. Ô tuỳ chọn để trống sẽ là `null`.
     */
    public parse(submit: { fields: { getTextInputValue(customId: string): string } }): ModalValues<TFields> {
        const values: Record<string, string | null> = {};
        for (const [key, field] of this.entries) {
            const raw = submit.fields.getTextInputValue(key);
            values[key] = !field.required && raw.trim() === "" ? null : raw;
        }
        return values as ModalValues<TFields>;
    }

    /**
     * Hiện modal cho người dùng và **chờ** họ gửi.
     *
     * @param interaction Slash command / context menu / button / select menu vừa được kích hoạt
     * @param options.timeout Ghi đè thời gian chờ (số = giây, hoặc chuỗi như `"2m"`)
     * @returns `{ interaction, values }` khi người dùng gửi, hoặc `null` nếu hết thời gian chờ.
     * Nếu có `onSubmit`, nó sẽ được gọi trước khi hàm trả về.
     *
     * @remarks
     * Interaction gốc chưa được phản hồi trước đó (không `reply` / `deferReply`) thì mới mở được modal.
     * Hãy trả lời người dùng bằng `result.interaction` (interaction của lần gửi modal).
     */
    public async show(interaction: ModalOpener, options: { timeout?: number | string } = {}): Promise<ModalSubmitResult<TFields> | null> {
        const customId = `${this.customId}:${randomUUID()}`;
        const modal = this.build(customId);
        const time = parseTime(options.timeout ?? this.timeout);
        await interaction.showModal(modal);
        let submit: ModalSubmitInteraction;
        try {
            submit = await interaction.awaitModalSubmit({
                time,
                filter: (i) => i.customId === customId && i.user.id === interaction.user.id,
            });
        } catch (error) {
            if (isCollectorTimeout(error)) return null;
            throw error;
        }
        const values = this.parse(submit);
        await this.submitHandler?.(submit, values);
        return { interaction: submit, values };
    }
}
