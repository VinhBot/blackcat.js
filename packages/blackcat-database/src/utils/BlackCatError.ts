import { } from "../types";
import { typeOf } from "./typeOf.function";

export type TargetParamType = "string" | "number" | "object" | "array" | `${string} class instance`;

export const errors = {
    DEVICE_IS_OFFLINE: 'Your device appears to be offline so it\'s impossible to proceed with ' + 'connection to your online MongoDB cluster. Please connect your device to the internet or switch to the ' + 'local MongoDB database and try again.',
    CONNECTION_NOT_ESTABLISHED: 'Failed to connect to MongoDB. Please double-check the specified ' + 'connection URI and make sure that you\'re performing the ' + 'database connection using the `QuickMongoClient.connect()` method.',
    CONNECTION_URI_NOT_SPECIFIED: 'The MongoDB connection URI must be specified.',
    INVALID_CONNECTION_URI: 'The specified MongoDB connection URI is invalid.',
    UNKNOWN_ERROR: 'Unknown error.',
    REQUIRED_PARAMETER_MISSING: '\'{1}\' parameter is required but is missing.',
    REQUIRED_CONSTRUCTOR_PARAMETER_MISSING: '\'{1}\' parameter in constructor \'{2}\' is required but is missing.',
    INVALID_CONSTRUCTOR_PARAMETER_TYPE: '\'{1}\' parameter in constructor \'{2}\' must be ' + 'a type of {3}. Received type: {4}.',
    INVALID_TYPE: '\'{1}\' must be a type of {2}. Received type: {3}.',
    ONE_OR_MORE_ARRAY_TYPES_INVALID: 'All specified elements from array in \'{1}\' parameter ' + 'must be a type of {2}. Received array of types: {3}.',
    INVALID_TARGET: 'The target in database must be a type of {1}. Received target type: {2}.',
    INVALID_KEY: "{1}",
    INVALID_PARAMETER: "{1} {2}",
    DATABASE_CONNECTION_FAILED: "{1}"
}

export interface ErrorParams extends Record<keyof typeof errors, string[]> {
    CONNECTION_NOT_ESTABLISHED: [];
    UNKNOWN_ERROR: [];
    CONNECTION_URI_NOT_SPECIFIED: [];
    INVALID_CONNECTION_URI: [];
    REQUIRED_PARAMETER_MISSING: [missingParam: string];
    REQUIRED_CONSTRUCTOR_PARAMETER_MISSING: [missingParam: string, className: string];
    INVALID_TYPE: [paramName: string, targetType: TargetParamType, receivedType: string];
    INVALID_CONSTRUCTOR_PARAMETER_TYPE: [paramName: string, className: string, targetType: TargetParamType, receivedType: string];
    ONE_OR_MORE_ARRAY_TYPES_INVALID: [paramName: string, targetType: TargetParamType, receivedTypesArray: string];
    INVALID_TARGET: [targetType: TargetParamType, receivedType: string];
    INVALID_KEY: [paramName: string];
    INVALID_PARAMETER: [paramName: string, receivedType: string];
    DATABASE_CONNECTION_FAILED: [paramName: string]
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