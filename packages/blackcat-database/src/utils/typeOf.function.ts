/**
 * Returns the exact type of a given input.
 * @param input - The value to check.
 * @returns A string representing the exact type of the input.
 */
export const typeOf = (input: any): string => {
    // ✅ Handle special cases: null, undefined, and NaN
    if (input == null || (typeof input === "number" && Number.isNaN(input))) return String(input);
    // ✅ If it's a class constructor (has a prototype)
    if (typeof input === "function" && input.prototype) return `${input.name} class instance`;
    // ✅ If it's an object or function, return the constructor name if available
    return input?.constructor?.name ?? typeof input;
};