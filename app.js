require('dotenv').config();

const express = require('express');
const cloudinary = require('./config/cloudinary'); 
const multer = require('multer');

const path = require('path'); 
const session = require('express-session');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo').default;
const mongoose = require('mongoose');


const products = require('./data/products'); 
const suburbs = require('./data/suburbs');
const auth = require('./controllers/auth');
const transporter = require('./config/nodemailer');
let accountRouter = require('./routes/users.route')
let detailsRouter = require('./routes/details.route');
const { checkAuth, requireVerifiedUser } = require('./middleware/auth');
const { generateCsrfToken, doubleCsrfProtection } = require('./middleware/csrf');
const helmetConfig = require('./middleware/helmet');


const app = express(); 

app.set("trust proxy", 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 

app.use(express.static(path.join(__dirname, 'public'))); 
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.use(express.json()); 

app.use(helmetConfig);
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false, 
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI, 
    ttl: 14 * 24 * 60 * 60 
  }),

  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use('/users', accountRouter);

app.use('/details', detailsRouter); 

mongoose.connect(process.env.MONGODB_URI);


const { SquareClient, SquareEnvironment } = require('square');

const client = new SquareClient({
  environment: SquareEnvironment.Production,
  token: process.env.PRODUCTION_SQUARE_TOKEN, 
});

const getDetails = require('./models/user.details.model').getDetails;

console.log('Running in:', process.env.NODE_ENV || 'undefined');


const upload = multer({dest: 'uploads/'}); 


app.get('/csrf-token', (req, res) => {
  req.session.initialized = true; 
  res.json({ csrfToken: generateCsrfToken(req, res) });
});


app.get('/', (req, res) => {
  res.render('home', {products}); 
});

app.get('/online-orders', (req, res) => {
  res.render('online_orders', {products}); 
});

app.get('/api/suburbs', (req, res) => {
  res.json(suburbs);
});

app.get('/cart', (req, res) => {
  const cart = req.session.cart || [];

  
  const total = cart.reduce((sum, item) =>{
    return sum + (item.price * item.quantity);
  }, 0); 

  res.render('cart', {cart: cart, total: total.toFixed(2)});
});

app.get('/cart/total', (req, res) =>{
  const cart = req.session.cart || [];
  const totalPrice = cart.reduce((sum,item) => sum + (item.price * item.quantity),0);
  const itemCount = cart.reduce((sum,item) => sum + item.quantity , 0);

  res.json({totalPrice, itemCount});
})

app.get('/api/cart' , (req, res) =>{
  res.json({cart : req.session.cart || []})
})

app.get('/login', (req, res) => {
  res.render('login', { cart: req.session.cart || [] });
});

app.get('/register', (req, res) => {
  res.render('register', { cart: req.session.cart || [] });
});

app.get('/auth/status', (req, res) => {
  try{
    let token = req.cookies['auth_token']; 
    if(token && auth.checkToken(token)){
      res.json({loggedIn: true, email: auth.checkToken(token).email});
    } else{
      res.json({loggedIn: false})
    }
  } catch (error){
    console.error('auth/status error:', error);
    res.status(500).json({error: error.message});
  }
})


app.post('/upload', upload.single('image'), async (req, res)=>{
  try{
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'products'
    });
    res.json({
      success: true,
      url: result.secure_url
    })
  } catch (error) {
      console.error('upload error:', error);
      res.status(500).json({error: 'upload failed'})
  }
})

app.post('/cart/add', doubleCsrfProtection, (req, res) =>{
  const {productId, imageURL, name, price, quantity } = req.body;

  if(!req.session.cart){
    req.session.cart = [];
  }

  const allProducts = [
  ...products.tiramisu,
  ...products.trays,
  ...products.cakes
  ];

  const item = allProducts[productId];

  if (!item) {
    return res.status(404).json({ error: 'item not found' });
  }

  const description = item.description;

  const existing = req.session.cart.find(item => item.productId === productId);
  if(existing){
    existing.quantity += quantity;
  } else {
    req.session.cart.push({productId, imageURL, name, description, price: parseFloat(price), quantity})
  }

  res.json({success: true, cart: req.session.cart});
})


