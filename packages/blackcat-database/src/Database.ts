import { DatabaseConfiguration, AutocompletableString, FirstObjectKey, If, IsObject, ObjectPath, ObjectValue, Maybe, QueryFunction, RestOrArray, ExtractFromArray, DatabaseDriver, ArrayElement } from "./types";
import { BlackCatError, createTypesArray, isNumber, typeOf, TypedObject, isObject } from "./utils";

/**
 * Class Database cung cấp API thao tác dữ liệu dạng key-path
 * trên nhiều loại storage khác nhau thông qua `DatabaseDriver`.
 *
 * Đây là **lớp database chính (logic layer)** của hệ thống.
 *
 * Class này chịu trách nhiệm:
 * - parse key path (`user.profile.name`)
 * - validate dữ liệu
 * - thao tác object
 * - query dữ liệu (find, filter, map...)
 *
 * Việc lưu trữ dữ liệu thực tế sẽ được thực hiện bởi các **driver phụ trợ**
 * như:
 *
 * - `JSONDriver`
 * - `MemoryDriver`
 * - `SQLiteDriver`
 * - `MongoDriver`
 *
 * Các driver này chỉ chịu trách nhiệm:
 * - đọc toàn bộ dữ liệu database
 * - ghi toàn bộ dữ liệu database
 *
 * @template V Kiểu dữ liệu tổng thể của database.
 */
