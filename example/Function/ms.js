import { ms } from "../../src/blackcat.js"; //"blackcat.js";

const timeString = "1w 3d 5h";
const totalTimeInMs = ms(timeString);
console.log(totalTimeInMs); // Output: 910800000 (tổng thời gian tính bằng mili giây)