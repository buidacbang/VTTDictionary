module.exports = {
    app: {
        port: 3000,
        originalLanguage: 'en',
        secretKey: "none"
    },
    database: {
        url: 'mongodb://192.168.0.16:27017/dictionary'
    },
    translate: {
        url: 'https://translation.googleapis.com/language/translate/v2/',
        key: 'AIzaSyCPOsaGBuHbEpaAcnGHvEioaLZS7lbKHok',
        delay: 0 // Delay between 2 request to google translate server (in mili-seconds)
    },
    paginate: {
        minPageSize: 20,
        maxPageSize: 50
    },
    modelName: {
        dictionary: "Dictionary",
        category: "Category",
        course: "Course",
        catecache: "CateCache",
        feedback: "FeedBack",
        newword: "NewWord",
        language: "Language",
        translate: "Translate",
        setting: "Setting",
        user:"User"
    },
}