export class Database<V = any> {
    /**
     * Storage driver được sử dụng để đọc và ghi dữ liệu database.
     *
     * Driver phải implement interface `DatabaseDriver`.
     *
     * Ví dụ:
     * ```ts
     * const db = new Database({
     *   driver: new JSONDriver({ filePath: "./database.json" }),
     * })
     * ```
     */
    public driver: DatabaseDriver;
    /**
     * Khởi tạo Database instance.
     *
     * @param options Cấu hình database.
     * @param options.driver Driver lưu trữ dữ liệu.
     *
     * @example
     * ```ts
     * const db = new Database({
     *   driver: new JSONDriver({ filePath: "./database.json" }),
     * })
     * ```
     *
     * Ví dụ với MongoDB:
     *
     * ```ts
     * const db = new Database({
     *   driver: new MongoDriver({
     *     uri: "mongodb://localhost:27017",
     *     databaseName: "mydb"
     *   })
     * });
     * ```
     */
    constructor(options: DatabaseConfiguration) {
        this.driver = options.driver;
    }
    /**
     * Lấy toàn bộ dữ liệu từ database thông qua driver.
     *
     * @template T Kiểu dữ liệu object database trả về.
     *
     * @returns Promise chứa toàn bộ dữ liệu database.
     *
     * @example
     * ```ts
     * const data = await db.all();
     * console.log(data.users);
     * ```
     */
    public async all<T extends Record<string, any> = Record<string, any>>(): Promise<T> {
        return await this.driver.all<T>();
    }
    /**
     * Lấy giá trị từ database theo key-path.
     *
     * Key có thể là chuỗi dạng path:
     *
     * ```
     * user.profile.name
     * economy.users.123.balance
     * ```
     *
     * Nếu không truyền `key`, method sẽ trả về **toàn bộ database**.
     *
     * @template {AutocompletableString<ObjectPath<V>>} P Key path trong database.
     *
     * @param {AutocompletableString<P>} key Đường dẫn dữ liệu cần lấy.
     *
     * @returns Giá trị tại key hoặc `null` nếu không tồn tại.
     *
     * @example
     * ```ts
     * const name = await db.get("user.profile.name");
     * ```
     *
     * @example
     * ```ts
     * const all = await db.get();
     * ```
     */
    public async get<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>): Promise<Maybe<ObjectValue<V, P>> | V> {
        const data = await this.all();
        if (key === undefined) return data as V;
        if (typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
        }
        const keys = key.split(".");
        let result: any = data;
        for (const k of keys) {
            if (!isObject(result) && !Array.isArray(result)) return null;
            result = result[k];
            if (result === undefined) return null;
        }
        return result;
    }
    /**
     * Tìm và trả về một bản ghi đầu tiên khớp với điều kiện trong database.
     *
     * Hàm này có hai cách sử dụng:
     *
     * 1. **Chỉ truyền `key`**
     *    → Trả về toàn bộ dữ liệu của key (tương tự `get()`).
     *
     * 2. **Truyền `key` và `query`**
     *    → Tìm phần tử đầu tiên trong mảng dữ liệu của key khớp với điều kiện.
     *
     * @template V - Kiểu dữ liệu của database.
     * @template P - Đường dẫn key trong object (`ObjectPath<V>`).
     *
     * @param key - Key hoặc đường dẫn đến dữ liệu cần truy vấn.
     * @param query - Đối tượng điều kiện để tìm bản ghi phù hợp.
     *
     * @returns
     * - Nếu chỉ có `key`: trả về toàn bộ dữ liệu của key.
     * - Nếu có `query`: trả về bản ghi đầu tiên khớp điều kiện.
     * - Nếu không tìm thấy: trả về `null`.
     *
     * @example
     * Chỉ lấy dữ liệu theo key
     * ```ts
     * const users = await db.findOne("user");
     * ```
     *
     * @example
     * Tìm một bản ghi theo điều kiện
     * ```ts
     * const user = await db.findOne("user", {
     *   guild: 1234566
     * });
     * ```
     */
    public async findOne<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>, query?: Partial<ArrayElement<ObjectValue<V, P>>>): Promise<Maybe<ObjectValue<V, P>> | V> {
        const data = await this.get(key as any);
        if (!query) return data;
        if (!Array.isArray(data)) return null as Maybe<ObjectValue<V, P>>;
        const result = data.find((item) => {
            return Object.entries(query as Record<string, any>).every(([k, v]) => item[k] == v);
        });
        return (result ?? null) as Maybe<ObjectValue<V, P>>;
    }
    /**
     * Kiểm tra một key-path có tồn tại trong database hay không.
     *
     * Method này sử dụng `get()` để xác định giá trị có tồn tại.
     *
     * @template {AutocompletableString<ObjectPath<V>>} P Key path trong database.
     *
     * @param {AutocompletableString<P>} key Đường dẫn dữ liệu cần kiểm tra.
     *
     * @returns `true` nếu key tồn tại, ngược lại `false`.
     *
     * @example
     * ```ts
     * const exists = await db.has("users.123");
     * ```
     */
    public async has<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        const value = await this.get(key);
        return value !== null && value !== undefined;
    }
    /**
     * Gán giá trị cho một key-path trong database.
     *
     * Nếu key-path chưa tồn tại, các object trung gian
     * sẽ được tự động tạo.
     *
     * @template {AutocompletableString<ObjectPath<V>>} P Key path trong database.
     *
     * @param {AutocompletableString<P>} key Đường dẫn dữ liệu cần gán giá trị.
     * @param {ObjectValue<V, P>} value Giá trị mới.
     *
     * @returns {Promise<If<IsObject<V>, ObjectValue<V, FirstObjectKey<P>>, V>>} Giá trị vừa được set hoặc object root nếu value là object.
     *
     * @example
     * ```ts
     * await db.set("users.123.name", "Alice");
     * ```
     *
     * @example
     * ```ts
     * await db.set("config.prefix", "!");
     * ```
     */
    public async set<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, value: ObjectValue<V, P>): Promise<If<IsObject<V>, ObjectValue<V, FirstObjectKey<P>>, V>> {
        const allDatabase = await this.all();
        if (!key) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "key");
        }
        if (typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
        }
        const keys = key.split(".");
        let currentObj = allDatabase;

        for (let i = 0; i < keys.length; i++) {
            if (keys.length - 1 === i) {
                currentObj[keys[i]] = value
            } else {
                if (!isObject(currentObj[keys[i]])) {
                    currentObj[keys[i]] = {};
                }
                currentObj = currentObj[keys[i]];
            };
        };
        await this.driver.set(allDatabase);
        return typeof value == "object" && value !== null ? await this.get(keys[0]) as any : value as any;
    }
    /**
     * Xóa một key khỏi database.
     *
     * Hỗ trợ nested path bằng dot notation.
     *
     * @typeParam P - Path của object.
     *
     * @param key - Đường dẫn key cần xóa.
     *
     * @returns
     * - `true` nếu xóa thành công
     * - `false` nếu key không tồn tại
     *
     * @throws BlackCatError
     * - INVALID_TYPE nếu key không phải string
     *
     * @example
     * await db.delete("user.name");
     */
    public async delete<P extends AutocompletableString<ObjectPath<V>>>(key?: AutocompletableString<P>): Promise<boolean> {
        if (typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeof key);
        }
        const allDatabase = await this.all();
        const keys = key.split(".");
        const lastKey = keys.pop() as string;
        let currentObj: any = allDatabase;
        for (const k of keys) {
            if (!isObject(currentObj[k])) {
                return false;
            }
            currentObj = currentObj[k];
        }
        if (!(lastKey in currentObj)) return false;
        delete currentObj[lastKey];
        await this.driver.set(allDatabase);
        return true;
    }
    /**
     * Xóa toàn bộ dữ liệu trong database.
     *
     * Method này gọi trực tiếp `driver.delete()` để reset storage.
     *
     * @returns `true` sau khi dữ liệu đã được xóa.
     *
     * @example
     * await db.deleteAll();
     */
    public async deleteAll(): Promise<boolean> {
        await this.driver.delete();
        return true;
    }
    /**
     * Xóa nhiều bản ghi trong một mảng dữ liệu dựa trên điều kiện truy vấn.
     *
     * ⚠️ Method này **chỉ hoạt động với dữ liệu dạng mảng (array)**.
     * Nếu dữ liệu tại `key` không phải là mảng, method sẽ **không thực hiện xóa**
     * và trả về `0`.
     *
     * Method sẽ duyệt qua toàn bộ phần tử trong mảng và xóa những phần tử
     * khớp với điều kiện `query`.
     *
     * @template V - Kiểu dữ liệu của database.
     * @template P - Đường dẫn key trong object (`ObjectPath<V>`).
     *
     * @param key - Đường dẫn đến mảng dữ liệu cần thao tác.
     * @param query - Điều kiện để xác định các phần tử cần xóa.
     * Có thể truyền:
     * - Một object điều kiện
     *
     * @returns Số lượng phần tử đã bị xóa khỏi mảng.
     *
     * @example
     * Database mẫu:
     * ```json
     * {
     *   "member": {
     *     "user": {
     *       "database": [
     *         { "guild": "123", "username": "vinh" },
     *         { "guild": "456", "username": "test" }
     *       ]
     *     }
     *   }
     * }
     * ```
     *
     * @example
     * Xóa tất cả user có guild = "123"
     * ```ts
     * await db.deleteMany("member.user.database", {
     *   guild: "123"
     * });
     * ```
     */
    public async deleteMany<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, query: Partial<ArrayElement<ObjectValue<V, P>>>): Promise<number> {
        const data = await this.get(key as any);
        if (!Array.isArray(data)) return 0;
        const originalLength = data.length;
        const filtered = data.filter((item: any) => {
            return !Object.entries(query as Record<string, any>).every(([k, v]) => item[k] == v);
        });
        await this.set(key, filtered as any);

        return originalLength - filtered.length;
    }
    /**
     * Cập nhật dữ liệu trong database theo đường dẫn key.
     *
     * Hàm này sẽ tìm đến vị trí của `key` trong database và gán `value` vào đó.
     * Nếu `value` và giá trị hiện tại tại key đều là object thì sẽ thực hiện
     * **shallow merge** thay vì ghi đè toàn bộ object.
     *
     * Điều này giúp tránh việc làm mất các thuộc tính đã tồn tại.
     *
     * @template P - Đường dẫn key hợp lệ trong object database.
     *
     * @param key - Đường dẫn tới giá trị cần cập nhật.
     * Hỗ trợ nested path dạng `"a.b.c"`.
     *
     * @param value - Giá trị mới sẽ được cập nhật tại key.
     *
     * @returns
     * Trả về giá trị cuối cùng sau khi cập nhật.
     *
     * @example
     * Database ban đầu:
     * ```json
     * {
     *   "123": {
     *     "guildID": "123",
     *     "guildName": "BlackCat",
     *     "history": []
     *   }
     * }
     * ```
     *
     * Cập nhật:
     * ```ts
     * await db.update("123", {
     *   history: [1,2,3]
     * });
     * ```
     *
     * Kết quả:
     * ```json
     * {
     *   "123": {
     *     "guildID": "123",
     *     "guildName": "BlackCat",
     *     "history": [1,2,3]
     *   }
     * }
     * ```
     *
     * @throws {BlackCatError}
     * - `REQUIRED_PARAMETER_MISSING` nếu key không được cung cấp
     * - `INVALID_TYPE` nếu key không phải string
     */
    public async update<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, value: ObjectValue<V, P>): Promise<If<IsObject<V>, ObjectValue<V, FirstObjectKey<P>>, V>> {
        if (!key) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "key");
        }
        if (typeof key !== "string") {
            throw new BlackCatError("INVALID_TYPE", "key", "string", typeOf(key));
        }
        const allDatabase = await this.all();
        const keys = key.split(".");
        let current: any = allDatabase;
        for (let i = 0; i < keys.length - 1; i++) {
            const part = keys[i];
            if (!isObject(current[part])) {
                current[part] = {};
            }
            current = current[part];
        }

        const lastKey = keys[keys.length - 1];
        if (isObject(value) && isObject(current[lastKey])) {
            current[lastKey] = {
                ...current[lastKey],
                ...value
            };
        } else {
            current[lastKey] = value;
        }
        await this.driver.set(allDatabase);
        return current[lastKey];
    }
    /**
     * Cộng thêm giá trị vào một key dạng number.
     *
     * Nếu key chưa tồn tại, giá trị mặc định sẽ là `0`.
     *
     * @template P Key path trong database.
     *
     * @param key Đường dẫn dữ liệu dạng number.
     * @param numberToAdd Số cần cộng thêm.
     *
     * @returns Giá trị mới sau khi cộng.
     *
     * @example
     * ```ts
     * await db.add("economy.users.123.balance", 50);
     * ```
     */
    public async add<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, numberToAdd: number): Promise<number> {
        const targetNumber = await this.get(key) as any ?? 0;

        if (!isNumber(targetNumber)) {
            throw new BlackCatError("INVALID_TARGET", "number", typeOf(targetNumber));
        }
        if (numberToAdd === undefined) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "numberToAdd");
        }
        if (!isNumber(numberToAdd)) {
            throw new BlackCatError("INVALID_TYPE", "numberToAdd", "number", typeOf(numberToAdd));
        }
        return await this.set(key, targetNumber + numberToAdd) as Promise<number>;
    }
    /**
     * Trừ giá trị khỏi một key dạng number.
     *
     * Nếu key chưa tồn tại, giá trị mặc định sẽ là `0`.
     *
     * @template P Key path trong database.
     *
     * @param key Đường dẫn dữ liệu dạng number.
     * @param numberToSubtract Số cần trừ.
     *
     * @returns Giá trị mới sau khi trừ.
     *
     * @example
     * ```ts
     * await db.subtract("economy.users.123.balance", 20);
     * ```
     */
    public async subtract<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, numberToSubtract: number): Promise<number> {
        const targetNumber = await this.get(key) as any ?? 0;

        if (!isNumber(targetNumber)) {
            throw new BlackCatError("INVALID_TARGET", "number", typeOf(targetNumber));
        }
        if (numberToSubtract === undefined) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "numberToSubtract");
        }
        if (!isNumber(numberToSubtract)) {
            throw new BlackCatError("INVALID_TYPE", "numberToSubtract", "number", typeOf(numberToSubtract));
        }
        return await this.set(key, targetNumber - numberToSubtract as any) as Promise<number>;
    }
    /**
     * Thêm một hoặc nhiều phần tử vào cuối array tại key-path.
     *
     * Method này sẽ:
     * - kiểm tra target có phải array không
     * - chỉ thêm các giá trị **chưa tồn tại** trong array
     *
     * ⚠️ Nếu key không tồn tại hoặc target không phải array
     * thì sẽ ném lỗi.
     *
     * @template P Key path trong database.
     *
     * @param key Đường dẫn tới array cần thêm phần tử.
     * @param values Một hoặc nhiều giá trị cần thêm.
     *
     * @returns Array sau khi thêm phần tử.
     *
     * @example
     * ```ts
     * await db.push("users.123.roles", "admin");
     * ```
     *
     * @example
     * ```ts
     * await db.push("queue.songs", song1, song2);
     * ```
     */
    public async push<P extends ObjectPath<V>>(key: AutocompletableString<P>, ...values: RestOrArray<ExtractFromArray<ObjectValue<V, P>>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        if (!values.length) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "values");
        }
        const root = await this.all();
        const pathParts = key.split(".");
        let target = root;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (!(part in target)) {
                throw new BlackCatError("INVALID_KEY", key);
            }
            if (i === pathParts.length - 1) {
                if (!Array.isArray(target[part])) {
                    throw new BlackCatError("INVALID_TARGET", "array", typeOf(target[part]));
                }
                const uniqueValues = (values as any[]).filter(v => !target[part].includes(v));
                target[part].push(...uniqueValues);
            } else {
                target = target[part];
            }
        };
        const topKey = pathParts[0];
        await this.set(topKey, root[topKey]);
        return target[pathParts[pathParts.length - 1]];
    }
    /**
     * Thay thế phần tử trong array theo index.
     *
     * @typeParam P - Path trỏ đến array.
     *
     * @param key - Đường dẫn array.
     * @param targetArrayElementIndex - Index cần thay.
     * @param value - Giá trị mới.
     *
     * @returns Array sau khi thay thế.
     *
     * @throws BlackCatError
     * - INVALID_TYPE nếu index không phải number
     * - REQUIRED_PARAMETER_MISSING nếu thiếu value
     * - INVALID_KEY nếu path không tồn tại
     * - INVALID_TARGET nếu target không phải array
     *
     * @example
     * await db.pull("users", 0, { id: 2 });
     */
    public async pull<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, targetArrayElementIndex: number, value: ExtractFromArray<ObjectValue<V, P>>,): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        if (!isNumber(targetArrayElementIndex)) {
            throw new BlackCatError("INVALID_TYPE", "targetArrayElementIndex", "number", typeOf(targetArrayElementIndex));
        };
        if (value === undefined) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "value");
        };
        const root = await this.all();
        const pathParts = key.split(".");
        let target: any = root;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (!(part in target)) {
                throw new BlackCatError("INVALID_KEY", `Path "${key}" does not exist`);
            }
            if (i === pathParts.length - 1) {
                if (!Array.isArray(target[part])) {
                    throw new BlackCatError("INVALID_TARGET", "array", typeOf(target[part]));
                };
                const arr = target[part];
                const index = targetArrayElementIndex >= 0 ? targetArrayElementIndex : arr.length + targetArrayElementIndex;
                if (index < 0 || index >= arr.length) {
                    console.error(`Index ${targetArrayElementIndex} is out of bounds`);
                };
                arr[index] = value;
            } else {
                target = target[part];
            };
        };
        await this.set(pathParts[0], root[pathParts[0]]);
        return target[pathParts[pathParts.length - 1]];
    }
    /**
     * Xóa phần tử khỏi array theo index.
     *
     * Có thể truyền nhiều index hoặc một array index.
     *
     * @typeParam P - Path trỏ đến array.
     *
     * @param key - Đường dẫn array.
     * @param targetArrayElementIndexes - Các index cần xóa.
     *
     * @returns Danh sách phần tử đã bị xóa.
     *
     * @throws BlackCatError
     * - INVALID_TARGET nếu target không phải array
     * - REQUIRED_PARAMETER_MISSING nếu thiếu index
     * - ONE_OR_MORE_ARRAY_TYPES_INVALID nếu index không phải number
     *
     * @example
     * await db.pop("users", 0);
     * await db.pop("numbers", [1, 2, 3]);
     */
    public async pop<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>, ...targetArrayElementIndexes: RestOrArray<ExtractFromArray<number>>): Promise<ExtractFromArray<ObjectValue<V, P>>[]> {
        const targetArray = await this.get(key) ?? [];

        if (!Array.isArray(targetArray)) {
            throw new BlackCatError("INVALID_TARGET", "array", typeOf(targetArray));
        };

        if (!targetArrayElementIndexes.length) {
            throw new BlackCatError("REQUIRED_PARAMETER_MISSING", "targetArrayElementIndex");
        };
        const indexes = Array.isArray(targetArrayElementIndexes[0]) ? (targetArrayElementIndexes[0] as number[]) : (targetArrayElementIndexes as number[]);
        if (indexes.some(index => !isNumber(index))) {
            throw new BlackCatError("ONE_OR_MORE_ARRAY_TYPES_INVALID", "targetArrayElementIndexes", "number", createTypesArray(indexes));
        };

        const sortedIndexes = [...indexes].sort((a, b) => b - a);
        const removedElements: any[] = [];

        for (const index of sortedIndexes) {
            const removed = targetArray.splice(index, 1);
            removedElements.push(...removed);
        };

        const parentPath = key.split(".").slice(0, -1).join(".") as AutocompletableString<any>;
        const fieldName = key.split(".").slice(-1)[0];

        if (parentPath) {
            const parentObject = await this.get(parentPath) as Record<string, any> ?? {};
            parentObject[fieldName] = targetArray;
            await this.set(parentPath, parentObject as NonNullable<Exclude<ObjectValue<V, P>, undefined>>);
        } else {
            await this.set(key, targetArray as NonNullable<Exclude<ObjectValue<V, P>, undefined>>);
        };
        return removedElements;
    }
    /**
     * Kiểm tra xem giá trị tại key có phải là Array hay không.
     *
     * @typeParam P - Path của object trong database.
     * @param key - Đường dẫn key cần kiểm tra.
     *
     * @returns `true` nếu giá trị là Array, ngược lại `false`.
     *
     * @example
     * const result = await db.isTargetArray("users");
     * console.log(result);
     */
    public async isTargetArray<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        const target = await this.get(key);
        return Array.isArray(target);
    }
    /**
     * Kiểm tra xem giá trị tại key có phải là Number hay không.
     *
     * @typeParam P - Path của object trong database.
     *
     * @param key - Đường dẫn key cần kiểm tra.
     *
     * @returns `true` nếu giá trị là Number, ngược lại `false`.
     *
     * @example
     * const result = await db.isTargetNumber("stats.score");
     * console.log(result);
     */
    public async isTargetNumber<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<boolean> {
        const target = await this.get(key);
        return isNumber(target);
    }
    /**
     * Lấy danh sách các key của object trong database.
     *
     * Nếu không truyền `key` → trả về các key cấp cao nhất của database.
     *
     * @typeParam P - Path của object.
     *
     * @param key - Path của object cần lấy danh sách key.
     *
     * @returns Mảng các key tồn tại (không bao gồm `null` hoặc `undefined`).
     *
     * @example
     * const rootKeys = await db.keys();
     * const userKeys = await db.keys("user");
     */
    public async keys<P extends AutocompletableString<ObjectPath<V>>>(key?: P): Promise<ObjectPath<P>[]> {
        if (!key) return TypedObject.keys(await this.all()) as ObjectPath<P>[];
        const data = await this.get(key) as Record<string, any>;
        return TypedObject.keys(data).filter((key) => data[key] !== undefined && data[key] !== null) as any
    }
    /**
     * Lấy số lượng key cấp cao nhất trong database.
     *
     * @returns Tổng số key ở root level.
     *
     * @example
     * const count = await db.size();
     */
    public async size(): Promise<number> {
        const keys = await this.keys();
        return keys.length;
    }
    /**
     * Lấy danh sách các giá trị từ database.
     *
     * Nếu không truyền `key` → trả về toàn bộ values ở root level.
     * Nếu truyền `key` → trả về values của object tại path đó.
     *
     * @typeParam P - Path của object trong database.
     *
     * @param key - Đường dẫn object cần lấy values.
     *
     * @returns Mảng các giá trị.
     *
     * @example
     * const allValues = await db.values();
     *
     * const userValues = await db.values("users");
     */
    public async values<P extends AutocompletableString<ObjectPath<V>>>(key?: P): Promise<ObjectValue<V, P>[]> {
        if (!key) return TypedObject.values(await this.all());
        const data = await this.get(key) as Record<string, any>;
        return TypedObject.values(data) as ObjectValue<V, P>[];
    }
    /**
     * Lấy ngẫu nhiên một phần tử từ array tại path được chỉ định.
     *
     * @typeParam P - Path trỏ đến array trong database.
     *
     * @param key - Đường dẫn đến array.
     *
     * @returns Một phần tử ngẫu nhiên trong array hoặc `null` nếu array rỗng.
     *
     * @throws BlackCatError
     * - INVALID_TARGET nếu giá trị tại key không phải array
     *
     * @example
     * const randomUser = await db.random("users");
     */
    public async random<P extends AutocompletableString<ObjectPath<V>>>(key: AutocompletableString<P>): Promise<Maybe<ObjectValue<V, P>>> {
        const array = await this.get(key);
        if (!Array.isArray(array)) {
            throw new BlackCatError("INVALID_TARGET", "array", typeOf(array));
        }
        return array[Math.floor(Math.random() * array.length)] ?? null;
    }
    /**
     * Tìm phần tử đầu tiên thỏa điều kiện.
     *
     * Hoạt động tương tự `Array.prototype.find`.
     *
     * @param queryFunction - Hàm kiểm tra điều kiện.
     *
     * @returns Phần tử đầu tiên thỏa điều kiện hoặc `null` nếu không tìm thấy.
     *
     * @example
     * const user = await db.find(u => u.id === 1);
     */
    public async find(queryFunction: QueryFunction<V>): Promise<Maybe<V>> {
        const values = await this.values();
        return values.find(queryFunction as QueryFunction<ObjectValue<V, any>>) as Promise<Maybe<V>> ?? null;
    }
    /**
     * Biến đổi tất cả giá trị trong database thành một mảng mới.
     *
     * Hoạt động giống `Array.prototype.map`.
     *
     * @typeParam TReturnType - Kiểu dữ liệu của phần tử trả về.
     *
     * @param queryFunction - Hàm transform từng phần tử.
     *
     * @returns Mảng kết quả sau khi transform.
     *
     * @example
     * const names = await db.map(user => user.name);
     */
    public async map<TReturnType>(queryFunction: QueryFunction<V, TReturnType>): Promise<TReturnType[]> {
        const values = await this.values();
        return values.map(queryFunction as QueryFunction<ObjectValue<V, any>, TReturnType>);
    }
    /**
     * Tìm index của phần tử đầu tiên thỏa điều kiện.
     *
     * Hoạt động giống `Array.prototype.findIndex`.
     *
     * @param queryFunction - Hàm kiểm tra điều kiện.
     *
     * @returns Index của phần tử hoặc `-1` nếu không tìm thấy.
     *
     * @example
     * const index = await db.findIndex(user => user.id === 1);
     */
    public async findIndex(queryFunction: QueryFunction<V>): Promise<number> {
        const values = await this.values();
        return values.findIndex(queryFunction as QueryFunction<ObjectValue<V, any>>);
    }
    /**
     * Lọc các phần tử thỏa điều kiện.
     *
     * Hoạt động giống `Array.prototype.filter`.
     *
     * @param queryFunction - Hàm kiểm tra điều kiện.
     *
     * @returns Mảng các phần tử thỏa điều kiện.
     *
     * @example
     * const admins = await db.filter(user => user.role === "admin");
     */
    public async filter(queryFunction: QueryFunction<V>): Promise<V[]> {
        const values = await this.values();
        return values.filter(queryFunction as QueryFunction<ObjectValue<V, any>>) as any;
    }
    /**
     * Kiểm tra có ít nhất một phần tử thỏa điều kiện hay không.
     *
     * Hoạt động giống `Array.prototype.some`.
     *
     * @param queryFunction - Hàm kiểm tra điều kiện.
     *
     * @returns `true` nếu tồn tại phần tử thỏa điều kiện.
     *
     * @example
     * const hasAdmin = await db.some(user => user.role === "admin");
     */
    public async some(queryFunction: QueryFunction<V>): Promise<boolean> {
        const values = await this.values();
        return values.some(queryFunction as QueryFunction<ObjectValue<V, any>>);
    }
    /**
     * Kiểm tra tất cả phần tử có thỏa điều kiện hay không.
     *
     * Hoạt động giống `Array.prototype.every`.
     *
     * @param queryFunction - Hàm kiểm tra điều kiện.
     *
     * @returns `true` nếu tất cả phần tử đều thỏa điều kiện.
     *
     * @example
     * const allActive = await db.every(user => user.active === true);
     */
    public async every(queryFunction: QueryFunction<V>): Promise<boolean> {
        const values = await this.values();
        return values.every(queryFunction as QueryFunction<ObjectValue<V, any>>);
    }
}