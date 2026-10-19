# 🐈‍⬛ blackcat.js-database

![npm version](https://img.shields.io/npm/v/blackcat.js-database)
![npm downloads](https://img.shields.io/npm/dm/blackcat.js-database)
![license](https://img.shields.io/npm/l/blackcat.js-database)
![typescript](https://img.shields.io/badge/types-TypeScript-blue)

> Một **database nhẹ, typed và có autocomplete path cho TypeScript**, viết cho bot Discord.
> Lưu và truy vấn dữ liệu bằng **dot notation** (`guilds.123.members.456.xp`), chạy trên nhiều storage
> (JSON, Memory, SQLite, MongoDB) qua hệ thống **driver**.

> Lưu ý: chỉ chạy cho server vừa và nhỏ, bot discord, ...

> [Xem tài liệu API ở đây.](https://blackcat-js-database.vercel.app)

---

# Mục lục

- [Tính năng](#tính-năng)
- [Cài đặt](#cài-đặt)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Cấu hình Database](#cấu-hình-database)
- [TypeScript Schema và autocomplete](#typescript-schema-và-autocomplete)
- [API](#api)
  - [Đọc](#đọc)
  - [Ghi](#ghi)
  - [Xóa](#xóa)
  - [Number](#number)
  - [Array](#array)
  - [Query](#query)
  - [Keys, values, entries](#keys-values-entries)
  - [Scope](#scope)
  - [Transaction](#transaction)
  - [TTL (key tự hết hạn)](#ttl-key-tự-hết-hạn)
  - [Sự kiện](#sự-kiện)
  - [Import, export, backup, migrate](#import-export-backup-migrate)
  - [Vòng đời: init, flush, close](#vòng-đời-init-flush-close)
- [Drivers](#drivers)
  - [JSONDriver](#jsondriver)
  - [MemoryDriver](#memorydriver)
  - [SQLiteDriver](#sqlitedriver)
  - [MongoDriver](#mongodriver)
  - [CachedDriver](#cacheddriver)
  - [EncryptedDriver và CompressedDriver](#encrypteddriver-và-compresseddriver)
  - [MirrorDriver](#mirrordriver)
  - [Tạo Custom Driver](#tạo-custom-driver)
- [Xử lý lỗi](#xử-lý-lỗi)
- [Hiệu năng và độ an toàn](#hiệu-năng-và-độ-an-toàn)
- [Nâng cấp từ 1.0.x](#nâng-cấp-từ-10x)
- [Phát triển và test](#phát-triển-và-test)
- [License](#license)

---

# Tính năng

* Autocomplete path trong IDE (`user.profile.name`), type-safe với TypeScript
* Nested object và mảng (`users.0.coins`)
* API quen thuộc: `get`, `set`, `update`, `delete`, `add`, `push`, `find`, `filter`, `map`...
* **Hàng đợi tuần tự**: gọi song song `add()`/`push()`... không mất dữ liệu
* Mỗi thao tác ghi chỉ **đọc 1 lần + ghi 1 lần** xuống driver
* Driver: `JSON`, `Memory`, `SQLite`, `MongoDB` và các driver bọc `Cached`, `Encrypted`, `Compressed`, `Mirror`
* Query nâng cao: toán tử `$gt`, `$in`..., `findMany`, `count`, `paginate`, `updateMany`
* `scope`, `transaction`, `setMany`/`getMany`, `increment`, TTL theo key
* Sự kiện, validator, giá trị mặc định, backup tự động, migrate giữa các driver
* An toàn: ghi file atomic, cách ly file JSON hỏng, chặn prototype pollution

---

# Cài đặt

```bash
npm install blackcat.js-database
```

`better-sqlite3` và `mongodb` là **optional peer dependency**, chỉ cài khi bạn dùng driver tương ứng:

```bash
npm install better-sqlite3   # nếu dùng SQLiteDriver
npm install mongodb          # nếu dùng MongoDriver
```

Yêu cầu: Node.js >= 18.

Có thể import driver từ subpath để không phải nạp phần còn lại:

```ts
import { SQLiteDriver } from "blackcat.js-database/sqlite";
import { MongoDriver } from "blackcat.js-database/mongo";
```

---

# Bắt đầu nhanh

```ts
import { Database, JSONDriver } from "blackcat.js-database";

const db = new Database({
  driver: new JSONDriver({ filePath: "./database.json" })
});

await db.set("users", []);
await db.push("users", { id: 1, name: "Alice", coins: 100 });
await db.add("users.0.coins", 50);

console.log(await db.get("users.0")); // { id: 1, name: "Alice", coins: 150 }

await db.close(); // nên gọi khi tắt ứng dụng
```

---

# Cấu hình Database

```ts
const db = new Database({
  driver,                       // bắt buộc
  delimiter: ".",               // ký tự phân tách key path
  debug: false,                 // log thời gian + số lần đọc/ghi của từng thao tác
  cloneOnRead: false,           // trả về bản sao sâu thay vì tham chiếu
  autoCreateArrays: false,      // push/unshift tự tạo mảng nếu key chưa có
  defaults: { settings: { prefix: "!" } },
  validator: ({ key, value, operation }) => true,
  uniqueBy: ["id"],             // cách loại trùng mặc định khi update nối mảng
  ttlKey: "__blackcat_ttl__",   // key nội bộ lưu hạn TTL
  ttlSweepInterval: 60_000,     // chu kỳ quét key hết hạn (0 = tắt quét nền)
  autoBackup: { dir: "./backups", every: 3_600_000, keep: 5 }
});
```

| Option | Mặc định | Mô tả |
|---|---|---|
| `driver` | bắt buộc | Storage driver. |
| `delimiter` | `"."` | Ký tự phân tách key path. |
| `debug` | `false` | In `[blackcat.js-database] set "a.b" - 1.2ms (read: 1, write: 1)` cho mỗi thao tác. |
| `cloneOnRead` | `false` | Giá trị trả về là bản sao sâu, sửa kết quả không ảnh hưởng dữ liệu bên trong (quan trọng với `MemoryDriver`/`CachedDriver`). |
| `autoCreateArrays` | `false` | `push`/`unshift` tự tạo `[]` khi key chưa tồn tại thay vì ném `INVALID_KEY`. |
| `defaults` | không | Ở lần dùng đầu tiên, các key còn thiếu được điền vào database (đệ quy với object). |
| `validator` | không | Chạy trước `set`, `update`, `ensure`, `setMany`. Trả `false` hoặc một chuỗi (lý do) để từ chối. |
| `uniqueBy` | `username` + `guild` | Cách coi hai phần tử mảng là trùng khi `update` nối mảng. |
| `ttlKey` | `"__blackcat_ttl__"` | Key cấp cao nhất dùng lưu hạn TTL (ẩn khỏi `all()`, `keys()`, `size()`...). |
| `ttlSweepInterval` | `60000` | Chu kỳ quét nền. Key hết hạn vẫn bị xóa khi truy cập dù tắt quét. |
| `autoBackup` | không | Sao lưu định kỳ ra file JSON. |

---

# TypeScript Schema và autocomplete

```ts
type Schema = {
  users: {
    id: number;
    name: string;
    coins: number;
  }[];
  settings: {
    prefix: string;
  };
};

const db = new Database<Schema>({
  driver: new JSONDriver({ filePath: "./database.json" })
});
```

IDE sẽ gợi ý:

```
"users"
"users.0.id"
"settings.prefix"
```

Kiểu của giá trị được suy ra từ path (`db.get("settings.prefix")` là `string | null`).
Độ sâu gợi ý tối đa là 8 cấp để tránh làm chậm trình biên dịch.

---

# API

Mọi method đều trả về `Promise`. Key path được tách bằng `delimiter` (mặc định `.`).
Segment `__proto__`, `constructor`, `prototype` bị chặn (xem [Xử lý lỗi](#xử-lý-lỗi)).

## Đọc

```ts
await db.all();                     // toàn bộ dữ liệu
await db.get();                     // giống all()
await db.get("user.profile.name");  // giá trị, hoặc null nếu không tồn tại
await db.has("user.profile");       // true/false (giá trị khác null/undefined)
await db.getMany(["a.b", "x.y"]);   // nhiều key trong một lần đọc, theo thứ tự (thiếu = null)
await db.isTargetArray("users");
await db.isTargetNumber("user.coins");
```

Với driver có đường nhanh (SQLite, Mongo), `get`/`has` chỉ đọc đúng giá trị cần thiết.

## Ghi

```ts
await db.set("user.profile.name", "Vinh");   // tự tạo object trung gian

await db.setMany({ "a.b": 1, "a.c": 2 });    // một lần đọc + một lần ghi
await db.setMany([["x", 1], ["y", 2]]);

// Lấy giá trị, nếu chưa có thì gán mặc định rồi trả về
const settings = await db.ensure("guild.123", { prefix: "!" });
```

### update

`update` kết hợp theo kiểu dữ liệu:

* object + object: merge nông
* mảng + mảng: nối thêm các phần tử chưa có
* còn lại: ghi đè

```ts
await db.update("user.profile", { age: 25 });

await db.update("members", [{ id: 1 }, { id: 2 }], { uniqueBy: ["id"] });
await db.update("tags", ["a", "b"]); // phần tử nguyên thủy so sánh theo giá trị
```

`uniqueBy` là danh sách field hoặc hàm `(item) => khóa`. Nếu không đặt, object có `username`/`guild` được so sánh theo hai field này, các phần tử khác so sánh theo nội dung.

### syncDatabase

Chỉ ghi khi dữ liệu thực sự thay đổi, trả về các field đã đổi:

```ts
await db.syncDatabase({
  keys: "user.1",
  value: { name: "Alice", age: 20, tags: ["a"] },
  deep: true,                              // so sánh sâu từng field (mặc định: Object.is)
  compare: (oldData, newData) => false     // trả true để bỏ qua cập nhật
});
```

## Xóa

```ts
await db.delete("user.profile.name");        // true nếu đã xóa, false nếu không tồn tại
await db.deleteKeys(["a.b", "x"]);           // nhiều key, trả về số key đã xóa
await db.clear("user.items");                // làm rỗng object/mảng nhưng giữ lại key, trả về số phần tử đã xóa
await db.deleteAll();                        // xóa toàn bộ database
await db.deleteMany("users", { coins: { $lt: 1 } }); // xóa phần tử mảng khớp điều kiện
```

`delete("list.1")` trên mảng xóa phần tử bằng `splice` (không để lại "lỗ").

## Number

```ts
await db.add("user.coins", 10);        // key chưa có được coi là 0, trả về giá trị mới
await db.subtract("user.coins", 5);
await db.increment("user.hp", -30, { min: 0, max: 100 }); // kẹp trong khoảng cho phép
```

Tham số dạng chuỗi số (`"5"`) được ép thành số.

## Array

```ts
await db.push("users", { id: 1 });                // thêm cuối, bỏ qua giá trị đã có
await db.push("numbers", 1, 2, 3);
await db.unshift("numbers", 0);                   // thêm đầu

await db.pull("users", 0, { id: 2 });             // THAY phần tử tại index (hỗ trợ index âm)
await db.replaceAt("users", -1, { id: 3 });       // bí danh rõ nghĩa của pull

await db.pop("users", 0);                         // xóa theo index
await db.pop("users", [0, 2, -1]);                // nhiều index (loại trùng, hỗ trợ index âm)

await db.random("users");                         // phần tử ngẫu nhiên (null nếu mảng rỗng)
```

Lưu ý:

* `push`/`unshift` loại trùng theo `Set` (nguyên thủy so theo giá trị, object so theo tham chiếu) và không ghi nếu không thêm gì.
* `pull` ném `INDEX_OUT_OF_BOUNDS` nếu index nằm ngoài mảng.
* `pop` với key không tồn tại trả về `[]` và không tạo key mới.
* `push`/`unshift` ném `INVALID_KEY` nếu key chưa tồn tại, trừ khi bật `autoCreateArrays`.

## Query

### Truy vấn theo điều kiện trên mảng

```ts
await db.findOne("users", { id: 1 });
await db.findOne("users", { coins: { $gte: 100 } });

await db.findMany("users", { banned: false }, {
  sort: { coins: -1 },   // hoặc hàm so sánh (a, b) => number
  skip: 0,
  limit: 10
});

await db.count("users", { coins: { $gt: 0 } });     // số phần tử khớp
await db.count("settings");                         // số key của object

const page = await db.paginate("users", {
  page: 2,
  pageSize: 10,
  query: { banned: false },
  sort: { coins: -1 }
});
// { items, page, pageSize, total, totalPages, hasNext, hasPrev }

await db.updateMany("users", { banned: false }, { warned: true }); // trả về số phần tử đã cập nhật
await db.deleteMany("users", { coins: { $lt: 1 } });               // trả về số phần tử đã xóa
```

Mặc định mỗi field so sánh bằng `==`. Có thể dùng toán tử:

| Toán tử | Ý nghĩa |
|---|---|
| `$eq`, `$ne` | bằng, khác |
| `$gt`, `$gte`, `$lt`, `$lte` | so sánh (hỗ trợ `Date`) |
| `$in`, `$nin` | nằm trong, không nằm trong danh sách |
| `$exists` | field có tồn tại hay không |
| `$regex` | khớp biểu thức chính quy (chỉ với chuỗi) |

### find, filter, map, findIndex, some, every

Mỗi method chạy trên **giá trị cấp cao nhất**, hoặc trên mảng/object tại `key` nếu truyền thêm key:

```ts
await db.find((guild) => guild.premium);
await db.filter("users", (user) => user.coins > 0);
await db.map("users", (user) => user.name);
await db.findIndex("users", (user) => user.id === 1);
await db.some("users", (user) => user.coins === 0);
await db.every("users", (user) => user.coins >= 0);
```

Hàm callback nhận `(item, index, values)`.

## Keys, values, entries

```ts
await db.keys();                 // key cấp cao nhất
await db.keys("users");          // mặc định bỏ qua giá trị null/undefined khi có key
await db.values("settings");
await db.entries("settings");    // [[key, value], ...]
await db.toMap("settings");      // Map
await db.size();                 // số key cấp cao nhất

// bỏ/giữ giá trị rỗng
await db.keys("users", { skipNullish: false });

// Duyệt từng key cấp cao nhất
for await (const [guildId, data] of db) { /* ... */ }
```

## Scope

`scope` tạo một database con có **tiền tố key cố định**, dùng chung hàng đợi, driver và cấu hình:

```ts
const guild = db.scope("guilds.123");

await guild.set("prefix", "!");              // = db.set("guilds.123.prefix", "!")
await guild.add("members.456.xp", 10);
await guild.get("members.456");
await guild.push("logs", "Đã tham gia");

const member = guild.scope("members.456");   // scope lồng nhau
await member.get("xp");
```

Scope hỗ trợ: `get`, `has`, `set`, `ensure`, `update`, `delete`, `clear`, `add`, `subtract`, `increment`, `push`, `unshift`, `pull`, `pop`, `random`, `findOne`, `findMany`, `count`, `deleteMany`, `keys`, `values`, `entries`.

## Transaction

Chạy nhiều thao tác **nguyên tử**: đọc một lần, ghi một lần, nếu hàm ném lỗi thì **không ghi gì**:

```ts
await db.transaction((tx) => {
  tx.subtract("user.1.coins", 100);
  tx.add("user.2.coins", 100);
});
```

Trong `tx` các thao tác chạy **đồng bộ**: `get`, `has`, `set`, `ensure`, `update`, `delete`, `add`, `subtract`, `push`.
Trong transaction không có TTL.

## TTL (key tự hết hạn)

```ts
await db.set("cooldown.123", Date.now(), { ttl: 60_000 }); // hết hạn sau 60 giây
```

* Hạn được lưu cùng database nên **vẫn còn hiệu lực sau khi khởi động lại**.
* Key hết hạn bị xóa khi truy cập hoặc bởi bộ quét nền (`ttlSweepInterval`), và phát sự kiện `expire`.
* Ghi lại key bằng `set` không kèm `ttl` sẽ bỏ hạn.
* Khi có key TTL, đường nhanh `getPath` bị tắt để đảm bảo kiểm tra hạn.

## Sự kiện

```ts
db.on("set", ({ key, value }) => console.log("set", key, value));
db.on("delete", ({ key }) => console.log("delete", key));
db.on("expire", ({ key }) => console.log(`${key} đã hết hạn`));
db.on("error", (error) => console.error(error));
db.on("change", ({ operation, key }) => {}); // mọi thay đổi (kể cả add, push, pop...)
db.once("clear", () => {});
db.off("set", listener);
```

| Sự kiện | Khi nào |
|---|---|
| `change` | Mọi thao tác làm thay đổi dữ liệu (`operation` cho biết thao tác nào). |
| `set`, `update`, `delete`, `clear` | Thao tác tương ứng. |
| `expire` | Key hết hạn TTL bị xóa. |
| `error` | Thao tác thất bại (chỉ phát nếu có listener). |

Lỗi trong listener không làm hỏng thao tác database.

Đếm số lần đọc/ghi để đo hiệu quả:

```ts
console.log(db.stats); // { reads, writes, queued }
```

## Import, export, backup, migrate

```ts
const json = await db.export();                        // chuỗi JSON
await db.import(json);                                 // thay toàn bộ
await db.import({ b: 2 }, { merge: true });            // gộp theo key cấp cao nhất

const file = await db.backup({ dir: "./backups", keep: 10 }); // trả về đường dẫn file

// Chuyển dữ liệu giữa hai driver (ví dụ JSON → SQLite)
const moved = await Database.migrate(
  new JSONDriver({ filePath: "./old.json" }),
  new SQLiteDriver({ filePath: "./new.sqlite" }),
  { overwrite: false } // driver đích đã có dữ liệu thì cần overwrite: true
);
```

## Vòng đời: init, flush, close

```ts
await db.init();   // không bắt buộc: database tự khởi tạo ở lần dùng đầu tiên
await db.flush();  // ghi dữ liệu đang chờ (với driver có cache)
await db.close();  // dừng timer, flush, đóng driver. Nên gọi khi tắt ứng dụng.
```

---

# Drivers

`Database` chỉ xử lý logic (key path, validate, query...). Driver chỉ chịu trách nhiệm **đọc và ghi toàn bộ dữ liệu** xuống storage.

| Driver | Lưu ở | Ghi chú |
|---|---|---|
| `JSONDriver` | file `.json` | Ghi atomic, tự cách ly file hỏng. |
| `MemoryDriver` | RAM | Mất khi tắt process. |
| `SQLiteDriver` | file SQLite | Cần `better-sqlite3`. Có đường nhanh theo path. |
| `MongoDriver` | MongoDB | Cần `mongodb`. Có đường nhanh theo path. |
| `CachedDriver` | bọc driver khác | Cache RAM + ghi trễ. |
| `EncryptedDriver` | bọc driver khác | Mã hóa AES-256-GCM. |
| `CompressedDriver` | bọc driver khác | Nén gzip. |
| `MirrorDriver` | bọc nhiều driver | Ghi đồng thời để có bản sao dự phòng. |

## JSONDriver

```ts
import { Database, JSONDriver } from "blackcat.js-database";

const db = new Database({
  driver: new JSONDriver({
    filePath: "./database.json",
    minifyJSON: false,   // true: không format
    indent: "\t",        // thụt lề khi minifyJSON tắt
    backup: false,       // true: giữ bản .bak và tự khôi phục khi file hỏng
    fsync: false,        // true: fsync trước khi đổi tên (an toàn hơn khi mất điện, chậm hơn)
    onError: (error, { filePath, quarantinePath }) => {}
  })
});
```

* Thư mục và file được tự tạo nếu chưa có.
* Ghi **atomic** (ghi file tạm rồi đổi tên), process bị kill giữa chừng không làm hỏng file.
* File JSON hỏng được **đổi tên** thành `<file>.corrupt-<timestamp>` (hoặc khôi phục từ `.bak` nếu bật `backup`), driver ghi `console.error` và tiếp tục với database rỗng. Dữ liệu cũ không bị ghi đè.
* Lỗi I/O khác (quyền truy cập, ổ đĩa...) được ném ra.

## MemoryDriver

```ts
import { Database, MemoryDriver } from "blackcat.js-database";

const db = new Database({
  driver: new MemoryDriver({ users: [] }) // dữ liệu ban đầu (tùy chọn)
});
```

`MemoryDriver` trả về **tham chiếu** tới dữ liệu bên trong. Bật `cloneOnRead: true` ở `Database` nếu bạn không muốn sửa kết quả làm thay đổi dữ liệu.

## SQLiteDriver

```bash
npm install better-sqlite3
```

```ts
import { Database } from "blackcat.js-database";
import { SQLiteDriver } from "blackcat.js-database/sqlite"; // hoặc từ "blackcat.js-database"

const db = new Database({
  driver: new SQLiteDriver({
    filePath: "./database.sqlite",
    table: "json_store",       // chỉ chữ cái, chữ số, gạch dưới
    wal: true,                 // chế độ WAL (mặc định bật)
    synchronous: "NORMAL"      // "OFF" | "NORMAL" | "FULL"
  })
});
```

* Toàn bộ database nằm trong một row. `get`/`set` theo key dùng `json_extract`/`json_set` nên không phải đọc/ghi cả database.
* Việc mở file diễn ra ở thao tác đầu tiên hoặc `await driver.init()`.
* `await db.close()` đóng kết nối.

## MongoDriver

```bash
npm install mongodb
```

```ts
import { Database } from "blackcat.js-database";
import { MongoDriver } from "blackcat.js-database/mongo"; // hoặc từ "blackcat.js-database"

const db = new Database({
  driver: new MongoDriver({
    mongourl: "mongodb://localhost:27017",
    databaseName: "mybot",
    collectionName: "json_store",
    onLoad: ({ databaseName }) => console.log("Đã kết nối", databaseName),
    onError: ({ error }) => console.error(error)
  })
});
```

* Toàn bộ database nằm trong **một document** (`_id: "database"`), nên giới hạn 16 MB của MongoDB áp dụng.
* Kết nối chỉ tạo **một lần** dù có nhiều lời gọi song song.
* `get`/`set` theo key dùng projection và `$set`, không đọc/ghi cả document.

## CachedDriver

Bọc **bất kỳ driver nào** bằng cache RAM và ghi trễ (write-behind):

```ts
import { Database, JSONDriver, CachedDriver } from "blackcat.js-database";

const db = new Database({
  driver: new CachedDriver(new JSONDriver({ filePath: "./database.json" }), {
    flushDelay: 500,    // debounce (ms)
    maxWait: 5000,      // tối đa chờ trước khi buộc ghi (ms)
    ttl: 0,             // cache hết hạn sau ms (0 = không bao giờ)
    retry: 3,           // số lần thử lại khi ghi lỗi
    retryDelay: 500,
    flushOnExit: true,  // tự flush khi beforeExit, SIGINT, SIGTERM
    onError: (error) => console.error(error)
  })
});

await db.close(); // flush và đóng
```

* `all()` đọc từ RAM, `set()` chỉ đánh dấu "bẩn" rồi ghi xuống driver thật theo lịch.
* Ghi thất bại sẽ được thử lại, dữ liệu vẫn nằm trong cache.
* Nếu process bị kill đột ngột (SIGKILL, mất điện), dữ liệu chưa flush sẽ mất. Hãy gọi `await db.close()` khi tắt chủ động.

## EncryptedDriver và CompressedDriver

```ts
import { EncryptedDriver, CompressedDriver, JSONDriver } from "blackcat.js-database";

const driver = new EncryptedDriver({
  key: process.env.DB_KEY!,   // chuỗi bất kỳ hoặc Buffer 32 byte
  driver: new CompressedDriver({
    level: 6,                 // mức nén gzip 0-9
    driver: new JSONDriver({ filePath: "./data.json" })
  })
});
```

* `EncryptedDriver` dùng **AES-256-GCM**. Sai khóa hoặc dữ liệu bị sửa sẽ ném `DECRYPT_FAILED`.
* Dữ liệu cũ chưa mã hóa/chưa nén vẫn đọc được, lần ghi tiếp theo sẽ được mã hóa/nén.
* Khi kết hợp: đặt `EncryptedDriver` **bên ngoài** `CompressedDriver` (nén rồi mới mã hóa).
* Mất khóa nghĩa là mất dữ liệu.

## MirrorDriver

```ts
import { MirrorDriver, JSONDriver, SQLiteDriver } from "blackcat.js-database";

const driver = new MirrorDriver({
  primary: new JSONDriver({ filePath: "./database.json" }),
  mirrors: [new SQLiteDriver({ filePath: "./backup.sqlite" })],
  onError: (error, mirror, operation) => console.warn(operation, error),
  strict: false   // true: lỗi ở driver phụ cũng được ném ra
});
```

Đọc từ `primary`, ghi vào `primary` rồi vào các `mirrors`.

## Tạo Custom Driver

Chỉ cần ba method bắt buộc:

```ts
import type { DatabaseDriver } from "blackcat.js-database";

class MyDriver implements DatabaseDriver {
  async all<T = any>(): Promise<T> { /* trả về toàn bộ dữ liệu */ }
  async set<T = any>(data: T): Promise<T> { /* ghi toàn bộ dữ liệu */ }
  async delete(): Promise<boolean> { /* reset về {} */ }
}
```

Các method **tùy chọn** để tối ưu:

| Method | Mục đích |
|---|---|
| `init()` | Mở kết nối, tạo file/bảng. `Database` gọi một lần trước thao tác đầu tiên. |
| `flush()` | Ghi dữ liệu đang chờ (driver có cache). |
| `close()` | Giải phóng tài nguyên. |
| `getPath(parts)` | Đọc một giá trị theo path mà không đọc cả database. Trả `{ found: true, value }`, `{ found: false }`, hoặc `undefined` nếu không hỗ trợ (Database tự quay về đọc toàn bộ). |
| `setPath(parts, value)` | Ghi một giá trị theo path. Trả `true` nếu đã ghi, `false` để Database quay về cách cũ. |

Lưu ý khi viết driver:

* Nên `JSON.stringify` dữ liệu **ngay đầu** `set()` (đồng bộ) trước khi `await`, vì object có thể bị thay đổi bởi thao tác khác.
* `Database` đã tuần tự hóa mọi thao tác, driver không cần tự khóa cho các lời gọi từ `Database`.

---

# Xử lý lỗi

Mọi lỗi của thư viện là `BlackCatError` với thuộc tính `code`:

```ts
import { BlackCatError } from "blackcat.js-database";

try {
  await db.push("users", 1);
} catch (error) {
  if (error instanceof BlackCatError && error.code === "INVALID_TARGET") {
    // ...
  }
}
```

| `code` | Ý nghĩa |
|---|---|
| `REQUIRED_PARAMETER_MISSING` | Thiếu tham số bắt buộc. |
| `INVALID_TYPE` | Tham số sai kiểu. |
| `ONE_OR_MORE_ARRAY_TYPES_INVALID` | Mảng tham số chứa phần tử sai kiểu. |
| `INVALID_TARGET` | Giá trị đang lưu không phải kiểu cần thiết (ví dụ `push` vào giá trị không phải mảng). |
| `INVALID_KEY` | Path không tồn tại (với `push`, `unshift`, `pull`). |
| `UNSAFE_KEY` | Key chứa `__proto__`, `constructor` hoặc `prototype`. |
| `INDEX_OUT_OF_BOUNDS` | Index của `pull` nằm ngoài mảng. |
| `VALIDATION_FAILED` | `validator` từ chối giá trị. |
| `INVALID_OPTION` | Tùy chọn không hợp lệ (ví dụ `ttl` không phải số dương, tên bảng SQLite sai). |
| `MODULE_NOT_FOUND` | Chưa cài `better-sqlite3`/`mongodb` nhưng dùng driver tương ứng. |
| `DECRYPT_FAILED` | Sai khóa hoặc dữ liệu mã hóa bị thay đổi. |
| `UNKNOWN_ERROR` | Lỗi không xác định. |

`get`/`has` với key không an toàn trả về `null`/`false` thay vì ném lỗi.

---

# Hiệu năng và độ an toàn

* **Hàng đợi tuần tự:** mọi thao tác xếp hàng nên các lời gọi song song không ghi đè lẫn nhau.
* **Đọc/ghi tối thiểu:** mỗi thao tác ghi đọc 1 lần và ghi 1 lần. `deleteMany`, `push`, `unshift`, `pop` không ghi khi không có gì thay đổi.
* **Đường nhanh theo path:** SQLite (`json_extract`/`json_set`) và Mongo (projection/`$set`) không đọc/ghi toàn bộ database cho `get`/`has`/`set`.
* **Cache:** dùng `CachedDriver` để gom nhiều lần ghi thành một (rất hợp với bot ghi liên tục).
* **File JSON an toàn:** ghi atomic, file hỏng được cách ly thay vì bị ghi đè.
* **Chống prototype pollution:** key chứa `__proto__`, `constructor`, `prototype` bị chặn; `get` chỉ đọc thuộc tính sở hữu.
* **Đo lường:** bật `debug: true` hoặc xem `db.stats` để thấy số lần đọc/ghi thực tế.

---

# Nâng cấp từ 1.0.x

Các thay đổi hành vi cần lưu ý (xem `CHANGELOG.md` để biết đầy đủ):

1. `add`/`subtract` ép tham số chuỗi số thành số (trước đây gây nối chuỗi).
2. `pull` ném `INDEX_OUT_OF_BOUNDS` khi index ngoài phạm vi và hỗ trợ index âm.
3. `pop` loại trùng index, hỗ trợ index âm và không tạo key mới khi key không tồn tại.
4. `update` nối mảng: phần tử không có `username`/`guild` được so sánh theo nội dung; dùng `uniqueBy` để tự chọn.
5. Path đi qua mảng (`users.0.coins`) cho cả `set`/`update`; `delete("list.1")` dùng `splice`.
6. `JSONDriver.all()` ném lỗi I/O thay vì trả `{}`; file JSON hỏng được đổi tên `.corrupt-<time>`.
7. `SQLiteDriver`/`MongoDriver` mở file/kết nối ở thao tác đầu tiên (hoặc `init()`), không phải trong constructor.
8. `better-sqlite3` và `mongodb` là optional peer dependency (cài thêm khi cần); `mongoose` không còn là dependency.

---

# License

ISC
