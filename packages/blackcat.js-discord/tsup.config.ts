import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"], // Tệp nguồn chính cần build
    format: ["cjs", "esm"], // Định dạng đầu ra: CommonJS (cjs)
    target: "es2021", // Mục tiêu biên dịch: ES2021
    outDir: "dist", // Thư mục chứa file đầu ra sau khi build
    //noExternal: [], // Danh sách package không được đặt là external
    platform: "node", // Môi trường chạy: Node.js
    skipNodeModulesBundle: true, // Bỏ qua việc bundle `node_modules` để giảm kích thước file
    clean: true, // Xóa thư mục `dist` trước khi build mới
    //minify: false, // Không bật minify (có thể bật để giảm kích thước file)
    //splitting: false, // Không chia nhỏ file đầu ra (giữ nguyên một file duy nhất)
    keepNames: true, // Giữ nguyên tên biến và class khi build
    dts: true, // Xuất file `.d.ts` để hỗ trợ TypeScript
    sourcemap: true, // Tạo file sourcemap để debug dễ hơn
    //treeshake: false, // Không bật tree-shaking (loại bỏ code không sử dụng)
    terserOptions: {
        mangle: false, // Không làm rối tên biến
        keep_classnames: true, // Giữ tên class khi build
        keep_fnames: true, // Giữ tên hàm khi build
    }
});