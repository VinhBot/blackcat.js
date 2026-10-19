/**
 * Interface định nghĩa contract cho các storage driver
 * được sử dụng bởi class `Database`.
 * @hidden
 *
 * ⚠️ Đây **không phải database chính**.
 * Interface này chỉ dùng để xây dựng **các driver lưu trữ phụ trợ**
 * như:
 *
 * - `JSONDriver`
 * - `MemoryDriver`
 * - `SQLiteDriver`
 *
 * Các driver này chỉ chịu trách nhiệm:
 *
 * - Lưu trữ toàn bộ dữ liệu database
 * - Trả về dữ liệu database khi được yêu cầu
 *
 * Mọi logic xử lý dữ liệu như:
 *
 * - parse key path (`a.b.c`)
 * - validation
 * - query/filter/map
 * - update dữ liệu
 *
 * đều được thực hiện trong class `Database`.
 */
export interface DatabaseDriver {
    /**
     * Lấy toàn bộ dữ liệu database từ storage.
     *
     * Method này phải trả về **toàn bộ object database**.
     *
     * @template T Kiểu dữ liệu database.
     * @returns Promise chứa toàn bộ dữ liệu database.
     */
    all<T = any>(): Promise<T>;
    /**
     * Ghi toàn bộ dữ liệu database vào storage.
     *
     * ⚠️ Method này **không xử lý key path**.
     * Object database đã được cập nhật trước bởi class `Database`.
     *
     * @param keys Placeholder dùng để tương thích với API của `Database`.
     * Driver có thể bỏ qua tham số này nếu không cần thiết.
     *
     * @param data Toàn bộ object database sau khi đã được cập nhật.
     *
     * @template T Kiểu dữ liệu database.
     * @returns Promise chứa dữ liệu đã được ghi.
     */
    set<T = any>(data: T): Promise<T>;
    /**
     * Xóa toàn bộ dữ liệu database khỏi storage.
     *
     * Thường được sử dụng bởi `Database.deleteAll()`.
     *
     * @returns `true` nếu thao tác thành công.
     */
    delete(): Promise<boolean>;
    /**
     * (Tùy chọn) Khởi tạo driver (mở kết nối, tạo file/bảng...).
     * `Database` sẽ gọi một lần trước thao tác đầu tiên.
     */
    init?(): Promise<void>;
    /**
     * (Tùy chọn) Ghi mọi dữ liệu đang chờ xuống storage (dành cho driver có cache/write-behind).
     */
    flush?(): Promise<void>;
    /**
     * (Tùy chọn) Giải phóng tài nguyên (đóng kết nối, dừng timer...).
     */
    close?(): Promise<void>;
    /**
     * (Tùy chọn) **Đường nhanh**: đọc một giá trị theo path mà không cần đọc toàn bộ database.
     *
     * - Trả về `{ found: true, value }` hoặc `{ found: false }` khi chắc chắn.
     * - Trả về `undefined` nếu driver không hỗ trợ path này → `Database` tự quay về đọc toàn bộ.
     */
    getPath?(parts: string[]): Promise<PathReadResult | undefined>;
    /**
     * (Tùy chọn) **Đường nhanh**: ghi một giá trị theo path mà không cần ghi lại toàn bộ database.
     *
     * Trả về `true` nếu đã ghi, `false` nếu không hỗ trợ trường hợp này → `Database` quay về cách cũ.
     */
    setPath?(parts: string[], value: unknown): Promise<boolean>;
}

/**
 * Kết quả của {@link DatabaseDriver.getPath}.
 */
export type PathReadResult = { found: true; value: unknown } | { found: false };

/**
 * Cấu hình khởi tạo cho một instance của {@link Database}.
 * @hidden
 *
 * Interface này xác định các tùy chọn cần thiết để thiết lập database,
 * bao gồm driver lưu trữ và các tùy chọn hành vi bổ sung.
 *
 * @example
 * const db = new Database({
 *   driver: new MemoryDriver(),
 *   debug: true
 * });
 */
