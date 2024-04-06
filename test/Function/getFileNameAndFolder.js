import { getFileNameAndFolder } from "blackcat.js";

const getName = getFileNameAndFolder(import.meta.url).fileName.name; // lấy tên của file
const getFolderName = getFileNameAndFolder(import.meta.url).folderName.name; // lấy tên của folder

console.log(getName); // Output: getFileNameAndFolder.js
console.log(getFolderName); // Output: Function