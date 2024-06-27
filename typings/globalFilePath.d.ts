/**
 * Chuyển đổi đường dẫn tệp thành URL toàn cầu (global URL) sử dụng pathToFileURL của Node.js.
 * @param path Đường dẫn tệp cần chuyển đổi.
 * @returns URL toàn cầu hoặc đường dẫn ban đầu nếu chuyển đổi không thành công.
 */
export declare function globalFilePath(path: string): string;