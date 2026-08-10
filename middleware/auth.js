const auth = require("../controllers/auth");

const createAccount = require("../models/account.create.model").createAccount;

function checkAuth(req, res, next) {
    let token = req.cookies["auth_token"];
    if (token) {
        try {
            const decoded = auth.checkToken(token);
            req.user = decoded;
            next();
        } catch (err) {
            res.status(401).send("Invalid token");
        }
    } else {
        res.status(401).send("Not authorized");
    }
}

async function requireVerifiedUser(req, res, next) {
    const account = await createAccount.findById(req.user.id);
    if (!account || !account.isVerified) {
        return res.redirect("/login");
    }
    req.account = account;
    next();
}

module.exports = {
    checkAuth: checkAuth,
    requireVerifiedUser: requireVerifiedUser
};