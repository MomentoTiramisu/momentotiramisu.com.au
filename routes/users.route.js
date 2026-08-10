const createAccount = require('../models/account.create.model').createAccount; 
const express = require('express'); 
const router = express.Router(); 
const bcrypt = require('bcrypt');
const auth = require('../controllers/auth');
const jwt = require('jsonwebtoken');

const transporter = require('../config/nodemailer');
const crypto = require('crypto'); 

const { doubleCsrfProtection } = require('../middleware/csrf');

const rateLimit = require('express-rate-limit');


function isPasswordValid(password){
    if(!password || password.length < 12) return false;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumbers = /\d/.test(password); 
    const hasSpecial = /[(!@$)#&*()\-_+{};:",./?]/.test(password);
    return hasLower && hasUpper && hasNumbers && hasSpecial;
}

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    limit: 5, 
    message: 'Too many login attempts.'
});

const createAccountLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    message: 'Too many account creation attempts.'
});

const logoutLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 5,
    message: 'Too many logout attempts.'
});

const forgotLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 1,
    message: 'Too many attempts.'
});

const resetPasswordLimiter =rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 3,
    message: 'Too many attempts.'
});

router.get('/logout', logoutLimiter, (request, response) => {
    response.clearCookie('auth_token', { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    });    
    response.redirect('/login');
})


router.get('/verify/:token', async (request, response) => {
    let token = request.params.token; 

    
    let account = await createAccount.findOne({verificationToken: token});
    
    if(account){
        account.isVerified = true;
        account.verificationToken = null;
        await account.save(); 
        response.redirect('/login?verified=true'); 
    } else {
        response.send({message: 'Invalid or expired token'});
    }
})

router.get('/reset-password/:token', (req, res) => {
    res.render('reset-password', { token: req.params.token });
});

router.post('/create-account', createAccountLimiter, doubleCsrfProtection, async (request, response) => {
    let email = request.body.email; 
    let password = request.body.password;

    if(!isPasswordValid(password)){
        return response.status(400).json({message: 'Password does not meet requirements.'})
    }

    let account = await createAccount.findOne({ email });  
    if(!account){ 
        let encryptedPass = await bcrypt.hash(password, 12); 

        let verificationToken = crypto.randomBytes(32).toString('hex'); 

        let newAccount = new createAccount({
            email,
            password: encryptedPass,
            verificationToken: verificationToken 
        })

        await newAccount.save(); 
        const mailOptions = {
            from: '"Momento Tiramisu" <momento.tiramisu@gmail.com>', 
            to: email, 
            subject: 'Verify your Momento account', 
            
            html: `
                <h2>Welcome to Momento Tiramisu!</h2> 
                <p>Thank you for creating an account.</p>
                <p>Please click the link below to verify your email address:</p>
                <a href="http://${process.env.BASE_URL}/users/verify/${verificationToken}">Verify my account</a>
                <p>If you did not create an account, please ignore this email.</p>
            `
        };        

        
        try {
            await transporter.sendMail(mailOptions);
            
            return response.send({
                message: 'Account created', 
                redirectURL: '/login'
            });
        } catch (error) {
            console.error("Verification email failed to send.");
            
            await createAccount.deleteOne({ email });
            
            return response.status(500).json({ 
                message: 'Failed to send verification email. Please try again.' 
            });
        }
    } else {
        response.send({message : 'Rejected'});
    }
})

router.post('/login', loginLimiter, doubleCsrfProtection, async (request, response) => {
    let email = request.body.email;
    let password = request.body.password;
    let rememberMe = request.body.rememberMe;


    let account = await createAccount.findOne({ email }); 
    if(account){ 
        let comparisonResult = await bcrypt.compare(password, account.password); 
        if(comparisonResult){ 
            if(!account.isVerified){
                return response.send({message: 'Please verify your email before logging in'});
            } 
            
            let token = auth.generateToken(account, rememberMe);

            response.cookie('auth_token', token, {
                maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined,

                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            const redirect = request.body.redirect;
            response.send({
                redirectURL : redirect ? `/${redirect}` : '/cart', 
                message : 'Success'
            });
        } else {
        response.send({message : 'Rejected'}); 
        }
    } else {
        response.send({message : 'Rejected'});
    }

    
})

router.post('/forgot-password', forgotLimiter, doubleCsrfProtection, async (req, res) =>{
    let email = req.body.email;

    try{

        let user = await createAccount.findOne({ email }); 
        if(!user){ 
            return res.status(200).json({ message: 'Please check your email, a reset link has been sent.' });
        }

        const secret = process.env.SECRET_JWT + user.password; 
        const token = jwt.sign({ email: user.email }, secret, { expiresIn: '10m' });

        if(!token){
            return res.status(500).json({ error: "Sorry token expired. Try again" });
        }
        const resetLink = `http://${process.env.BASE_URL}/users/reset-password/${token}` 
        
        const mailToReset = {
            from: '"Momento Orders" <orders@momentotiramisu.com.au>',
            to: user.email,
            subject: 'Password Reset Request',
            html: `
                <p>You requested a password reset.</p>
                <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
                <a href="${resetLink}">Reset your password</a>
            `
        };
        await transporter.sendMail(mailToReset);
        return res.status(200).json({ message: 'Please check your email, a reset link has been sent.' });
        
    } catch (error){
        return res.status(500).json({ error: "Something went wrong on the server." });
    }
})

router.post('/reset-password/:token', resetPasswordLimiter, doubleCsrfProtection, async (req, res) =>{
    try{
        let password = req.body.password; 
        const decoded = jwt.decode(req.params.token);

        if(!isPasswordValid(password)){
            return res.status(400).json({message: 'Password does not meet requirements.'})
        }

        if (!decoded || !decoded.email) {
            return res.status(400).json({ message: 'Invalid link.' });
        }

        let user = await createAccount.findOne({ email: decoded.email });
        if(!user){ 
            return res.status(400).json({ message: 'User does not exist' });
        }

        const secret = process.env.SECRET_JWT + user.password;
        try {
            jwt.verify(req.params.token, secret);
        } catch (err) {
            return res.status(400).json({ message: 'This link is invalid or has expired.' });
        }

        const compare = await bcrypt.compare(password, user.password);
        if(compare){
            return res.status(400).json({message: 'Please choose a new password'})
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        user.password = hashedPassword; 
        await user.save();
        
        
        return res.status(200).json({ message: "Password updated successfully. You can now log in." });
    } catch(error) {
        return res.status(500).json({ message: 'Something went wrong' });
    }

}) 
module.exports = router; 
