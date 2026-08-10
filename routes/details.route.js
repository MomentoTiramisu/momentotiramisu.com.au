const express = require('express'); 
const router = express.Router(); 

const getDetails = require('../models/user.details.model').getDetails; 
const {checkAuth, requireVerifiedUser} = require('../middleware/auth');

const { doubleCsrfProtection } = require('../middleware/csrf');

router.get('/', checkAuth, requireVerifiedUser, async (req, res) => {
    try {
        const userId = req.user.id; 
        const details = await getDetails.findOne({ userId }); 
        
        const cart = req.session.cart || [];
        const total = cart.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        if(total <= 0){
            return res.redirect('/cart'); 
        }

        res.render('details', { 
            email: req.account.email, 
            details, 
            cart,
            total: total.toFixed(2),
            locationId: process.env.PRODUCTION_LOCATION_ID,
            appId: process.env.PRODUCTION_APP_ID,
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
        });
    } catch (err) {
        res.status(500).send('Server error');
    }
});


router.post('/', checkAuth, requireVerifiedUser, doubleCsrfProtection, async (req, res) => {
    const { name, address, suburb, postcode, city, billingAddress, phone, sameAsDelivery, deliveryMethod } = req.body;
    const userId = req.user.id;
    // update if exists, otherwise create
    let details = await getDetails.findOne({ userId });
    if (details) {
        Object.assign(details, { name, address, suburb, postcode, city, billingAddress, phone, sameAsDelivery, deliveryMethod });
        await details.save();
    } else {
        await getDetails.create({ userId, name, address, suburb, postcode, city, billingAddress, phone, sameAsDelivery, deliveryMethod });
    }

    res.redirect('/details'); 
});

module.exports = router;