app.post('/checkout', checkAuth, requireVerifiedUser, doubleCsrfProtection, async (req, res) =>{
  const {token, total } = req.body;

  const details = await getDetails.findOne({
    userId: req.user.id
  });

  try{
    if (token){
      const intTotal = parseFloat(total); 
      const response = await client.payments.create({
        sourceId: token, 
        idempotencyKey: require('crypto').randomUUID(), 
        amountMoney: {
          amount: BigInt(Math.round(parseFloat(intTotal) * 100)), 
          
          currency: 'AUD'
        },        
        locationId: process.env.PRODUCTION_LOCATION_ID, 
      })

      req.session.lastOrder = { 
        orderId: response.payment.orderId,
        createdAt: response.payment.createdAt.split('T')[0],
        last4: response.payment.cardDetails.card.last4,
        total: intTotal,
        cart: req.session.cart, 
        deliveryMethod: details.deliveryMethod  
      }

      if(response.payment){
        const mailtoUser = {
          from: '"Momento Orders" <orders@momentotiramisu.com.au>', 
          to: req.user.email, 
          subject: `Thank you for shopping with Momento!`,

          html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background-color: #fff8db;
              }
              .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
              }
              .header {
                padding: 30px 20px;
                text-align: center;
              }
              .logo {
                max-width: 200px;
                height: auto;
              }
              .content {
                padding: 20px 15px;
              }
              h1 {
                color: #4c250b;
                font-size: 24px;
                margin: 0 0 20px 0;
                text-align: center;
              }
              p {
                color: #4c250b;
                font-size: 16px;
                line-height: 1.6;
                margin: 10px 0;
                text-align: center;
              }
              .tracking-link {
                display: inline-block;
                background-color: #ffcf67;
                color: #4c250b;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
              }
              .tracking-link:hover {
                background-color: #e5ba5d;
              }
              .info-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin: 30px 0px;
                background-color: #fff;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #4c250b;
              }
              .info-table th {
                background-color: #4c250b;
                color: #ffcf67;
                padding: 15px;
                text-align: left;
                font-size: 18px;
                font-weight: bold;
              }
              .info-table td {
                padding: 12px 15px;
                border-bottom: 1px solid #4c250b;
                color: #4c250b;
                font-size: 15px;
              }
              .info-table td{
                word-break: break-word;
              }
              .info-table tr:last-child td{
                border-bottom: none;
              }
              .items-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin: 20px 0;
                background-color: #fff;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #4c250b;
                table-layout: fixed;
              }
              .items-table th {
                background-color: #ffcf67;
                color: #4c250b;
                padding: 10px 6px;
                text-align: left;
                font-weight: bold;
                border-bottom: 1px solid #4c250b;
              }
              .items-table td {
                padding: 10px 6px;
                border-bottom: 1px solid #4c250b;
                color: #4c250b;
              }
              .info-table tr:last-child td{
                border-bottom: none;
              }
              .label {
                font-weight: bold;
                width: auto;
              }
              a,
              a:link,
              a:visited,
              a:hover,
              a:active {
                color: #4c250b !important;
                text-decoration: none !important;
              }

              *[x-apple-data-detectors] {
                color: #4c250b !important;
                text-decoration: none !important;
              }

              u + #body a {
                color: #4c250b !important;
                text-decoration: none !important;
              }
              .footer {
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #4c250b;
              }
              .center-link {
                text-align: center;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <!-- Header with Logo -->
              <div class="header">
                <img src="https://res.cloudinary.com/dka765zib/image/upload/v1770177748/Mchoc_jjjfbr.png" alt="Momento Logo" class="logo">
              </div>

              <!-- Content -->
              <div class="content">
                <h1>THANKS FOR YOUR ORDER!</h1>
                <p>We're working on getting your order to you right now.</p>
                <p>We will contact you when your order is ready.</p>
                
                <table class="info-table">
                  <tr>
                    <th colspan="2">Order Details</th>
                  </tr>
                  <tr>
                    <td class="label">Order Number:</td>
                    <td>${req.session.lastOrder.orderId}</td>
                  </tr>
                  <tr>
                    <td class="label">Delivery Method:</td>
                    <td>${details.deliveryMethod}</td>
                  </tr>
                  <tr>
                    <td class="label">Order Date:</td>
                    <td>${req.session.lastOrder.createdAt}</td>
                  </tr>
                  
                </table>
                
                <table class="info-table">
                  <tr>
                    <th colspan="2">Payment Information</th>
                  </tr>
                  <tr>
                    <td class="label">Customer Email:</td>
                    <td>
                      <span style="color:#4c250b !important; text-decoration:none !important;">
                        ${req.user.email}
                      </span>
                    </td>
                  <tr>
                    <td class="label">Customer Phone Number:</td>
                    <td>${details.phone}</td>
                  </tr>
                  ${details.deliveryMethod === 'delivery' ? `
                  <tr>
                      <td class="label">Delivery Address:</td>
                      <td>
                        <span style="color:#4c250b !important; text-decoration:none !important;">
                          ${details.address}, ${details.suburb}, ${details.postcode}
                        </span>
                      </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td class="label">Payment Method:</td>
                    <td>Visa ending in ${req.session.lastOrder.last4}</td>
                  </tr>
                  <tr>
                    <td class="label">Total (AUD):</td>
                    <td style="font-weight: bold; font-size: 18px; color: #4c250b;">$${req.session.lastOrder.total}</td>
                  </tr>
                </table>


                <table class="items-table">
                  <tr>
                    <th>Item</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                  ${req.session.lastOrder.cart.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td style="text-align: center;">${item.quantity}</td>
                      <td style="text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
                      <td style="text-align: right; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>

              <!-- Footer -->
              <div class="footer">
                <p style="margin: 5px 0;">© Momento Tiramisu. All rights reserved.</p>
                <p style="margin: 5px 0;">ABN: 50129842272</p>
              </div>
            </div>
          </body>
        </html>`
        }
          

        const mailtoMomento = {
          from: '"Order Placed" <orders@momentotiramisu.com.au>', 
          to: '<orders@momentotiramisu.com.au>',
          subject: `New Order #${req.session.lastOrder.orderId} - $${req.session.lastOrder.total}`,

          html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
                background-color: #fff8db;
              }
              .email-container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                overflow: hidden;
              }
              .header {
                padding: 30px 20px;
                text-align: center;
              }
              .logo {
                max-width: 200px;
                height: auto;
              }
              .content {
                padding: 40px 30px;
              }
              h1 {
                color: #4c250b;
                font-size: 24px;
                margin: 0 0 20px 0;
                text-align: center;
              }
              p {
                color: #4c250b;
                font-size: 16px;
                line-height: 1.6;
                margin: 10px 0;
                text-align: center;
              }
              .tracking-link {
                display: inline-block;
                background-color: #ffcf67;
                color: #4c250b;
                text-decoration: none;
                padding: 12px 30px;
                border-radius: 5px;
                font-weight: bold;
                margin: 20px 0;
              }
              .tracking-link:hover {
                background-color: #e5ba5d;
              }
              .info-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin: 30px 0px;
                background-color: #fff;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #4c250b;
              }
              .info-table th {
                background-color: #4c250b;
                color: #ffcf67;
                padding: 15px;
                text-align: left;
                font-size: 18px;
                font-weight: bold;
              }
              .info-table td {
                padding: 12px 15px;
                border-bottom: 1px solid #4c250b;
                color: #4c250b;
                font-size: 15px;
              }
              .info-table td{
                word-break: break-word;
              }
              .info-table tr:last-child td{
                border-bottom: none;
              }
              .items-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin: 20px 0;
                background-color: #fff;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #4c250b;
                table-layout: fixed;
              }
              .items-table th {
                background-color: #ffcf67;
                color: #4c250b;
                padding: 10px 6px;
                text-align: left;
                font-weight: bold;
                border-bottom: 1px solid #4c250b;
              }
              .items-table td {
                padding: 10px 6px;
                border-bottom: 1px solid #4c250b;
                color: #4c250b;
              }
              .info-table tr:last-child td{
                border-bottom: none;
              }
              .label {
                font-weight: bold;
                width: auto;
              }
              a,
              a:link,
              a:visited,
              a:hover,
              a:active {
                color: #4c250b !important;
                text-decoration: none !important;
              }
              *[x-apple-data-detectors] {
                color: #4c250b !important;
                text-decoration: none !important;
              }
              u + #body a {
                color: #4c250b !important;
                text-decoration: none !important;
              }
              .alert {
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .footer {
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #4c250b;
              }
              .center-link {
                text-align: center;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <!-- Header with Logo -->
              <div class="header">
                <img src="https://res.cloudinary.com/dka765zib/image/upload/v1770177748/Mchoc_jjjfbr.png" alt="Momento Logo" class="logo">
              </div>
              <div class="content">
                <h1>NEW ORDER RECEIVED!</h1>
                
                <div class="alert">
                  <p><strong>A new order has been successfully placed on momentotiramisu.com.au</strong></p>
                </div>

                <table class="info-table">
                  <tr>
                    <th colspan="2">Order Details</th>
                  </tr>
                  <tr>
                    <td class="label">Order Number:</td>
                    <td>${req.session.lastOrder.orderId}</td>
                  </tr>
                  <tr>
                    <td class="label">Delivery Method:</td>
                    <td>${details.deliveryMethod}</td>
                  </tr>
                  <tr>
                    <td class="label">Order Date:</td>
                    <td>${req.session.lastOrder.createdAt}</td>
                  </tr>
                </table>

                <table class="info-table">
                  <tr>
                    <th colspan="2">Payment Information</th>
                  </tr>
                  <tr>
                    <td class="label">Customer Email:</td>
                    <td>
                      <span style="color:#4c250b !important; text-decoration:none !important;">
                        ${req.user.email}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td class="label">Customer Phone Number:</td>
                    <td>${details.phone}</td>
                  </tr>
                  ${details.deliveryMethod === 'delivery' ? `
                  <tr>
                    <td class="label">Delivery Address:</td>
                    <td>
                      <span style="color:#4c250b !important; text-decoration:none !important;">
                        ${details.address}, ${details.suburb}, ${details.postcode}
                      </span>
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td class="label">Payment Method:</td>
                    <td>Visa ending in ${req.session.lastOrder.last4}</td>
                  </tr>
                  <tr>
                    <td class="label">Total (AUD):</td>
                    <td style="font-weight: bold; font-size: 18px; color: #4c250b;">$${req.session.lastOrder.total}</td>
                  </tr>
                </table>

                <table class="items-table">
                  <tr>
                    <th>Item</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                  ${req.session.lastOrder.cart.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td style="text-align: center;">${item.quantity}</td>
                      <td style="text-align: right;">$${parseFloat(item.price).toFixed(2)}</td>
                      <td style="text-align: right; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </table>
              </div>
          
              <div class="footer">
                <p style="margin: 5px 0;">ABN: 50129842272</p>
                <p style="margin: 5px 0;">© Momento Tiramisu. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>`
        }


        res.status(200).json(JSON.parse(JSON.stringify(response, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        )));
        
        transporter.sendMail(mailtoUser, (error, info) => {
            if (error) {
                console.error("Error occurred:", error);
            } else {
                console.log("Email sent successfully!");
            }
        });
        
        transporter.sendMail(mailtoMomento, (error, info) => {
          if (error) {
              console.error("Error occurred:", error);
          } else {
              console.log("Email sent successfully!");
          }
        });
      }

      

    }
  } catch(e){
    console.error('checkout error:', e);
    res.status(500).json(e.errors)
  }
}) 

