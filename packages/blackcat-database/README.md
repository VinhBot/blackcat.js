# blackcat.js-database

Một **database nhẹ, typed và hỗ trợ autocomplete path cho TypeScript**.

`blackcat.js-database` cho phép bạn lưu trữ và truy vấn dữ liệu bằng **dot notation** với **type inference mạnh mẽ trong IDE**.

---

# Tính năng

* Autocomplete path trong IDE (`user.profile.name`)
* Type-safe với TypeScript
* Hỗ trợ nested object
* API tương tự `Array`
* Driver system (memory, file, custom storage)
* Query helpers (`find`, `filter`, `map`, ...)
* Hỗ trợ thao tác với number và array

---

# Cài đặt

```bash
npm install blackcat.js-database
```

---

# Khởi tạo Database

```ts
import { Database, MemoryDriver } from "blackcat.js-database";

const db = new Database({
  driver: new MemoryDriver()
});
```

---

# Sử dụng với TypeScript Schema

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
  driver: new MemoryDriver()
});
```

Autocomplete trong IDE:

```
"users"
"users.0.id"
"settings.prefix"
```

---

# Lấy dữ liệu

```ts
await db.get("users");
await db.get("settings.prefix");
```

Lấy toàn bộ database

```ts
await db.get();
```

---

# Kiểm tra key tồn tại

```ts
await db.has("users");
```

---

# Gán giá trị

```ts
await db.set("settings.prefix", "!");
```

---

# Cập nhật giá trị

```ts
await db.update("settings.prefix", "?");
```

---

# Xóa dữ liệu

```ts
await db.delete("settings.prefix");
```

Xóa toàn bộ database

```ts
await db.deleteAll();
```

---

# Number Operations

## Cộng giá trị

```ts
await db.add("users.0.coins", 10);
```

## Trừ giá trị

```ts
await db.subtract("users.0.coins", 5);
```

---

# Array Operations

## Thêm phần tử

```ts
await db.push("users", {
  id: 1,
  name: "Alice",
  coins: 0
});
```

Hoặc

```ts
await db.push("numbers", 1, 2, 3);
```

---

## Thay thế phần tử trong mảng

```ts
await db.pull("users", 0, {
  id: 2,
  name: "Bob",
  coins: 10
});
```

---

## Xóa phần tử

```ts
await db.pop("users", 0);
```

Hoặc

```ts
await db.pop("users", [0, 2]);
```

---

## Lấy phần tử ngẫu nhiên

```ts
await db.random("users");
```

---

# Query API

Database hỗ trợ các method tương tự `Array`.

## find

```ts
const user = await db.find((u) => u.id === 1);
```

---

## filter

```ts
const admins = await db.filter((u) => u.role === "admin");
```

---

## map

```ts
const names = await db.map((u) => u.name);
```

---

## findIndex

```ts
const index = await db.findIndex((u) => u.id === 1);
```

---

## some

```ts
await db.some((u) => u.active === true);
```

---

## every

```ts
await db.every((u) => u.active === true);
```

---

# Utilities

## keys

```ts
await db.keys();
await db.keys("users");
```

---

## values

```ts
await db.values();
await db.values("users");
```

---

## size

```ts
await db.size();
```

---

## Kiểm tra kiểu dữ liệu

```ts
await db.isTargetArray("users");
await db.isTargetNumber("users.0.coins");
```

---

# Driver System

Database sử dụng **driver system** để lưu trữ dữ liệu.

Driver chịu trách nhiệm:

* đọc dữ liệu
* ghi dữ liệu
* xóa dữ liệu

---

# Memory Driver (ví dụ)

Driver lưu dữ liệu trong RAM.

```ts
import { Database, MemoryDriver } from "blackcat.js-database";

const db = new Database({
  driver: new MemoryDriver()
});
```
---

# JSON Driver (ví dụ)

```ts
import { Database, JSONDriver } from "blackcat.js-database";

const database = new Database({
    driver: db = new JSONDriver({
      filePath: "./database.json"
    })
});
```
---

# Mongo Driver (ví dụ)

```ts
import { Database, MongoDriver } from "blackcat.js-database";

const database = new Database({ 
    driver: new MongoDriver({
        mongourl: "mongodb://localhost:27017", 
        databaseName: "mydb",  
        collectionName: "store" 
    })
});
```
---

# SQLite Driver (ví dụ)

```ts
import { Database, SQLiteDriver } from "blackcat.js-database";

const database = new Database({ 
    driver: new SQLiteDriver({
        filePath: "database.sqlite",
        table: "json_store"
    })
});
```
---



# Tạo Custom Driver

Bạn có thể tạo driver riêng bằng cách implement `DatabaseDriver`.

```ts
import { DatabaseDriver } from "blackcat.js-database";

class MyDriver implements DatabaseDriver {
  async all() {
    return {};
  }

  async set(data) {
  }

  async delete() {
  }

}
```

Sử dụng:

```ts
const db = new Database({
  driver: new MyDriver()
});
```

---

# Ví dụ hoàn chỉnh

```ts
import { Database, JSONDriver } from "blackcat.js-database";

const db = new Database({
    driver: db = new JSONDriver({
      filePath: "./database.json"
    })
});
 
await db.set("users", []);

await db.push("users", {
  id: 1,
  name: "Alice",
  coins: 100
});

await db.add("users.0.coins", 50);

const user = await db.get("users.0");

console.log(user);
```

---

# License

MIT