export interface DatabaseConfiguration {
    /**
     * Driver dùng để đọc/ghi dữ liệu của database.
     *
     * Driver chịu trách nhiệm xử lý storage backend
     * (ví dụ: memory, file, json, mongo, redis...).
     */
    driver: DatabaseDriver;
    /**
     * Ký tự phân tách dùng để tách các phần của đường dẫn (key).
     *
     * @defaultValue "."
     *
     * @example
     * ```ts
     * // "user.profile.name"
     * delimiter: "."
     *
     * // "user/profile/name"
     * delimiter: "/"
     * ```
     */
    delimiter?: string;
    /**
     * Bật chế độ debug.
     *
     * Khi `true`, database có thể log thêm thông tin về
     * các thao tác đọc/ghi hoặc lỗi để hỗ trợ debug.
     *
     * @defaultValue false
     */
    debug?: boolean;
    /**
     * Nếu `true`, các giá trị trả về sẽ được sao chép sâu để thay đổi chúng
     * không làm ảnh hưởng dữ liệu bên trong (đặc biệt với `MemoryDriver`/`CachedDriver`).
     *
     * @defaultValue false
     */
    cloneOnRead?: boolean;
    /**
     * Nếu `true`, `push`/`unshift` sẽ tự tạo mảng rỗng khi key chưa tồn tại
     * thay vì ném lỗi `INVALID_KEY`.
     *
     * @defaultValue false
     */
    autoCreateArrays?: boolean;
    /**
     * Dữ liệu mặc định. Ở lần dùng đầu tiên, các key còn thiếu sẽ được điền vào database.
     */
    defaults?: Record<string, any>;
    /**
     * Hàm kiểm tra giá trị trước khi ghi (`set`, `update`, `ensure`, `setMany`).
     * Trả `false` hoặc một chuỗi (thông báo lỗi) để từ chối.
     */
    validator?: DatabaseValidator;
    /**
     * Mặc định cách loại trùng khi `update` nối mảng.
     * Nếu không đặt, dùng hành vi tương thích cũ (`username` + `guild` cho object).
     */
    uniqueBy?: UniqueBy;
    /**
     * Key (cấp cao nhất) dùng để lưu thời hạn TTL.
     *
     * @defaultValue "__blackcat_ttl__"
     */
    ttlKey?: string;
    /**
     * Chu kỳ (ms) quét và xóa các key hết hạn. `0` để tắt quét nền (key vẫn hết hạn khi truy cập).
     *
     * @defaultValue 60000
     */
    ttlSweepInterval?: number;
    /**
     * Tự động sao lưu định kỳ.
     */
    autoBackup?: AutoBackupOptions;
}

/**
 * Cách xác định hai phần tử mảng là "trùng nhau".
 */
export type UniqueBy = string[] | ((item: any) => unknown);

/**
 * Ngữ cảnh truyền vào {@link DatabaseValidator}.
 */
export interface ValidatorContext {
    key: string;
    value: unknown;
    operation: "set" | "update" | "ensure" | "setMany";
}

/**
 * Hàm validate. Trả `false` hoặc chuỗi (lý do) để từ chối, `true`/`void` để chấp nhận.
 */
export type DatabaseValidator = (context: ValidatorContext) => boolean | string | void;

/**
 * Tùy chọn sao lưu.
 */
export interface AutoBackupOptions {
    /** Thư mục chứa file backup. @defaultValue "./backups" */
    dir?: string;
    /** Chu kỳ sao lưu (ms). @defaultValue 3600000 */
    every?: number;
    /** Số bản sao lưu giữ lại. @defaultValue 5 */
    keep?: number;
}

/**
 * Tùy chọn cho {@link Database.set}.
 */
export interface SetOptions {
    /** Thời gian sống (ms). Hết hạn key sẽ tự bị xóa. */
    ttl?: number;
}

/**
 * Toán tử truy vấn dùng trong `findOne`, `findMany`, `deleteMany`, `updateMany`, `count`.
 */
export interface QueryOperators<T = any> {
    $eq?: T;
    $ne?: T;
    $gt?: T;
    $gte?: T;
    $lt?: T;
    $lte?: T;
    $in?: readonly T[];
    $nin?: readonly T[];
    $exists?: boolean;
    $regex?: RegExp | string;
}

/**
 * Điều kiện truy vấn. Mỗi field có thể là giá trị (so sánh `==`) hoặc {@link QueryOperators}.
 */
