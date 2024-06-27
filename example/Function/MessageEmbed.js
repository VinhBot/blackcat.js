const { MessageEmbed } = require("../../src/blackcat"); // blackcat.js

const embeds = new MessageEmbed({
    title: {
        text: "Tiêu đề của embed",
        url: "https://discord.js.org"
    },
    description: "mô tả ",
    timestamp: Date.now(),
    color: "Màu tùy chọn",
    author: {
        name: "Tên của tác giả",
        iconURL: "https://i.imgur.com/AfFp7pu.png",
        url: "https://discord.js.org",
    },
    thumbnail: "https://i.imgur.com/AfFp7pu.png",
    fields: [
        {
            name: "name 1",
            value: "value 1",
            inline: false
        },
        {
            name: "name 2",
            value: "value 2",
            inline: false
        }
    ],
    footer: {
        text: "văn bản của footer.",
        iconURL: "https://i.imgur.com/AfFp7pu.png"
    },
    images: "https://i.imgur.com/AfFp7pu.png"
});

console.log(embeds);