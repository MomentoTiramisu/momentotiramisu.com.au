const jwt = require('jsonwebtoken');
require('dotenv').config(); 

const secret = process.env.SECRET_JWT; 

function generateToken(account, rememberMe){
    let payload = {
        id: account.id,
        email: account.email,
    }
    return jwt.sign(payload, secret, {
        expiresIn: rememberMe ? '30d' : '5h' 
    });   
}


function checkToken(token){
    try{
        let result = jwt.verify(token, secret);
        return result;
    } catch(error){
        return null;
    }
}


module.exports = {generateToken, checkToken};