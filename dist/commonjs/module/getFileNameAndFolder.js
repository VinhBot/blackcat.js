const { dirname, parse } = require("node:path");
const { fileURLToPath } = require("node:url");
/**
 * Hàm lấy thông tin về tên file và thư mục chứa file từ một URL file.
 * @param {string} currentFileUrl - URL của file hiện tại.
 * @returns {object} - Đối tượng chứa fileName và folderName.
 */
function getFileNameAndFolder(currentFileUrl) {
  // Chuyển đổi URL thành đường dẫn tuyệt đối
  const filename = fileURLToPath(currentFileUrl);
  // Lấy thư mục chứa file từ đường dẫn
  const dirName = dirname(filename);
  // Lấy tên file và thư mục từ đường dẫn sử dụng parse
  const fileName = parse(filename);
  const folderName = parse(dirName);
  return { fileName, folderName };
};

module.exports = getFileNameAndFolder;