// Import package theo yêu cầu
const path = require("node:path");
const url = require("node:url");
/**
 * Hàm lấy thông tin về tên file và thư mục chứa file từ một URL file.
 * @param {string} currentFileUrl - URL của file hiện tại.
 * @returns {object} - Đối tượng chứa fileName và folderName.
 */
module.exports = function(currentFileUrl) {
    // Chuyển đổi URL thành đường dẫn tuyệt đối
    const filename = url.fileURLToPath(currentFileUrl);
    // Lấy thư mục chứa file từ đường dẫn
    const dirName = path.dirname(filename);
    // Lấy tên file và thư mục từ đường dẫn sử dụng parse
    const fileName = path.parse(filename);
    const folderName = path.parse(dirName);
    return { fileName, folderName };
};