app.get('/confirmation', (req, res) => {
  const order = req.session.lastOrder; 
  if(!order){
    res.status(404).render('404', { title: 'Page Not Found' })
  }
  req.session.cart = []; 
  res.render('confirmation', {order}); 
});

app.put('/cart/update', doubleCsrfProtection, (req, res) =>{
  const {productId, quantity } = req.body;

  if(!req.session.cart){
    return res.status(404);
  }
  
  const item = req.session.cart.find(item => item.productId === productId);
  if (item) {
        if (quantity <= 0) {
            req.session.cart = req.session.cart.filter(i => i.productId !== productId);
        } else {
            item.quantity = quantity;
        }
        res.json({ success: true, cart: req.session.cart });
    } else {
        res.status(404).json({ error: 'Item not found' });
    }
})

app.delete('/cart/remove/:productId', doubleCsrfProtection, (req,res) =>{
  const {productId} = req.params;

  
  if(!req.session.cart){
    res.status(404).json({ error: 'Cart empty' });
  }

  req.session.cart = req.session.cart.filter(i => i.productId !== parseInt(productId));
  res.json({success:true, cart: req.session.cart});
})


app.delete('/cart/clear', doubleCsrfProtection, (req, res) => {
  req.session.cart = [];
  res.redirect('/online-orders');
});



app.listen(process.env.PORT, () => {
    console.log(`Server running at ${process.env.BASE_URL}`); 
});