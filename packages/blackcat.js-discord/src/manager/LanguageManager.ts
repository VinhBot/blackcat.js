type Primitive = string | number | boolean | bigint | null | undefined;

/**
 * Tạo union path từ object lồng nhau.
 */
type NestedKeyOf<T extends object> = {
    [K in keyof T & string]:
    T[K] extends object
    ? K | `${K}.${NestedKeyOf<T[K]>}`
    : K;
}[keyof T & string];

/**
 * Tùy chọn khởi tạo cho {@link LanguageManager}.
 */
export interface LanguageManagerOptions<T extends object> {
    /**
     * Ngôn ngữ mặc định được sử dụng khi:
     * - Không truyền language vào hàm translate.
     * - Guild/User chưa có language riêng.
     *
     * Ví dụ:
     * ```ts
     * defaultLanguage: "vi"
     * ```
     */
    defaultLanguage: string;
    /**
     * Danh sách toàn bộ resource ngôn ngữ.
     *
     * Key là mã ngôn ngữ.
     * Value là object chứa dữ liệu translate.
     *
     * Ví dụ:
     * ```ts
     * resources: {
     *     vi: viLanguage,
     *     en: enLanguage
     * }
     * ```
     */
    resources: Record<string, T>;
    /**
     * Giá trị fallback khi không tìm thấy key translate.
     *
     * Có thể là:
     * - Chuỗi cố định.
     * - Hàm custom trả về chuỗi fallback.
     *
     * Ví dụ:
     * ```ts
     * fallback: "Missing translation"
     * ```
     *
     * Hoặc:
     * ```ts
     * fallback: (key) => `Không tìm thấy key: ${key}`
     * ```
     *
     * @default key
     */
    fallback?: string | ((key: string) => string);
}

/**
 * LanguageManager hỗ trợ:
 * - Type-safe key
 * - Nested path
 * - Placeholder variable
 * - Change language runtime
 * - Fallback language
 * - Has key
 * - Add/remove language
 */
