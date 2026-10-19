import type { Database } from "./Database";
import type { AutocompletableString, ObjectPath, SetOptions, Query, FindOptions, UniqueBy } from "./types";

/**
 * Database con có tiền tố key cố định, tạo bằng {@link Database.scope}.
 *
 * Mọi key bạn truyền vào sẽ tự được ghép sau tiền tố, và dùng chung hàng đợi,
 * driver và cấu hình với database cha.
 *
 * @template S Kiểu dữ liệu của phần dữ liệu nằm dưới tiền tố.
 *
 * @example
 * ```ts
 * const guild = db.scope<GuildData>("guilds.123");
 * await guild.set("prefix", "!");
 * await guild.add("members.456.xp", 10);
 * ```
 */
export class ScopedDatabase<S = any> {
    constructor(private readonly db: Database<any>, public readonly prefix: string) { }
    private k(key?: string): string {
        return key ? `${this.prefix}${this.db.delimiter}${key}` : this.prefix;
    }
    /** 
     * Tạo scope con. 
     */
    public scope<T = any>(prefix: string): ScopedDatabase<T> {
        return new ScopedDatabase<T>(this.db, this.k(prefix));
    }
    /** 
     * Lấy giá trị (không truyền key = toàn bộ dữ liệu của scope). 
     */
    public get<P extends AutocompletableString<ObjectPath<S>>>(key?: AutocompletableString<P>): Promise<any> {
        return this.db.get(this.k(key) as any);
    }
    /** 
     * Kiểm tra key tồn tại. 
     */
    public has<P extends AutocompletableString<ObjectPath<S>>>(key?: AutocompletableString<P>): Promise<boolean> {
        return this.db.has(this.k(key) as any);
    }
    /** 
     * Gán giá trị. 
     */
    public set<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, value: any, options?: SetOptions): Promise<void> {
        return this.db.set(this.k(key) as any, value, options);
    }
    /** 
     * Lấy giá trị hoặc gán mặc định. 
     */
    public ensure<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, defaultValue: any): Promise<any> {
        return this.db.ensure(this.k(key) as any, defaultValue);
    }
    /** 
     * Cập nhật giá trị. 
     */
    public update<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, value: any, options?: { uniqueBy?: UniqueBy }): Promise<any> {
        return this.db.update(this.k(key) as any, value, options);
    }
    /** 
     * Xóa key. 
     */
    public delete<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>): Promise<boolean> {
        return this.db.delete(this.k(key) as any);
    }
    /** 
     * Làm rỗng scope (hoặc một key trong scope). 
     */
    public clear<P extends AutocompletableString<ObjectPath<S>>>(key?: AutocompletableString<P>): Promise<number> {
        return this.db.clear(this.k(key) as any);
    }
    /** 
     * Cộng số. 
     */
    public add<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, amount: number): Promise<number> {
        return this.db.add(this.k(key) as any, amount);
    }
    /** 
     * Trừ số
     */
    public subtract<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, amount: number): Promise<number> {
        return this.db.subtract(this.k(key) as any, amount);
    }
    /** 
     * Cộng/trừ có giới hạn. 
     */
    public increment<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, amount: number, limits?: { min?: number; max?: number }): Promise<number> {
        return this.db.increment(this.k(key) as any, amount, limits);
    }
    /** 
     * Thêm vào cuối mảng. 
     */
    public push<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, ...values: any[]): Promise<any[]> {
        return (this.db as any).push(this.k(key), ...values);
    }
    /** 
     * Thêm vào đầu mảng. 
     */
    public unshift<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, ...values: any[]): Promise<any[]> {
        return (this.db as any).unshift(this.k(key), ...values);
    }
    /** 
     * Thay phần tử theo index. 
     */
    public pull<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, index: number, value: any): Promise<any[]> {
        return this.db.pull(this.k(key) as any, index, value);
    }
    /** 
     * Xóa phần tử theo index. 
     */
    public pop<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, ...indexes: any[]): Promise<any[]> {
        return (this.db as any).pop(this.k(key), ...indexes);
    }
    /** 
     * Lấy phần tử ngẫu nhiên. 
     */
    public random<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>): Promise<any> {
        return this.db.random(this.k(key) as any);
    }
    /** 
     * Tìm một bản ghi. 
     */
    public findOne<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, query?: Query<any>): Promise<any> {
        return this.db.findOne(this.k(key) as any, query as any);
    }
    /**
     * Tìm nhiều bản ghi. 
     */
    public findMany<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, query?: Query<any>, options?: FindOptions<any>): Promise<any[]> {
        return this.db.findMany(this.k(key) as any, query as any, options as any);
    }
    /** 
     * Đếm. 
     */
    public count<P extends AutocompletableString<ObjectPath<S>>>(key?: AutocompletableString<P>, query?: Query<any>): Promise<number> {
        return this.db.count(this.k(key) as any, query as any);
    }
    /** 
     * Xóa nhiều bản ghi khớp điều kiện. 
     */
    public deleteMany<P extends AutocompletableString<ObjectPath<S>>>(key: AutocompletableString<P>, query: Query<any>): Promise<number> {
        return this.db.deleteMany(this.k(key) as any, query as any);
    }
    /** 
     * Key của scope (hoặc của một nhánh trong scope). 
     */
    public keys(key?: string): Promise<string[]> {
        return this.db.keys(this.k(key) as any) as Promise<string[]>;
    }
    /** 
     * Giá trị của scope (hoặc của một nhánh). 
     */
    public values(key?: string): Promise<any[]> {
        return this.db.values(this.k(key) as any);
    }
    /** 
     * Entry của scope (hoặc của một nhánh). 
     */
    public entries(key?: string): Promise<[string, any][]> {
        return this.db.entries(this.k(key) as any);
    }
}
