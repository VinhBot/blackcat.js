/**
 * Các kiểu tham số mục tiêu được dùng trong thông báo lỗi.
 */
export type TargetParamType = "string" | "number" | "object" | "array" | "function" | `${string} class instance`;

/**
 * Bảng thông báo lỗi. `{1}`, `{2}`, `{3}` sẽ được thay bằng các tham số truyền vào {@link BlackCatError}.
 */
export const errors = {
    UNKNOWN_ERROR: 'Lỗi không xác định.',
    REQUIRED_PARAMETER_MISSING: 'Tham số \'{1}\' là bắt buộc nhưng chưa được cung cấp.',
    INVALID_TYPE: '\'{1}\' phải có kiểu {2}. Kiểu nhận được: {3}.',
    ONE_OR_MORE_ARRAY_TYPES_INVALID: 'Tất cả phần tử trong mảng của tham số \'{1}\' phải có kiểu {2}. Các kiểu nhận được trong mảng: {3}.',
    INVALID_TARGET: 'Đối tượng target trong database phải có kiểu {1}. Kiểu nhận được: {2}.',
    INVALID_KEY: "{1}",
    UNSAFE_KEY: "Key '{1}' chứa phân đoạn không được phép ('__proto__', 'constructor', 'prototype').",
    INDEX_OUT_OF_BOUNDS: "Index {1} nằm ngoài phạm vi của mảng '{2}' (độ dài: {3}).",
    VALIDATION_FAILED: "Giá trị của '{1}' không hợp lệ: {2}",
    MODULE_NOT_FOUND: "Không tìm thấy module '{1}'. Hãy cài đặt bằng: npm install {1}",
    INVALID_OPTION: "Tùy chọn '{1}' không hợp lệ: {2}",
    DECRYPT_FAILED: "Không thể giải mã database. Sai khóa hoặc dữ liệu đã bị thay đổi.",
};

/**
 * Tham số tương ứng cho từng mã lỗi.
 */
export interface ErrorParams extends Record<keyof typeof errors, string[]> {
    UNKNOWN_ERROR: [];
    REQUIRED_PARAMETER_MISSING: [missingParam: string];
    INVALID_TYPE: [paramName: string, targetType: TargetParamType, receivedType: string];
    ONE_OR_MORE_ARRAY_TYPES_INVALID: [paramName: string, targetType: TargetParamType, receivedTypesArray: string];
    INVALID_TARGET: [targetType: TargetParamType, receivedType: string];
    INVALID_KEY: [message: string];
    UNSAFE_KEY: [key: string];
    INDEX_OUT_OF_BOUNDS: [index: string, key: string, length: string];
    VALIDATION_FAILED: [key: string, reason: string];
    MODULE_NOT_FOUND: [moduleName: string];
    INVALID_OPTION: [optionName: string, reason: string];
    DECRYPT_FAILED: [];
}

/**
 * Lỗi chuẩn của blackcat.js-database.
 *
 * Mỗi lỗi có thuộc tính {@link BlackCatError.code} để phân loại bằng code
 * thay vì so sánh chuỗi thông báo.
 *
 * @example
 * ```ts
 * try {
 *     await db.push("users", 1);
 * } catch (error) {
 *     if (error instanceof BlackCatError && error.code === "INVALID_TARGET") {
 *         // ...
 *     }
 * }
 * ```
 */
export class BlackCatError<TErrorCode extends keyof typeof errors = keyof typeof errors> extends Error {
    /**
     * Mã lỗi (ví dụ `INVALID_TYPE`).
     */
    public readonly code: TErrorCode;
    /**
     * @param errorCode Mã lỗi, xem {@link errors}.
     * @param params Các tham số điền vào `{1}`, `{2}`, ... của thông báo.
     */
    public constructor(errorCode: TErrorCode, ...params: ErrorParams[TErrorCode]) {
        const code = (errors[errorCode] ? errorCode : "UNKNOWN_ERROR") as TErrorCode;
        let message: string = errors[code];
        for (let i = 0; i < params.length; i++) {
            // Dùng hàm thay thế để các chuỗi như "$&" trong tham số không bị diễn giải.
            message = message.replaceAll(`{${i + 1}}`, () => String(params[i]));
        }
        super(message);
        this.code = code;
        /**
         * Tên lỗi, có kèm mã lỗi.
         */
        this.name = `BlackCatError [${code}]`;
        Error.captureStackTrace?.(this, BlackCatError);
    }
    /**
     * Gắn lỗi gốc (nguyên nhân) vào lỗi này.
     *
     * @param cause Lỗi gốc.
     * @returns Chính instance này, để có thể `throw new BlackCatError(...).withCause(err)`.
     */
    public withCause(cause: unknown): this {
        (this as { cause?: unknown }).cause = cause;
        return this;
    }
}
