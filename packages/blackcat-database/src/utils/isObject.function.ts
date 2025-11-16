/**
 * Checks for is the item object and returns it.
 * @param {any} item The item to check.
 * @returns {boolean} Is the item object or not.
 */
export const isObject = (item: any): boolean => !Array.isArray(item) && item !== null && typeof item == "object";