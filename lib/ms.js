/**
   * @info Chuyển đổi một chuỗi thời gian vào giá trị tương ứng tính bằng mili giây.
   * @param {string} str Chuỗi thời gian cần chuyển đổi.
   * @returns {number} Tổng thời gian tính bằng mili giây.
   * @example
   * import { ms } from "blackcat.js";
   * const timeString = "1w 3d 5h";
   * const totalTimeInMs = ms(timeString);
   * console.log(totalTimeInMs); // Output: 910800000 (tổng thời gian tính bằng mili giây)
   */
export function ms(str) {
    // timeMap là một đối tượng loại thời gian (w, d, h, m, s) với giá trị tương ứng ở đơn vị mili giây.
    const timeMap = {
        'w': 604800000, // tuần
        'd': 86400000,  // ngày
        'h': 3600000,   // giờ
        'm': 60000,     // phút
        's': 1000       // giây
    };
    // regex là một biểu thức chính quy để kiểm tra xem một chuỗi có định dạng thời gian hợp lệ hay không.
    const regex = /^(\d{1,}\.)?\d{1,}([wdhms])?$/i;
    // sum là biến lưu tổng thời gian tính bằng mili giây.
    let sum = 0;
    // arr là một mảng chứa các phần tử của chuỗi đã được lọc dựa trên regex. Các phần tử này đại diện cho các phần của thời gian.
    const arr = ('' + str).split(' ').filter((v) => regex.test(v));
    // Duyệt qua từng phần tử trong arr.
    for (let i = 0; i < arr.length; i++) {
        const time = arr[i];
        // Đối với mỗi phần tử, kiểm tra xem nó có khớp với /[wdhms]$/i (kí tự cuối cùng là w, d, h, m, s) hay không.
        const match = time.match(/[wdhms]$/i);
        if (match) {
            // Nếu khớp, lấy loại thời gian (type), chuyển đổi giá trị thành số (Number(time.replace(type, ''))), và thêm vào sum dựa trên timeMap.
            const type = match[0].toLowerCase();
            sum += Number(time.replace(type, '')) * timeMap[type];
        } else if (!isNaN(parseFloat(time)) && isFinite(parseFloat(time))) {
            // Nếu không khớp, kiểm tra xem nó có phải là số hay không, và nếu đúng, thêm giá trị số đó vào sum.
            sum += parseFloat(time);
        };
    };
    // Hàm trả về tổng thời gian tính bằng mili giây.
    return sum;
};