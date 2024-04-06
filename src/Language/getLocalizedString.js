import vi from "./lang/vi.js";
import en from "./lang/en.js";
/**
 * Lấy chuỗi dựa trên thông tin được cung cấp
 * @param {object} options - Đối tượng chứa thông tin cần thiết để lấy chuỗi
 * @param {string} options.lang - Ngôn ngữ cần lấy chuỗi
 * @param {string} options.key - Khóa của chuỗi cần lấy
 * @param {object} [options.replacements={}] - Đối tượng chứa các giá trị thay thế (mặc định là đối tượng trống)
 * @returns {string} - Chuỗi đã được dịch
 */
export default function getLocalizedString(options = {}) {
    const languageStrings = {
        "en": en, // tiếng anh 
        "vi": vi, // tiếng việt
    };
    let currentObj = languageStrings[options.lang];
    for (const k of options.key.split('.')) {
        currentObj = currentObj[k];
        if (!currentObj) return "Không tìm thấy chuỗi ký tự";
    };
    // Thực hiện thay thế các giá trị
    if (typeof currentObj === 'string' && options.replacements) {
        for (const [placeholder, value] of Object.entries(options.replacements)) {
            currentObj = currentObj.replace(`{${placeholder}}`, value);
        };
    };
    return currentObj;
};