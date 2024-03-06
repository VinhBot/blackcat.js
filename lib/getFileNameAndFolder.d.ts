import { ParsedPath } from "node:path";
import { URL } from "node:url";

/**
 * Hàm lấy thông tin về tên file và thư mục chứa file từ một URL file.
 * @param {string | URL} currentFileUrl - URL của file hiện tại.
 * @returns {{ fileName: ParsedPath, folderName: ParsedPath }} - Đối tượng chứa fileName và folderName.
 */
export function getFileNameAndFolder(currentFileUrl: string | URL): { fileName: ParsedPath, folderName: ParsedPath };