export class LanguageManager<T extends object> {
    private currentLanguage: string;
    private readonly resources: Record<string, T>;
    private readonly fallback?: string | ((key: string) => string);
    /**
     * Khởi tạo instance {@link LanguageManager}.
     *
     * @param options Tùy chọn cấu hình cho LanguageManager.
     */
    public constructor(options: LanguageManagerOptions<T>) {
        this.currentLanguage = options.defaultLanguage;
        this.resources = options.resources;
        this.fallback = options.fallback;
    }
    /**
     * Lấy mã ngôn ngữ hiện tại đang được sử dụng.
     *
     * Ví dụ:
     * ```ts
     * console.log(lang.language);
     * // vi
     * ```
     */
    public get language(): string {
        return this.currentLanguage;
    }
    /**
     * Đổi ngôn ngữ hiện tại.
     *
     * @param language Mã ngôn ngữ cần chuyển sang.
     *
     * @throws {Error}
     * Được throw khi ngôn ngữ không tồn tại trong resources.
     *
     * @returns Instance hiện tại để hỗ trợ method chaining.
     *
     * @example
     * ```ts
     * lang.setLanguage("en");
     * ```
     */
    public setLanguage(language: string): this {
        if (!this.resources[language]) {
            throw new Error(`Language "${language}" does not exist.`);
        }
        this.currentLanguage = language;
        return this;
    }
    /**
     * Thêm resource ngôn ngữ mới.
     *
     * @param language Mã ngôn ngữ.
     * @param data Dữ liệu translate của ngôn ngữ.
     *
     * @returns Instance hiện tại để hỗ trợ method chaining.
     *
     * @example
     * ```ts
     * lang.addLanguage("jp", jpLanguage);
     * ```
     */
    public addLanguage(language: string, data: T): this {
        this.resources[language] = data;
        return this;
    }
    /**
     * Xóa một ngôn ngữ khỏi resource.
     *
     * @param language Mã ngôn ngữ cần xóa.
     *
     * @returns Instance hiện tại để hỗ trợ method chaining.
     *
     * @example
     * ```ts
     * lang.removeLanguage("jp");
     * ```
     */
    public removeLanguage(language: string): this {
        delete this.resources[language];
        return this;
    }
    /**
     * Kiểm tra key translate có tồn tại hay không.
     *
     * @typeParam K Kiểu key nested của language object.
     *
     * @param key Key cần kiểm tra.
     * @param language Ngôn ngữ cần kiểm tra.
     * Nếu không truyền sẽ dùng ngôn ngữ hiện tại.
     *
     * @returns `true` nếu key tồn tại, ngược lại trả về `false`.
     *
     * @example
     * ```ts
     * lang.has("hello.world.text");
     * ```
     */
    public has<K extends NestedKeyOf<T>>(key: K, language?: string): boolean {
        const lang = language ?? this.currentLanguage;
        const value = this.resolvePath(this.resources[lang], key as string);
        return value !== undefined;
    }
    /**
     * Dịch một key sang text tương ứng.
     *
     * Hỗ trợ placeholder variable:
     * ```txt
     * "{user}" -> variables.user
     * ```
     *
     * @typeParam K Kiểu key nested của language object.
     *
     * @param key Key cần translate.
     * @param variables Danh sách biến placeholder.
     * @param language Ngôn ngữ muốn sử dụng.
     * Nếu không truyền sẽ dùng ngôn ngữ hiện tại.
     *
     * @throws {Error}
     * Được throw khi ngôn ngữ không tồn tại.
     *
     * @returns Chuỗi đã được translate.
     *
     * @example
     * ```ts
     * lang.translate("hello.world.text", {
     *     user: "Vinh"
     * });
     * ```
     */
    public translate<K extends NestedKeyOf<T>>(key: K, variables?: Record<string, Primitive>, language?: string): string {
        const lang = language ?? this.currentLanguage;
        const resource = this.resources[lang];
        if (!resource) {
            throw new Error(`Language "${lang}" does not exist.`);
        }
        const value = this.resolvePath(resource, key as string);
        if (typeof value !== "string") return this.handleFallback(key as string);
        if (!variables) return value;
        return value.replace(/\{(.*?)\}/g, (_, variable: string) => {
            const data = variables[variable];
            if (data === undefined || data === null) return `{${variable}}`;
            return String(data);
        });
    }
    /**
     * Alias ngắn gọn của {@link translate}.
     *
     * @typeParam K Kiểu key nested của language object.
     *
     * @param key Key cần translate.
     * @param variables Danh sách placeholder variable.
     * @param language Ngôn ngữ muốn sử dụng.
     *
     * @returns Chuỗi đã được translate.
     *
     * @example
     * ```ts
     * lang.t("hello.world.text");
     * ```
     */
    public t<K extends NestedKeyOf<T>>(key: K, variables?: Record<string, Primitive>, language?: string): string {
        return this.translate(key, variables, language);
    }
    /**
     * Lấy toàn bộ resource data của một ngôn ngữ.
     *
     * @param language Mã ngôn ngữ cần lấy.
     * Nếu không truyền sẽ dùng ngôn ngữ hiện tại.
     *
     * @throws {Error}
     * Được throw khi ngôn ngữ không tồn tại.
     *
     * @returns Object resource của ngôn ngữ.
     *
     * @example
     * ```ts
     * const data = lang.getLanguage("vi");
     * ```
     */
    public getLanguage(language?: string): T {
        const lang = language ?? this.currentLanguage;
        if (!this.resources[lang]) {
            throw new Error(`Language "${lang}" does not exist.`);
        }
        return this.resources[lang];
    }
    /**
     * Lấy danh sách tất cả mã ngôn ngữ hiện có.
     *
     * @returns Mảng chứa danh sách mã ngôn ngữ.
     *
     * @example
     * ```ts
     * console.log(lang.getLanguages());
     * // ["vi", "en"]
     * ```
     */
    public getLanguages(): string[] {
        return Object.keys(this.resources);
    }
    /**
     * Resolve nested path.
     */
    private resolvePath(object: unknown, path: string): unknown {
        return path.split(".").reduce((accumulator: any, current: string) => accumulator?.[current], object);
    }
    /**
     * Handle fallback text.
     */
    private handleFallback(key: string): string {
        if (typeof this.fallback === "function") return this.fallback(key);
        if (typeof this.fallback === "string") return this.fallback;
        return key;
    }
}