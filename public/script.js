
const currentPage = document.body.getAttribute('data-page');
const textSlider = document.querySelector('.text-slider');
const trayTextSlider = document.querySelector('.tray-text-slider');
const signInForm = document.querySelector('.sign-in-form');
const registerForm = document.querySelector('.register-form');
const isMobile = window.matchMedia('(max-width: 800px)'); 


window.initAddressAutocomplete = function() {
    const addressInput = document.querySelector('#address');
    if(!addressInput) return;
    
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.warn("Google Maps API blocked. Falling back to native browser input.");
        addressInput.setAttribute('autocomplete', 'street-address');
        return; 
    }

    try{ 
        const sydneyBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(-33.9700, 150.9200), 
            new google.maps.LatLng(-33.8300, 151.2800) 
        );

        const options = {
            bounds: sydneyBounds,
            componentRestrictions: { country: "au" },
            fields: ["address_components"],
            strictBounds: true 
        };

        const autocomplete = new google.maps.places.Autocomplete(addressInput, options);
        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place.address_components) return;

            let streetNumber = "";
            let streetName = "";

            place.address_components.forEach(component => {
                const types = component.types;
                if (types.includes("street_number")) {
                    streetNumber = component.long_name; 
                }
                if (types.includes("route")) {
                    streetName = component.long_name;
                }
            });

            if (streetNumber && streetName) {
                addressInput.value = `${streetNumber} ${streetName}`;
            } else if (streetName) {
                addressInput.value = streetName;
            }
        });
    } catch (error) {
        console.error("Runtime error during autocomplete setup:", error);
        addressInput.setAttribute('autocomplete', 'street-address');
    }
}


