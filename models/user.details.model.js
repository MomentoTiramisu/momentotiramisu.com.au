const mongoose = require('mongoose');
let Schema = mongoose.Schema;


const detailsSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        required: true,
        unique: true 
    },
    name: String,
    address: String,
    country: String,
    city: String,
    suburb: String,
    postcode: String,
    billingAddress: String,
    phone: String,
    sameAsDelivery: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    deliveryMethod: String, //sent to processPayments
});

const getDetails = mongoose.model('Detail', detailsSchema); 

module.exports = {getDetails};