export type Query<T> = { [K in keyof T]?: T[K] | QueryOperators<NonNullable<T[K]>> };

/**
 * Hướng sắp xếp.
 */
export type SortDirection = 1 | -1 | "asc" | "desc";

/**
 * Cách sắp xếp: object `{ field: 1 | -1 }` hoặc hàm so sánh.
 */
export type SortSpec<T = any> = { [K in keyof T & string]?: SortDirection } | ((a: T, b: T) => number);

/**
 * Tùy chọn cho `findMany`.
 */
export interface FindOptions<T = any> {
    sort?: SortSpec<T>;
    limit?: number;
    skip?: number;
}

/**
 * Tùy chọn cho `paginate`.
 */
export interface PaginateOptions<T = any> {
    page?: number;
    pageSize?: number;
    query?: Query<T>;
    sort?: SortSpec<T>;
}

/**
 * Kết quả của `paginate`.
 */
export interface Page<T = any> {
    items: T[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

/**
 * Tùy chọn cho `keys`/`values`/`entries`.
 */
export interface IterateOptions {
    /** Bỏ qua các giá trị `null`/`undefined`. Mặc định: `true` cho `keys(key)`, `false` cho các trường hợp còn lại. */
    skipNullish?: boolean;
}

/**
 * Các sự kiện của {@link Database}.
 */
export interface DatabaseChangeEvent {
    operation: string;
    key?: string;
    value?: unknown;
}
export interface DatabaseEvents {
    change: DatabaseChangeEvent;
    set: DatabaseChangeEvent;
    update: DatabaseChangeEvent;
    delete: DatabaseChangeEvent;
    clear: DatabaseChangeEvent;
    expire: { key: string };
    error: Error;
}
/**
 * Đại diện cho một giá trị có thể là `T` hoặc `null`.
 * @hidden
 *
 * Utility type này loại bỏ `undefined` khỏi union để đảm bảo
 * giá trị chỉ có thể là kiểu `T` hoặc `null`.
 *
 * Điều này hữu ích khi một API có thể không tìm thấy kết quả,
 * nhưng vẫn muốn tránh việc trả về `undefined`.
 *
 * @typeParam T - Kiểu dữ liệu gốc.
 *
 * @example
 * type User = { id: number };
 *
 * const user: Maybe<User> = { id: 1 }; // hợp lệ
 * const noUser: Maybe<User> = null; // hợp lệ
 * const invalid: Maybe<User> = undefined; // lỗi
 */
export type Maybe<T> = Exclude<T | null, undefined>;
/**
 * Utility type dùng để trích xuất kiểu phần tử bên trong một mảng.
 * @hidden
 *
 * Nếu `T` là một mảng (`U[]`) thì kiểu trả về sẽ là `U` (kiểu phần tử).
 * Nếu `T` không phải là mảng thì kiểu trả về chính là `T`.
 *
 * Thường được sử dụng trong các generic type để làm việc
 * với kiểu dữ liệu của phần tử trong mảng một cách an toàn.
 *
 * @typeParam T - Kiểu dữ liệu đầu vào, có thể là mảng hoặc bất kỳ kiểu nào.
 *
 * @example
 * type A = ArrayElement<string[]>;
 * // Kết quả: string
 *
 * @example
 * type B = ArrayElement<number[]>;
 * // Kết quả: number
 *
 * @example
 * type C = ArrayElement<string>;
 * // Kết quả: string
 *
 * @example
 * type D = ArrayElement<(number | string)[]>;
 * // Kết quả: number | string
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : T;
/**
 * Utility type điều kiện dùng để trả về một kiểu dữ liệu
 * dựa trên giá trị boolean của điều kiện.
 * @hidden
 *
 * Nếu `T` là `true` thì kiểu trả về sẽ là `IfTrue`.
 * Nếu `T` là `false` thì kiểu trả về sẽ là `IfFalse`.
 *
 * Thường được sử dụng trong các generic type phức tạp
 * để lựa chọn kiểu dữ liệu tại thời điểm compile.
 *
 * @typeParam T - Điều kiện kiểu boolean.
 * @typeParam IfTrue - Kiểu dữ liệu trả về khi `T` là `true`.
 * @typeParam IfFalse - Kiểu dữ liệu trả về khi `T` là `false`. Mặc định là `null`.
 *
 * @example
 * type A = If<true, string, number>;
 * // Kết quả: string
 *
 * @example
 * type B = If<false, string, number>;
 * // Kết quả: number
 *
 * @example
 * // IfFalse mặc định là null
 * type C = If<false, string>;
 * // Kết quả: null
 */
export type If<T extends boolean, IfTrue, IfFalse = null> = T extends true ? IfTrue : IfFalse;
/**
 * Kiểm tra xem một kiểu dữ liệu có phải là **object thuần** hay không.
 * @hidden
 *
 * Type này sẽ trả về `true` nếu `T` là object dạng `Record`
 * và **không phải** là:
 *
 * - `null`
 * - `undefined`
 * - `Array`
 *
 * Nếu `T` thuộc các trường hợp trên thì kết quả sẽ là `false`.
 *
 * Utility type này thường được dùng trong các generic phức tạp
 * để xác định liệu một kiểu dữ liệu có thể được xử lý như object hay không.
 *
 * @typeParam T - Kiểu dữ liệu cần kiểm tra.
 *
 * @example
 * type A = IsObject<{ name: string }>;
 * // Kết quả: true
 *
 * @example
 * type B = IsObject<string>;
 * // Kết quả: false
 *
 * @example
 * type C = IsObject<string[]>;
 * // Kết quả: false
 *
 * @example
 * type D = IsObject<null>;
 * // Kết quả: false
 */
export type IsObject<T> = T extends null ? false : T extends undefined ? false : T extends any[] ? false : T extends Record<any, any> ? true : false;
/**
 * Đại diện cho kiểu dữ liệu có thể là **mảng của `T`**
 * hoặc **một tuple chứa mảng `T`**.
 * @hidden
 *
 * Utility type này thường được sử dụng để hỗ trợ các API
 * chấp nhận cả hai cách truyền tham số:
 *
 * - truyền nhiều giá trị dạng `...spread`
 * - truyền một mảng các giá trị
 *
 * @typeParam T - Kiểu phần tử của mảng.
 *
 * @example
 * type A = RestOrArray<number>;
 * // number[] | [number[]]
 *
 * @example
 * function example(...values: RestOrArray<number>) {}
 *
 * example(1, 2, 3);       // hợp lệ
 * example([1, 2, 3]);     // hợp lệ
 */
export type RestOrArray<T> = T[] | [T[]];
/**
 * Trích xuất kiểu phần tử từ một kiểu mảng.
 * @hidden
 *
 * Nếu `A` là kiểu `Array<T>` thì kết quả sẽ là `T`.
 * Nếu `A` không phải là mảng thì kết quả sẽ giữ nguyên kiểu `A`.
 *
 * Utility type này thường được dùng để lấy kiểu của phần tử
 * bên trong mảng khi làm việc với các generic phức tạp.
 *
 * @typeParam A - Kiểu dữ liệu cần kiểm tra và trích xuất.
 *
 * @example
 * type A = ExtractFromArray<number[]>;
 * // Kết quả: number
 *
 * @example
 * type B = ExtractFromArray<string[]>;
 * // Kết quả: string
 *
 * @example
 * type C = ExtractFromArray<boolean>;
 * // Kết quả: boolean
 *
 * @example
 * type D = ExtractFromArray<{ id: number }[]>;
 * // Kết quả: { id: number }
 */
export type ExtractFromArray<A> = A extends Array<infer T> ? T : A;
/**
 * Chuyển đổi kiểu `T` thành **mảng của `T`** hoặc giữ nguyên
 * nếu `T` đã là một **tuple hợp lệ**.
 * @hidden
 *
 * Nếu `T` là tuple (ví dụ `[string, number]`) thì kiểu sẽ giữ nguyên.
 * Nếu `T` không phải tuple thì kết quả sẽ là `T[]`.
 *
 * Utility type này thường được dùng khi muốn hỗ trợ cả:
 * - tuple có kích thước cố định
 * - mảng thông thường
 *
 * @typeParam T - Kiểu dữ liệu cần chuyển đổi.
 *
 * @example
 * type A = TupleOrArray<number>;
 * // Kết quả: number[]
 *
 * @example
 * type B = TupleOrArray<[number, string]>;
 * // Kết quả: [number, string]
 *
 * @example
 * type C = TupleOrArray<boolean>;
 * // Kết quả: boolean[]
 */
export type TupleOrArray<T> = T extends [...infer _Rest] ? T : T[];
/**
 * Đại diện cho hàm callback dùng để truy vấn hoặc xử lý
 * các phần tử trong một mảng.
 * @hidden
 *
 * Type này thường được sử dụng trong các method giống
 * các phương thức của `Array` như:
 *
 * - `map`
 * - `find`
 * - `filter`
 * - `some`
 * - `every`
 * - `findIndex`
 *
 * @typeParam T - Kiểu dữ liệu của từng phần tử trong mảng.
 * @typeParam R - Kiểu dữ liệu trả về của hàm callback. Mặc định là `any`.
 *
 * @param item - Phần tử hiện tại đang được xử lý.
 * @param index - Vị trí của phần tử trong mảng.
 * @param values - Toàn bộ mảng giá trị đang được duyệt.
 *
 * @returns Giá trị trả về của callback.
 *
 * @example
 * const result = await db.find((user) => user.id === 1);
 *
 * @example
 * const names = await db.map((user) => user.name);
 *
 * @example
 * const admins = await db.filter((user) => user.role === "admin");
 */
export type QueryFunction<T, R = any> = (item: T, index: number, values: T[]) => R;
/**
 * Trích xuất tất cả các key của một object và trả về dưới dạng **union type**.
 * @hidden
 *
 * Type này sử dụng toán tử `keyof` của TypeScript để lấy danh sách
 * các thuộc tính của object `T`.
 *
 * @typeParam T - Object cần trích xuất các key.
 *
 * @example
 * type User = {
 *   id: number;
 *   name: string;
 *   age: number;
 * };
 *
 * type Keys = ExtractObjectKeys<User>;
 * // Kết quả: "id" | "name" | "age"
 *
 * @example
 * type Config = {
 *   host: string;
 *   port: number;
 * };
 *
 * type Keys = ExtractObjectKeys<Config>;
 * // Kết quả: "host" | "port"
 */
export type ExtractObjectKeys<T extends Record<string, any>> = keyof T;
/**
 * Trích xuất tất cả **giá trị (values)** của một object
 * và trả về dưới dạng **union type**.
 * @hidden
 *
 * Type này sẽ:
 * 1. Lấy tất cả key của object bằng `ExtractObjectKeys<T>`
 * 2. Lấy giá trị tương ứng `T[key]`
 * 3. Loại bỏ `null` và `undefined` bằng `NonNullable`
 *
 * @typeParam T - Object cần trích xuất các giá trị.
 *
 * @example
 * type User = {
 *   id: number;
 *   name: string;
 *   active: boolean;
 * };
 *
 * type Values = ExtractObjectValues<User>;
 * // Kết quả: number | string | boolean
 *
 * @example
 * type Example = {
 *   a: number | null;
 *   b: string | undefined;
 * };
 *
 * type Values = ExtractObjectValues<Example>;
 * // Kết quả: number | string
 */
export type ExtractObjectValues<T extends Record<string, any>> = NonNullable<T[ExtractObjectKeys<T>]>;
/**
 * Trích xuất các **cặp key-value** từ một object.
 * @hidden
 *
 * Type này tạo ra một tuple dạng `[key, value]`
 * đại diện cho entry của object.
 *
 * @typeParam T - Object cần trích xuất entries.
 *
 * @example
 * type User = {
 *   id: number;
 *   name: string;
 * };
 *
 * type Entry = ExtractObjectEntries<User>;
 * // Kết quả:
 * // ["id" | "name", number | string]
 *
 * @example
 * type Config = {
 *   host: string;
 *   port: number;
 * };
 *
 * type Entry = ExtractObjectEntries<Config>;
 * // ["host" | "port", string | number]
 */
export type ExtractObjectEntries<T extends Record<string, any>> = [ExtractObjectKeys<T>, ExtractObjectValues<T>];
/**
 * Kiểm tra xem một kiểu dữ liệu có phải là `any` hay không.
 * @hidden
 *
 * Type này sử dụng kỹ thuật đặc biệt của TypeScript
 * để phát hiện kiểu `any`. Nếu `T` là `any` thì kết quả
 * sẽ là `true`, ngược lại sẽ là `false`.
 *
 * @typeParam T - Kiểu dữ liệu cần kiểm tra.
 *
 * @example
 * type A = IsAny<any>;
 * // Kết quả: true
 *
 * @example
 * type B = IsAny<string>;
 * // Kết quả: false
 *
 * @example
 * type C = IsAny<unknown>;
 * // Kết quả: false
 */
export type IsAny<T> = 0 extends (1 & T) ? true : false;
/**
 * Tạo kiểu `string` hỗ trợ **autocomplete từ union string**
 * nhưng vẫn cho phép nhập bất kỳ chuỗi nào.
 * @hidden
 *
 * Type này thường dùng khi muốn:
 *
 * - IDE gợi ý các giá trị có sẵn
 * - nhưng vẫn cho phép người dùng nhập string tùy ý
 *
 * @typeParam S - Union các chuỗi được dùng để autocomplete.
 *
 * @example
 * type Status = AutocompletableString<"online" | "offline" | "idle">;
 *
 * const a: Status = "online";  // IDE autocomplete
 * const b: Status = "offline"; // IDE autocomplete
 * const c: Status = "custom";  // vẫn hợp lệ
 */
export type AutocompletableString<S extends string> = S | (string & {});
/**
 * Đại diện cho **đường dẫn (path)** tới một thuộc tính trong object,
 * hỗ trợ truy cập các property lồng nhau bằng `dot notation`.
 * @hidden
 *
 * Type này được dùng để tạo **autocomplete path** trong IDE.
 *
 * @typeParam T - Object cần tạo path.
 * @typeParam TKey - Key của object (mặc định là `keyof T`).
 *
 * @example
 * type User = {
 *   id: number;
 *   profile: {
 *     name: string;
 *     age: number;
 *   };
 * };
 *
 * type Paths = ObjectPath<User>;
 *
 * // Kết quả:
 * // "id"
 * // "profile"
 * // "profile.name"
 * // "profile.age"
 *
 * @example
 * type Example = {
 *   user: {
 *     profile: {
 *       name: string;
 *     };
 *   };
 * };
 *
 * type Paths = ObjectPath<Example>;
 * // "user"
 * // "user.profile"
 * // "user.profile.name"
 */
export type ObjectPath<T, TKey extends keyof T = keyof T, Depth extends unknown[] = []> = Depth["length"] extends 8 ? string : IsAny<T> extends true ? string : T extends string | number | boolean | symbol ? string : T extends Array<any> ? TKey & string : TKey extends string ? NonNullable<T[TKey]> extends Array<any> ? TKey : NonNullable<T[TKey]> extends Record<string, any> ? `${TKey}` | `${TKey}.${ObjectPath<NonNullable<T[TKey]>, keyof NonNullable<T[TKey]>, [...Depth, unknown]>}` : TKey : never;
/**
 * Trích xuất kiểu dữ liệu của giá trị tại một object path.
 * @hidden
 *
 * Type này cho phép suy ra kiểu của thuộc tính dựa trên
 * đường dẫn dạng `dot notation`.
 *
 * @typeParam T - Object nguồn.
 * @typeParam P - Object path cần lấy giá trị.
 *
 * @example
 * type User = {
 *   profile: {
 *     name: string;
 *     age: number;
 *   };
 * };
 *
 * type A = ObjectValue<User, "profile.name">;
 * // Kết quả: string
 *
 * @example
 * type B = ObjectValue<User, "profile.age">;
 * // Kết quả: number
 *
 * @example
 * type C = ObjectValue<User, "profile">;
 * // Kết quả: { name: string; age: number }
 */

export type ObjectValue<T, P extends ObjectPath<T> | AutocompletableString<ObjectPath<T>>> =
    T extends | string | number | boolean | bigint | symbol | null | undefined | Date | Function ? T
    // Nếu T là array → unwrap rồi xử lý tiếp
    : T extends (infer U)[]
    ? ObjectValue<U, P>[]
    // Nếu có dạng a.b.c
    : P extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
    ? ObjectValue<T[Key], Rest>
    : never
    // Nếu là key cuối
    : P extends keyof T
    ? T[P]

    : never;