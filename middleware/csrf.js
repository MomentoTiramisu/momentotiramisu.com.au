const {doubleCsrf: doubleCsrf} = require("csrf-csrf");

const {generateCsrfToken: generateCsrfToken, doubleCsrfProtection: doubleCsrfProtection} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,
    getSessionIdentifier: req => req.session.id,
    cookieName: "x-csrf-token",
    cookieOptions: {
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
    },
    getTokenFromRequest: req => req.headers["x-csrf-token"]
});

module.exports = {
    generateCsrfToken: generateCsrfToken,
    doubleCsrfProtection: doubleCsrfProtection
};