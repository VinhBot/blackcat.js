import { LanguageManager } from "../../src"

interface Language {
    hello: {
        world: {
            text: string;
        };
    };
    test: string;
    welcome: string;
}

const vi: Language = {
    hello: {
        world: {
            text: "Xin chào {user}"
        }
    },
    test: "Đây là test",
    welcome: "Chào mừng {user} đến server"
};

const en: Language = {
    hello: {
        world: {
            text: "Hello {user}"
        }
    },
    test: "This is test",
    welcome: "Welcome {user} to server"
};

const lang = new LanguageManager<Language>({
    defaultLanguage: "vi",
    resources: {
        vi: vi,
        en: en
    },
    fallback: (key) => `Missing translation: ${key}`
});

const text = lang.translate("hello.world.text", {
    user: "vinh"
});

console.log(text);
// Xin chào vinh

console.log(lang.translate("test"));
// Đây là test

console.log(lang.translate("welcome", {
    user: "Vinh"
}));
// Chào mừng Vinh đến server

lang.setLanguage("en");

console.log(lang.t("hello.world.text", {
    user: "Vinh"
}));
// Hello Vinh

console.log(lang.has("hello.world.text"));
// true

console.log(lang.getLanguages());
// [ 'vi', 'en' ]