# Changelog

## 1.1.0

### Hiệu năng (giữ nguyên logic)
- Thao tác ghi dùng `mutate`: 1 lần đọc + 1 lần ghi (`add`, `subtract`, `ensure`, `push`, `unshift`, `pull`: 2R → 1R; `pop`: 3R → 1R; `deleteMany` không ghi khi không xóa gì; `push`/`unshift` không ghi khi không thêm gì).
- Gom logic duyệt path vào `utils/path.ts`; gộp `add/subtract`, `push/unshift`.
- Validate tham số **trước** khi đọc driver.
- Loại trùng `push`/`unshift`/`update` bằng `Set`/`Map` (O(n+m)).
- `JSONDriver`: khởi tạo file một lần; ghi atomic; serialize đồng bộ trước khi ghi.
- `SQLiteDriver`: prepare statement một lần; bật WAL + `synchronous = NORMAL`; validate tên bảng; đường nhanh `json_extract`/`json_set`.
- `MongoDriver`: kết nối một lần (không race); `upsert` thay `findOne` + `insertOne`; đường nhanh theo path.
- `better-sqlite3`/`mongodb` thành optional peer dependency (nạp lazy), bỏ `mongoose` khỏi dependencies; thêm subpath `blackcat.js-database/sqlite` và `/mongo`.

### An toàn
- Hàng đợi tuần tự chống race condition đọc-sửa-ghi.
- Chặn prototype pollution (`UNSAFE_KEY`); `get` chỉ đọc thuộc tính sở hữu.
- `JSONDriver`: file hỏng không còn bị ghi đè thành `{}` (được đổi tên `.corrupt-<time>`).

### Mới
- `CachedDriver`, `EncryptedDriver`, `CompressedDriver`, `MirrorDriver`.
- `scope`, `transaction`, `setMany`, `getMany`, `deleteKeys`, `increment`, `clear`, `entries`, `toMap`, `findMany`, `count`, `paginate`, `updateMany`, `replaceAt`, async iterator.
- Toán tử query, sort/limit/skip; `find/map/filter/some/every/findIndex` nhận thêm `key`.
- Sự kiện (`set`, `update`, `delete`, `clear`, `expire`, `change`, `error`), TTL theo key, validator, defaults, `cloneOnRead`, `autoCreateArrays`, `delimiter` và `debug` hoạt động thật, `stats`.
- `export`/`import`/`backup`/`autoBackup`/`Database.migrate`.
- Driver tùy chọn `init`/`flush`/`close`/`getPath`/`setPath`.
- Xuất `BlackCatError`, `errors` và toàn bộ types từ entry chính; `BlackCatError.code`, `withCause`, `UNSAFE_KEY`, `INDEX_OUT_OF_BOUNDS`, ...
- Test thật bằng `node:test` (`npm test`).

### Thay đổi hành vi (cần lưu ý)
1. `add`/`subtract`: tham số dạng chuỗi số (`"5"`) được ép thành số (trước đây gây nối chuỗi `"05"`); giá trị đang lưu dạng chuỗi số cũng được ép.
2. `pull`: index ngoài phạm vi ném `INDEX_OUT_OF_BOUNDS` (trước đây chỉ log lỗi và vẫn ghi); hỗ trợ index âm.
3. `pop`: index trùng chỉ xóa một lần, hỗ trợ index âm; key không tồn tại trả `[]` và **không** tạo key mới.
4. `update` (nối mảng): mặc định vẫn dùng `username` + `guild` cho object có các field này, nhưng các phần tử khác được so sánh theo nội dung (trước đây mọi phần tử không có 2 field này bị coi là trùng nên không bao giờ được thêm). Dùng `uniqueBy` để tự chọn.
5. `set`/`update`... đi qua mảng trong path (`users.0.coins`) thay vì thay mảng bằng `{}`; `delete("list.1")` xóa phần tử bằng `splice`.
6. `JSONDriver.all()`: lỗi I/O (không phải ENOENT/JSON hỏng) được ném ra thay vì trả `{}`.
7. `SQLiteDriver`/`MongoDriver`: việc mở file/kết nối diễn ra ở thao tác đầu tiên (hoặc `init()`), không phải trong constructor.
8. `get`/`has` với key chứa `__proto__`, `constructor`, `prototype` trả `null`/`false`; các thao tác ghi ném `UNSAFE_KEY`.
