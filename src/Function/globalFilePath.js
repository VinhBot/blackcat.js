import nodeUrl from "node:url";

/**
* @info Chuyển đổi đường dẫn tệp thành URL toàn cầu (global URL) sử dụng pathToFileURL của Node.js.
* @param {string} path Đường dẫn tệp cần chuyển đổi.
* @returns {string} URL toàn cầu hoặc đường dẫn ban đầu nếu chuyển đổi không thành công.
*/
export default function globalFilePath(path) {
    return nodeUrl.pathToFileURL(path).href || path; // Sử dụng pathToFileURL của Node.js để chuyển đổi đường dẫn thành URL. Nếu thành công, trả về href của URL; nếu không, trả về đường dẫn ban đầu.
};