const helmet = require("helmet");

const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: [ "'self'" ],
            scriptSrc: [ "'self'", "https://code.jquery.com", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://sandbox.web.squarecdn.com", "https://web.squarecdn.com", "https://cdnjs.cloudflare.com", "https://maps.googleapis.com", "https://pay.google.com" ],
            styleSrc: [ "'self'", "'unsafe-inline'", "https://code.jquery.com", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://sandbox.web.squarecdn.com", "https://web.squarecdn.com", "https://cdnjs.cloudflare.com" ],
            imgSrc: [ "'self'", "data:", "https://res.cloudinary.com", "https://*.tile.openstreetmap.org", "https://unpkg.com", "https://sandbox.web.squarecdn.com", "https://web.squarecdn.com", "https://maps.gstatic.com", "https://www.gstatic.com" ],
            mediaSrc: [ "'self'", "https://res.cloudinary.com" ],
            fontSrc: [ "'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "https://square-fonts-production-f.squarecdn.com", "https://d1g145x70srn7h.cloudfront.net", "https://cash-f.squarecdn.com", ],
            connectSrc: [ "'self'", "https://sandbox.web.squarecdn.com", "https://pci-connect.squareupsandbox.com", "https://*.squareup.com", "https://*.squareupsandbox.com", "https://web.squarecdn.com", "https://connect.squareup.com", "https://maps.googleapis.com", "https://google.com", "https://www.google.com", "https://pay.google.com", "https://*.apple-pay.apple.com", "https://apple-pay-gateway.apple.com" ],
            frameSrc: [ "'self'", "https://sandbox.web.squarecdn.com", "https://web.squarecdn.com", "https://pay.google.com", "https://*.squareup.com", "https://*.squareupsandbox.com", "https://apple-pay-gateway.apple.com" ]
        }
    }
});

module.exports = helmetConfig;