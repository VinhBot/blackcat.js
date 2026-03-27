import { typeOf } from "./typeOf.function";

export type TargetParamType = "string" | "number" | "object" | "array" | `${string} class instance`;
export const errors = {
    UNKNOWN_ERROR: 'Lỗi không xác định.',
    REQUIRED_PARAMETER_MISSING: 'Tham số \'{1}\' là bắt buộc nhưng chưa được cung cấp.',
    INVALID_TYPE: '\'{1}\' phải có kiểu {2}. Kiểu nhận được: {3}.',
    ONE_OR_MORE_ARRAY_TYPES_INVALID: 'Tất cả phần tử trong mảng của tham số \'{1}\' phải có kiểu {2}. Các kiểu nhận được trong mảng: {3}.',
    INVALID_TARGET: 'Đối tượng target trong database phải có kiểu {1}. Kiểu nhận được: {2}.',
    INVALID_KEY: "{1}",
};
export interface ErrorParams extends Record<keyof typeof errors, string[]> {
    UNKNOWN_ERROR: [];
    REQUIRED_PARAMETER_MISSING: [missingParam: string];
    INVALID_TYPE: [paramName: string, targetType: TargetParamType, receivedType: string];
    ONE_OR_MORE_ARRAY_TYPES_INVALID: [paramName: string, targetType: TargetParamType, receivedTypesArray: string];
    INVALID_TARGET: [targetType: TargetParamType, receivedType: string];
    INVALID_KEY: [paramName: string];
}
export const createTypesArray = <T>(...elements: any): string => `[${elements.map((element: any) => typeOf(element))}]`;
/**
 * BlackCatError class.
 */
export class BlackCatError<TErrorCode extends keyof typeof errors> extends Error {
    /**  
     * Creates a BlackCatError instance.
     * @param {string} errorCode Quick Mongo error code.
     * @param {any[]} params Additional parameters to replace the placeholders in the error message.
     */
    public constructor(errorCode: TErrorCode, ...params: ErrorParams[TErrorCode]) {
        const code = errors[errorCode] ? errorCode : "UNKNOWN_ERROR" as TErrorCode;
        let message = errors[code];
        for (let i = 0; i < params.length; i++) {
            message = message.replaceAll(`{${i + 1}}`, params[i]);
        };
        super(message);
        /**
         * The name of the error.
         */
        this.name = `BlackCatError [${code}]`;
    }
}