document.addEventListener('DOMContentLoaded', () =>{

    if(currentPage === 'home'){
        AOS.init();

        const btnContainer =  document.querySelector('.btns-container');
        const btnOne = document.querySelector('.btn-1');
        const btnTwo = document.querySelector('.btn-2');
        
        const buttons = [btnOne, btnTwo]; 

        const imageSlider = document.querySelector('.image-slider');        
        const traySlider = document.querySelector('.tray-slider');
        const sliders = [imageSlider, textSlider, traySlider, trayTextSlider]; 


        const arrowGroups = document.querySelectorAll('.image-arrows, .tray-arrows'); 

        let imageSwiper = null;
        let textSwiper = null;
        let trayImageSwiper = null;
        let trayTextSwiper = null;
        
        history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);

        hideAllSliders();
        arrowGroups.forEach(a=> a.classList.add('is-hidden'));
        const productTitle = document.querySelector('.products-title')
        productTitle.classList.add('is-hidden');
        buttons.forEach((btn) => {  
            btn.addEventListener('click', ()=>{
                productTitle.classList.remove('is-hidden');
            })
        })
        
        function updateContainer(){
            btnContainer.style.flexDirection = 'row';
            btnContainer.style.height = '10rem';
            btnContainer.style.width = '96%';
            btnContainer.style.gap = '1.5rem';
            
            buttons.forEach(btn => { 
                if(btn.style.display !== 'none'){ 
                    btn.style.fontSize = isMobile.matches ? '1.4rem' : '2rem';
                }
            })
            
        }

        function hideButtons(clicked) {
            buttons.forEach(b => {
                b.style.display = b === clicked ? 'none' : 'block';
            });
        }

        function hideAllSliders() {
            sliders.forEach(s => s.classList.add('is-hidden'));
        }

        function showSliders(...active) {
            hideAllSliders();
            active.forEach(s => s.classList.remove('is-hidden'));
        }

        function showArrows(type) {
            arrowGroups.forEach(a => a.classList.add('is-hidden'));
            document.querySelector(`.${type}-arrows`).classList.remove('is-hidden');
        }


        btnOne.addEventListener('click', ()=> {
            hideButtons(btnOne);
            showSliders(imageSlider, textSlider);
            showArrows('image');
            updateContainer();

            if(!imageSwiper){
                imageSwiper = new Swiper('.image-slider', {
                    grabCursor: true,
                    speed: 900,
                    slidesPerView: isMobile.matches ? 1 : 3,
                    spaceBetween: 30,
                    centeredSlides: true,
                    mousewheel: true,
                    allowTouchMove: false,       
                    navigation: {
                        nextEl: '.image-next',
                        prevEl: '.image-prev',
                    },
                });
                textSwiper = new Swiper('.text-slider', {
                    centeredSlides: true,
                    slidesPerView: 1,
                    speed: 900,
                    allowTouchMove: false,
                });
                imageSwiper.controller.control = textSwiper;
                textSwiper.controller.control = imageSwiper;
            } else {
                imageSwiper.update();
                textSwiper.update();
            }
        })

        btnTwo.addEventListener('click', ()=> {
            hideButtons(btnTwo);
            showSliders(traySlider, trayTextSlider);
            showArrows('tray');
            updateContainer();

            if(!trayImageSwiper){
                trayImageSwiper = new Swiper('.tray-slider', {
                    grabCursor: true,
                    speed: 900,
                    slidesPerView: isMobile.matches ? 1 : 3,
                    spaceBetween: 30,
                    centeredSlides: true,
                    mousewheel: true,
                    allowTouchMove: false,
                    navigation: { nextEl: '.tray-next', prevEl: '.tray-prev' }
                });
                trayTextSwiper = new Swiper('.tray-text-slider', {
                    centeredSlides: true,
                    slidesPerView: 1,
                    speed: 900,
                    allowTouchMove: false,
                });
                trayImageSwiper.controller.control = trayTextSwiper;
                trayTextSwiper.controller.control = trayImageSwiper;
            } else {
                trayImageSwiper.update();
                trayTextSwiper.update();
            }
        });

        const backgroundSection = document.querySelector('.background');
        const fade = document.querySelector('.page-fade');
        if(fade){
            requestAnimationFrame(() => fade.classList.add('loaded'));
        }


        let heroInvisible = true;
        const observer = new IntersectionObserver(
            ([entry]) => {
                heroInvisible = entry.isIntersecting; 
            },
            {
                threshold: 0.1 
            }
        )
        observer.observe(backgroundSection);

        window.addEventListener('scroll', () => {
            if(!heroInvisible) return; 

            const scrollY = window.scrollY;

            const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

            let progress = Math.min(scrollY / scrollableHeight, 1);

            document.documentElement.style.setProperty('--scroll-progress', progress); 

            if(progress > 0.3){  
                backgroundSection.classList.add('fade-out');
            } else{
                backgroundSection.classList.remove('fade-out');
                backgroundSection.classList.remove('hidden'); 
            }
            if(progress > 1) observer.disconnect();
            
        }, {passive : true});
    }

    const csrfTokenPromise = fetch('/csrf-token')
        .then(res => res.json())
        .then(data => data.csrfToken);

    function getCsrfToken() {
        return csrfTokenPromise;
    }
        
    async function updateCartBadge() {
        try{
            const response = await fetch('/cart/total');
            const data = await response.json();

            const cartBadge = document.querySelector('.cart-badge');
            if(cartBadge){
                cartBadge.textContent = data.itemCount;
                cartBadge.style.display = data.itemCount > 0 ? 'block' : 'none';                
            }
        } catch (error) { error }
    }

    updateCartBadge();
    
    const navbar = document.querySelector('.navbar');
    const navSlide = document.querySelector('.nav-list-side');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    if(navbar || navSlide || hamburgerMenu){
        function removeClass(){
            navSlide.style.transition = 'none';
            navbar.classList.remove('change');
            requestAnimationFrame(() => navSlide.style.transition = 'all 0.9s ease-in-out');
        }

        hamburgerMenu.addEventListener('click', () => {
            navbar.classList.toggle('change');
        })


        document.querySelectorAll('.nav-list-side a').forEach(link => {
            link.addEventListener('click', removeClass)
        })


        document.addEventListener('click', (e) => {
            if(!navbar.contains(e.target)){
                removeClass();
            }
        })

        const productCards = document.querySelectorAll('.products-container .product-card');

        if(!isMobile.matches){
        
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.style.animation = `fading-in 1s forwards`;
                        }, index * 200);
                        
                        observer.unobserve(entry.target); 
                    }
                });
            }, {
                threshold: 0.2 
            });
            productCards.forEach((card, index) => {
                observer.observe(card); 
                
                card.style.opacity = '0';
                card.style.transform = 'scale(0)';
            })
        }
        

        productCards.forEach((card, index) => {

            if(isMobile.matches){
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            }

            const addBtn = card.querySelector('.add-btn');
            const plusBtn = card.querySelector('.plus');
            const minusBtn = card.querySelector('.minus');
            const numberBtn = card.querySelector('.number');


            const cardTitle = card.querySelector('.card-title').textContent.trim();
            const [productName, priceText] = cardTitle.split(':');
            const productPrice = priceText.replace('$', '').trim();

            let quantity = 0; 
            addBtn.disabled = true;


            plusBtn.addEventListener('click' , () =>{
                quantity++;
                numberBtn.textContent = quantity;
                addBtn.disabled = false;
                minusBtn.disabled = false;
            })

            minusBtn.addEventListener('click' , () =>{
                if(quantity > 0 ){ 
                    quantity--;
                    numberBtn.textContent = quantity;

                    if(quantity===0){
                        addBtn.disabled = true;
                        minusBtn.disabled = true;
                    }
                } 
            })

            addBtn.addEventListener('click', async() =>{
                try{
                    const csrfToken = await getCsrfToken();
                    const response = await fetch('/cart/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-csrf-token': csrfToken
                        },
                        body: JSON.stringify({
                            productId: index, 
                            imageURL: card.querySelector('img').src,
                            name: productName.trim(),
                            price: productPrice,
                            quantity: quantity
                        })
                    })

                    const data = await response.json();

                    if(data.success){
                        addBtn.textContent = 'Added to cart';

                        setTimeout(() => {
                            addBtn.textContent = 'Add to cart';
                        }, 1000);

                        quantity = 0;
                        numberBtn.textContent = 0;
                        addBtn.disabled = true; 
                        
                        updateCartBadge();
                    }
                } catch (error){
                    console.error('Error adding to cart:', error);
                }
            })
        })        
        
        const userLogin = document.querySelector('.user-login');
        if(userLogin){
            const popUp = document.createElement('div');
            popUp.classList.add('user-popup');
            userLogin.after(popUp);
            const block = document.createElement('div');
            block.classList.add('login-container');

            let csrfToken = null;

            fetch('/auth/status').then(response => response.json())
            .then(data => { 
                if(data.loggedIn){
                    const title = document.createElement('h2');
                    title.textContent = 'Hello!'
                    const email = document.createElement('p');
                    email.classList.add('email-text');
                    email.textContent = data.email.split('@')[0];

                    const detailsContainer = document.createElement('div');
                    detailsContainer.classList.add('details-container');
                    
                    const iconDetails = document.createElement('i');
                    iconDetails.classList.add('fas','fa-user-pen');
                    
                    const details = document.createElement('a');
                    details.href = '/details';
                    details.classList.add('details');
                    details.textContent = 'My Details';
                    
                    
                    const logOut = document.createElement('button');
                    logOut.textContent = 'Logout';
                    logOut.addEventListener('click', () => {
                        window.location.href = '/users/logout';
                    });
                    popUp.append(block);
                    block.append(title, email, detailsContainer, logOut);

                } else {
                    const text = document.createElement('p');
                    text.classList.add('text-user')
                    text.textContent = "Log in"

                    const loginBtn = document.createElement('button');
                    loginBtn.textContent = 'Login';
                    loginBtn.addEventListener('click', () => {
                        window.location.href = '/login';
                    });

                    const createText = document.createElement('p');
                    createText.classList.add('text-user')
                    createText.textContent = "Or \n Create an Acocunt"
                    const registerBtn = document.createElement('button');
                    registerBtn.addEventListener('click', () => {
                        window.location.href = '/register';

                    });            
                    registerBtn.textContent = 'Register';

                    popUp.append(block);
                    block.append(text, loginBtn, createText, registerBtn);
                }
            })

            userLogin.addEventListener('click', (e) => {   
                e.stopPropagation(); 
                
                popUp.style.display = popUp.style.display === 'block' ? 'none' : 'block';
            })
            document.addEventListener('click', () => {   
                popUp.style.display = 'none';
            })
            window.onload = popUp.style.display = 'none'; 
        }
    }

    if(currentPage === 'cart' || currentPage === 'details'){
        const cartContainers = document.querySelectorAll('.cart-container');
        const cartProducts = document.querySelector('.cart-products');
        const checkoutDiv = document.querySelector('.checkout-section');
        const paymentOptions = document.querySelector('.payment-options');
        const cartList = document.querySelector('.cart-list')
        
        function applyDeliveryFee(){
            const addDelivery = document.querySelector('.add-delivery');
            if(!addDelivery) return; 
            addDelivery.textContent = '';  

            const totalEl = document.querySelector('.total-amount');
            if(!totalEl) return;

            const total = totalEl.dataset.baseTotal;
            
            if(currentPage !== 'details') return;

            if(parseFloat(total) === 0){
                addDelivery.textContent = '';
                cartList.classList.add('is-hidden');
                paymentOptions.classList.add('is-hidden');
                document.querySelector('.payments-btn').classList.add('is-hidden');
                document.querySelector('.payment-text').textContent = 'No payment options available'
                document.querySelector('.text-muted').textContent = 'Your cart is empty'
                document.querySelector('.place-order').style.display = 'none';
                document.getElementById('card-container').style.display = 'none';   
                return 0; 
            }
            
            if(parseFloat(total) >= 100){
                const deliveryFee = document.createElement('span');
                deliveryFee.classList.add('delivery-fee');
                deliveryFee.textContent = 'Delivery Fee (AUD)';
                const deliveryAmount = document.createElement('p');
                deliveryAmount.classList.add('total-fee');
                deliveryAmount.textContent = '$15.00';
                addDelivery.append(deliveryFee, deliveryAmount)
                
                const deliveryLabel = document.querySelector('.delivery')
                if(deliveryLabel) deliveryLabel.style.opacity = '1'; 

                const deliveryInput = document.querySelector('.delivery input[type="radio"]');
                const isDelivery = deliveryInput && deliveryInput.checked;
                const finalTotal = isDelivery ? parseFloat(total) + 15 : parseFloat(total); 
                totalEl.textContent = `$${finalTotal.toFixed(2)}`; 
                
                return finalTotal;

            } else {
                const pickUp = document.createElement('span');
                pickUp.classList.add('pick-up');
                pickUp.textContent = `You are only eligible for pick up`;
                const finalTotal = parseFloat(total);
                addDelivery.appendChild(pickUp);
                document.querySelector('.collection-options').style.visibility = 'visible';
                document.querySelector('.add-delivery').style.visibility = 'visible';
                document.querySelector('.add-no-options').style.visibility = 'hidden';

                const deliveryLabel = document.querySelector('.delivery')
                if(deliveryLabel) deliveryLabel.style.opacity = '0';    
                                
                totalEl.textContent = `${finalTotal.toFixed(2)}`; 
                
                return finalTotal; 
            }
            
        }

        if(currentPage === 'details'){
            
            document.querySelector('.delivery input[type="radio"]').addEventListener('change', (event) =>{
                if(event.target.checked){
                    updateTotalSquare();
                }
            })
            document.querySelector('.pick-up input[type="radio"]').addEventListener('change', (event) =>{
                if(event.target.checked){
                    updateTotalSquare();
                }
            })
        }


        let paymentRequest = null; 
        
    
        async function initializeSquare() {
            const appId = document.querySelector('#appId').value;
            const locationId = document.querySelector('#locationId').value;
            const payments = await Square.payments(appId, locationId);

            let suburbsData = [];

            await loadSuburbsArray();
            validateSuburb();

            const cardOptions = {
                postalCode: 'false', 
                style:{
                    input: {
                        backgroundColor: 'white'
                    }
                }
            }

            const finalTotal = applyDeliveryFee(); 

            const totalWithSquareFee = parseFloat((finalTotal * 1.022).toFixed(2));
            
            async function processPayment(token){
                const finalTotal = applyDeliveryFee(); 
                
                const totalWithSquareFee = parseFloat((finalTotal * 1.022).toFixed(2));

                const deliveryInput = document.querySelector('.delivery input[type="radio"]');
                const deliveryMethod = deliveryInput && deliveryInput.checked ? 'delivery' : 'pick-up';
                
                const csrfToken = await getCsrfToken();
                await fetch('/details', {
                    method: 'POST',
                    headers: {
                        'Content-type' : 'application/json',
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({
                        address: document.querySelector('#address').value.trim(),
                        suburb: document.querySelector('#suburb').value.trim(),
                        postcode: document.querySelector('#postcode').value.trim(),
                        phone: document.querySelector('#phoneNumber').value.trim(),
                        deliveryMethod: deliveryMethod
                    }) 
                }) 
                await fetch('/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-type' : 'application/json',
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({token, total: totalWithSquareFee}) 
                }).then((response) => response.json())
                .then(data => {
                    if(data.payment.status === 'COMPLETED'){
                        window.location.href = '/confirmation'; 
                    }
                })
            }

            function validateFields(){
                const country = document.querySelector('#country').value;
                const city = document.querySelector('#city').value;
                const suburb = document.querySelector('#suburb').value.trim();
                const postCode = document.querySelector('#postcode').value.trim();
                const address = document.querySelector('#address').value.trim();

                const name = document.querySelector('#fullName').value.trim();
                const validateName = (name) => { 
                    const regexName = /^[a-zA-Z\s'\-À-ÿ]{2,100}$/;
                    return regexName.test(name)
                }

                const phone = document.querySelector('#phoneNumber').value.trim();
                const validatePhone = (phoneStr) => {
                    try {
                        const phoneUtil = window.libphonenumber.PhoneNumberUtil.getInstance();
                        const parsedNumber = phoneUtil.parseAndKeepRawInput(phoneStr, 'AU');
                        
                        return phoneUtil.isPossibleNumber(parsedNumber) && phoneUtil.isValidNumber(parsedNumber);
                    } catch (error) {
                        return false; 
                    }
                };
                
                const validMatch = suburbsData.find(s =>
                    s.suburb.toUpperCase() === suburb.toUpperCase()
                    && String(s.postcode) === postCode
                )


                if(!validateName(name) || !validatePhone(phone) || !address || !country || !city || !validMatch ){
                    const inputs = document.querySelectorAll('.form-control[type="text"], .custom-select');
                    inputs.forEach(input =>{
                        input.classList.add('red');
                    })
                    return false; 
                } else {
                    const inputs = document.querySelectorAll('.form-control[type="text"], .custom-select');
                    inputs.forEach(input =>{
                        input.classList.remove('red');
                    })
                }
                return true;
            }

            async function loadSuburbsArray () {
                try{
                    const res = await fetch('/api/suburbs');
                    suburbsData = await res.json();
                } catch (err){ err }
            }

            function validateSuburb(){
                const suburbInput = document.querySelector('#suburb');
                const postcodeInput = document.querySelector('#postcode');
                const suburbsSuggestion = document.querySelector('#suburbSuggestions');

                suburbInput.addEventListener('input', () => {
                    const typed = suburbInput.value.trim().toUpperCase();
                    suburbsSuggestion.textContent = '';
                    
                    const matches = suburbsData.filter(s => s.suburb.toUpperCase().startsWith(typed));

                    if(!typed || matches.length === 0){
                        suburbsSuggestion.style.display = 'none';
                        return;
                    }
                    
                    matches.forEach(match => {
                        const divdrop = document.createElement('div');
                        divdrop.classList.add('suburb-option');
                        divdrop.textContent = `${match.suburb}`

                        divdrop.addEventListener('click', () =>{
                            suburbInput.value = match.suburb;
                            postcodeInput.value = match.postcode;
                            suburbsSuggestion.textContent = '';
                            suburbsSuggestion.style.display = 'none';
                        })
                        suburbsSuggestion.append(divdrop);
                    })
                    suburbsSuggestion.style.display = 'block';
                })

                document.addEventListener('click', (e) => {
                    if (e.target !== suburbInput) {
                        suburbsSuggestion.style.display = 'none';
                    }
                });
            }

            try{
                const placeOrder = document.querySelector('.place-order');
                placeOrder.style.display = 'none';
                const card = await payments.card(cardOptions);
                await card.attach('#card-container');
                const cardBtn = document.querySelector('.pay-button')
                document.getElementById('card-container').style.display = 'none';

                const paymentBtns = document.querySelector('.payments-btn');
                const confirmModal = document.querySelector('#confirmModal');
                const btnConfirm = document.querySelector('#proceedBtn');
                const btnCancel = document.querySelector('#cancelBtn');

            
                paymentBtns.addEventListener('click', async (e) =>{
                    e.preventDefault();
                    e.stopPropagation()

                    if(!validateFields()) return;

                    confirmModal.showModal();

                    const controller = new AbortController();
                    
                    const { signal } = controller;
                    
                    const isConfirmed = await new Promise((resolve) => {
                        btnConfirm.addEventListener('click', (e) => {
                            e.preventDefault();
                            controller.abort();
                            document.querySelector('.payment-options').classList.remove('is-hidden');
                            document.querySelector('.payments-btn').classList.add('is-hidden');
                            resolve(true);
                        }, { once: true, signal });

                        btnCancel.addEventListener('click', (e) => {
                            e.preventDefault();
                            controller.abort();
                            document.querySelector('.payments-btn').classList.add('is-hidden');
                            document.querySelector('.payment-options').classList.add('is-hidden');
                            document.querySelector('.payment-text').textContent = 'No payment options available';
                            resolve(false);
                        }, { once: true, signal });                            
                    });
                    

                    confirmModal.close()
                })
            

                cardBtn.addEventListener('click', (e) => {
                    e.preventDefault(); 
                    if(!validateFields()) return;
                    document.getElementById('card-container').style.display = 'block';
                    placeOrder.style.display = 'block';
                })
                
                paymentRequest = payments.paymentRequest({
                    total: {
                        amount: String(totalWithSquareFee),
                        label: 'Total'
                    },
                    countryCode: 'AU',
                    currencyCode: 'AUD'
                });

                const googlePay = await payments.googlePay(paymentRequest, {
                    buttonType: 'short',
                    buttonColor: 'white'
                });
                await googlePay.attach('#google-pay');

                try{
                    if(window.ApplePaySession){
                        const applePay = await payments.applePay(paymentRequest, {
                            buttonType: 'short',
                            buttonColor: 'white'
                            });
                        await applePay.attach('.apple-pay-button');
                    }
                } catch (e){
                    console.error('Apple Pay unavailable:', e);
                }


                function dryPayment(token) {
                    document.getElementById('card-container').style.display = 'none';
                    placeOrder.style.display = 'none';
                    if(!validateFields()) return;
                    processPayment(token); 
                }

                const googlePayBtn = document.getElementById('google-pay');
                googlePayBtn.addEventListener('click', async () => {
                    if(!validateFields()) return;
                    const results = await googlePay.tokenize();
                    dryPayment(results.token); 
                })

                const applePayBtn = document.querySelector('.apple-pay-button');
                applePayBtn.addEventListener('click', async () => {
                    if(!validateFields()) return;
                    const results = await applePay.tokenize();
                    dryPayment(results.token);
                })
                
                placeOrder.addEventListener('click', async (e) => {
                    e.preventDefault(); 
                    const results = await card.tokenize();
                    
                    processPayment(results.token);                    
                })
                
            } catch(e){
                console.error(e);
            }
        }
        
        if(currentPage === 'details'){
            initializeSquare();
        }
        

        if(currentPage === 'cart'){
            const itemCount = document.querySelectorAll('.cart-container').length;
            checkoutDiv.style.display = itemCount === 0 ? 'none' : 'block';
        

            function displayEmptyTitle(){
                const itemCount = document.querySelectorAll('.cart-container').length;
                
                if(itemCount === 0 && !document.querySelector('.empty-title')){
                    const emptyTitle = document.createElement('h1');
                    emptyTitle.classList.add('empty-title');
                    emptyTitle.textContent = 'Your Cart is empty';
                    const linkOrders = document.createElement('button');
                    linkOrders.classList.add('empty-btn');
                    linkOrders.addEventListener('click', () => {
                        window.location.href = '/online-orders';
                    }); 
                    linkOrders.textContent = 'go to online orders';
                    document.querySelector('.toggle-section').append(emptyTitle,linkOrders);

                    requestAnimationFrame(() => {
                        document.querySelector('.toggle-section').classList.add('empty-state');
                    });
                }
            }

            function updateCartDisplay(){
                const currentItemCount = document.querySelectorAll('.cart-container').length;
                if (cartProducts) {
                    if (currentItemCount === 0) {                        
                        cartProducts.style.display = 'none';
                        displayEmptyTitle();
                        document.querySelector('.toggle-section').classList.add('empty-state');
                    } else{
                        cartProducts.style.display = 'flex';
                        document.querySelector('.toggle-section').classList.remove('empty-state');
                    }
                }
            }

            displayEmptyTitle();
            updateCartDisplay();

            const checkOutBtn = document.querySelector('.checkout-btn');
            checkOutBtn.addEventListener('click', async () =>{
                const res = await fetch('/auth/status');
                const data = await res.json();

                if(data.loggedIn){
                    window.location.href = '/details';
                }else{
                    window.location.href = '/login?redirect=details'; 
                }
            })
        }

        const shoppingBtn = document.querySelector('.shopping-btn');
        shoppingBtn.addEventListener('click', () => {
            window.location.href = '/online-orders';
        })

        cartContainers.forEach((container) =>{

            const productId = parseInt(container.dataset.id);
            const numberBtn = container.querySelector('.number');
            const plusBtn = container.querySelector('.plus');
            const button = container.querySelector('.trash'); 
            
            const subTotalEl = container.querySelector('.item-price'); 
            const totalPriceContainer = parseFloat(container.dataset.price); 
            
            let quantity = parseInt(numberBtn.textContent);

            function updateButton() {
                button.textContent = '';

                if (quantity > 1) {
                    button.textContent = '-';
                    button.classList.add('minus');
                    button.classList.remove('trash');
                } else {
                    const icon = document.createElement('i');
                    icon.classList.add('fas', 'fa-trash');
                    button.appendChild(icon);
                    button.classList.remove('minus');
                    button.classList.add('trash');
                }
                subTotalEl.textContent = `$ ${(totalPriceContainer * quantity).toFixed(2)}`;      
                     
            }

            button.addEventListener('click', async () => {
                if (button.classList.contains('minus')) {
                    quantity--; 
                    numberBtn.textContent = quantity;
                    await updateCart(productId, quantity);
                    updateButton();
                } else if (button.classList.contains('trash')) {
                    await removeItem(productId, container);
                    
                }
            });
            
            plusBtn.addEventListener('click', async () => {
                quantity++;
                numberBtn.textContent = quantity;
                await updateCart(productId, quantity);
                updateButton();
            });

            updateButton();
        })

        function updateTotalSquare(){
           
            const updateTotal = applyDeliveryFee(); 
            const updateTotalWithFee = parseFloat(updateTotal * 1.022).toFixed(2);
            if(paymentRequest){
                paymentRequest.update({
                    total: {amount: String(updateTotalWithFee), label: 'Total'}
                })
            }
        }
        async function updateCart(productId, quantity){
            const csrfToken = await getCsrfToken();
            await fetch('/cart/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken
                },
                body: JSON.stringify({productId, quantity})
            })
            
            await refreshCartUI();  

            if(currentPage === 'details'){
                updateTotalSquare();
            }
        }


        async function removeItem(productId, container) {
            const csrfToken = await getCsrfToken();
            await fetch(`/cart/remove/${productId}`, {
                method: 'DELETE',
                headers: {
                    'x-csrf-token': csrfToken
                },
            });

            container.remove(); 

            await refreshCartUI(); 

            if(currentPage === 'cart'){
                displayEmptyTitle(); 
            }
            if(currentPage === 'details'){
                updateTotalSquare(); 
            }
        }


        async function refreshCartUI() {
            const response = await fetch('/cart/total');
            const data = await response.json();

            const totalAmount = parseFloat(data.totalPrice);
            const totalEl = document.querySelector('.total-amount');
            totalEl.dataset.baseTotal = totalAmount.toFixed(2);
            totalEl.textContent = totalAmount.toFixed(2);
            updateCartBadge();

            if(currentPage === 'cart'){
                const itemCount = document.querySelectorAll('.cart-container').length;
                checkoutDiv.style.display = itemCount === 0 ? 'none' : 'block';
                
                updateCartDisplay(); 
            }
        }
    }


    if(currentPage === 'login' || currentPage === 'register'){
        const swiper = new Swiper(".mySwiperLogin", {
            loop: true,
            slidesPerView: 1,
            spaceBetween: 10,
            effect: 'fade',
            fadeEffect: {
                crossFade: true 
            },
            speed: 800,
            autoplay:{
                delay: 2000,
                disableInteraction: false,
            },
            pagination: {
                el: ".swiper-pagination",
                clickable: true,
            },
        });

        if(isMobile.matches){
            document.querySelector('.swiperlogin').style.display = 'none';
        }

        const toggles = document.querySelectorAll('.toggle-password');

        toggles.forEach((toggle) => {  
            toggle.addEventListener('click', function () {
                const password = this.previousElementSibling; 

                const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
                password.setAttribute('type', type);
                
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            });
        })
        

        const urlParams = new URLSearchParams(window.location.search); 
        if(urlParams.get('verified') === 'true'){
            Toastify({
                text: "Thanks for verifying your email! You can now log in.",
                duration: 3000,
                gravity: "top",
                position: "center",
                className: "custom-toast",
                backgroundColor: "#fff8db",
            }).showToast();
        }

        if(signInForm){
            
            signInForm.addEventListener('submit', async function(e){
                e.preventDefault();

                const existingMsg = document.querySelector('.sorry-msg');
                if(existingMsg) existingMsg.remove();

                const email = document.querySelector('#sign-in-email').value;
                const password = document.querySelector('#sign-in-password').value;

                const rememberMe = document.querySelector('#signCheckbox').checked;
                

                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect'); 
                
                const csrfToken = await getCsrfToken();
                fetch('/users/login', {
                    method: 'POST',
                    headers: {
                        'Content-type' : 'application/json',
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({email, password, rememberMe, redirect}) 
                }).then((response) => response.json())
                .then((data) => {
                    const redirectURL = data.redirectURL; 

                    if(redirectURL){ 
                        window.location.href = redirectURL;
                    } else {
                        const sorryMsg = document.createElement('h4');
                        sorryMsg.classList.add('sorry-msg');
                        sorryMsg.textContent = 'Sorry, this does not match our records. Check your spelling and try again.'
                        document.querySelector('.input-container').after(sorryMsg);
                    }
                });
            })

            const forgotPasw = document.querySelector('.forgot-pasw');
            const forgotModal = document.querySelector('#forgotModal');
            const resetPasw = document.querySelector('#resetPasw');
            const dialogBox = document.querySelector('.dialog-box');

            forgotPasw.addEventListener('click', (e) => {
                e.preventDefault();
                const email = document.querySelector('#sign-in-email').value.trim();

                if(!email){
                    document.querySelector('#sign-in-email').classList.add('red');
                    return;
                }
                forgotModal.showModal(); 
            })

            resetPasw.addEventListener('click', async function(e){
                e.preventDefault();
                const email = document.querySelector('#sign-in-email').value.trim();

                dialogBox.textContent = '';
                dialogBox.textContent = `Sending password reset email...`;
                dialogBox.style.lineHeight = '2';
                
                try{
                    const csrfToken = await getCsrfToken();
                    const response = await fetch('/users/forgot-password', {
                        method: 'POST',
                        headers: {
                            'Content-type': 'application/json',
                            'x-csrf-token' : csrfToken
                        },
                        body: JSON.stringify({email})                     
                    })
                    if(!response.ok){
                        throw new Error();
                    }

                    dialogBox.textContent = `We've sent a password reset link to your email.\nPlease check your inbox and follow the instructions to secure your account.`;
                    dialogBox.style.lineHeight = '2';

                    setTimeout(() =>{
                        window.location.href = '/login'
                    },5000);
                } catch (err) {
                    dialogBox.textContent = "Unable to send the reset email. Please try again.";
                }
            })

        }

        if(registerForm){ 
            const passwordInput = document.querySelector('#register-password'); 
            registerForm.addEventListener('submit', async function(e){
                e.preventDefault();

                const existingMsg = document.querySelector('.re-enter-msg');
                if(existingMsg) existingMsg.remove();

                const email = document.querySelector('#register-email').value; 
                const password = passwordInput.value; 
                const rePassword = document.querySelector('#register-re-enter-Password').value;

                if(password !== rePassword) { 
                    const reEnterMsg = document.createElement('h4');
                    reEnterMsg.classList.add('re-enter-msg');
                    reEnterMsg.textContent = 'Re-enter both passwords carefully to ensure they are identical.'
                    document.querySelector('.re-passw-reg').after(reEnterMsg);
                    return; 
                }
                const csrfToken = await getCsrfToken();
                fetch('/users/create-account', { 
                    method: 'POST',
                    headers: {
                        'Content-type' : 'application/json',
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({email, password})
                }).then((response) => response.json())
                .then((data) => {
                    
                    if(data.message === 'Account created'){
                        Toastify({
                            text: "Account created successfully! Please verify your email before logging in.",
                            duration: 5000,
                            gravity: "top",
                            position: "center",
                            className: "custom-toast",
                            backgroundColor: "#fff8db",
                        }).showToast();
                        setTimeout(() => window.location.href = data.redirectURL, 1000);
                    } else {
                        Toastify({
                            text: "This email is already in use. Please try again.",
                            duration: 2000,
                            gravity: "top",
                            position: "center",
                            className: "custom-toast",
                            backgroundColor: "#fff8db",
                        }).showToast();
                    }
                });
            })

            passwordInput.addEventListener('input', () => {
                passwordCheck(passwordInput.value);
            })
        }
    }
    function passwordCheck(password){
                
        const icons = document.querySelectorAll('.text-password-must li i');
        
        const isValidLower = /[a-z]/.test(password);
        const isValidUpper = /[A-Z]/.test(password);
        const isValidNumbers = /\d/.test(password); 
        const isValidSpecial = /[(!@$)#&*()\-_+{};:",./?]/.test(password);
        
        if (icons.length < 3) return;
        
        icons[0].classList.toggle('fa-check', password.length >= 12);
        icons[0].classList.toggle('fa-x', password.length < 12);

        icons[1].classList.toggle('fa-check', isValidLower && isValidUpper && isValidNumbers);
        icons[1].classList.toggle('fa-x', !(isValidLower && isValidUpper && isValidNumbers));

        icons[2].classList.toggle('fa-check', isValidSpecial);
        icons[2].classList.toggle('fa-x', !isValidSpecial);
    }

    if(currentPage === 'reset-password'){        
        const toggles = document.querySelectorAll('.toggle-password');

        toggles.forEach((toggle) => {  
            toggle.addEventListener('click', function () {
                const password = this.previousElementSibling; 

                const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
                password.setAttribute('type', type);
                
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            });
        })

        const resetForm = document.querySelector('.reset-password-form');
        const resetPassword = document.querySelector('#reset-new-password');
        const token = document.querySelector('#resetToken')?.value; 
        
        if(resetForm){
            resetForm.addEventListener('submit', async function(e){
                e.preventDefault();

                const existingMsg = document.querySelector('.re-enter-msg');
                if(existingMsg) existingMsg.remove();

                const passwordValue = resetPassword.value; 
                const resetMatchPassword = document.querySelector('#reset-confirm-password').value;

                if(passwordValue !== resetMatchPassword) { 
                    const reEnterMsg = document.createElement('h4');
                    reEnterMsg.classList.add('re-enter-msg');
                    reEnterMsg.textContent = "Passwords don't match. Please try again."
                    document.querySelector('.reset-passw-sign').after(reEnterMsg);
                    return; 
                }
                const csrfToken = await getCsrfToken();
                const response = await fetch(`/users/reset-password/${token}`, {
                    method: 'POST',
                    headers: {
                        'Content-type' : 'application/json',
                        'x-csrf-token': csrfToken
                    },
                    body: JSON.stringify({password: passwordValue})
                })
                const data = await response.json();
                    if(response.ok){
                        Toastify({
                            text: "Password changed successfully! Please log in.",
                            duration: 4000,
                            gravity: "top",
                            position: "center",
                            className: "custom-toast",
                            backgroundColor: "#fff8db",
                        }).showToast();
                        setTimeout(() => window.location.href = '/login', 3000);
                    } else{
                        const sorryMsg = document.createElement('h4');
                        sorryMsg.classList.add('sorry-msg');
                        sorryMsg.textContent = 'Sorry, you have to choose a new password'
                        document.querySelector('.input-container').after(sorryMsg);
                    }
                })
                .catch((err) => {
                    
                    Toastify({ text: "Failed to reset password. Please try again." }).showToast();
                });
            if(resetPassword){
                resetPassword.addEventListener('input', () => {
                    passwordCheck(resetPassword.value);
                })
            }
        }
    }

    const mapElement = document.getElementById('map');  
    if (mapElement){
        const position = {
            name: "Momento",
            coords: [-33.8693, 151.1295],
            description: "7/189 Great North Road, Five Dock NSW 2046",
        }

        const map = L.map('map' ,{
            minZoom: 10, 
            maxZoom: 18, 
            worldCopyJump: false,  
            dragging: true 
        }).setView(position.coords, 17);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', 
        }).addTo(map);

        const marker = L.marker(position.coords).addTo(map);
        marker.bindPopup(`<strong>${position.name}</strong><br>${position.description}`, {closeButton: false});
        
        marker.on('mouseover', function() {
            this.openPopup();
        });

        marker.on('mouseout', function(){
            this.closePopup();
        })
        map.invalidateSize(); 
    }
})

