/**
 * Lấy chuỗi dựa trên thông tin được cung cấp
 * @param {object} options - Đối tượng chứa thông tin cần thiết để lấy chuỗi
 * @param {string} options.lang - Ngôn ngữ cần lấy chuỗi
 * @param {string} options.key - Khóa của chuỗi cần lấy
 * @param {object} [options.replacements={}] - Đối tượng chứa các giá trị thay thế (mặc định là đối tượng trống)
 * @returns {string} - Chuỗi đã được dịch
 */
declare function getLocalizedString(options: {
    lang: string;
    key: string;
    replacements?: { [key: string]: string };
}): string;

export default getLocalizedString;
