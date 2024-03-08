/**
 * PaypalController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const constants = require('../../config/constants.js').constants;
const credentials = require('../../config/local.js'); //sails.config.env.production;
const stripe = require("stripe")(credentials.PAYMENT_INFO.SECREATKEY);
const response = require('../services/Response');
const Services = require('../services/index');
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager
const ObjectId = require('mongodb').ObjectId;
const Emails = require('../Emails/index');
const axios = require('axios');

//for paypal
const paypal = require('paypal-rest-sdk');

console.log(credentials.PAYPAL_MODE ? credentials.PAYPAL_MODE : 'live')
paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': credentials.PAYMENT_INFO.CLIENT_ID,
    'client_secret': credentials.PAYMENT_INFO.CLIENT_SECRET,
    // 'openid_redirect_uri': 'http://portal.jcsoftwaresolution.in:7042/'
});

const auth = `${credentials.PAYMENT_INFO.CLIENT_ID}:${credentials.PAYMENT_INFO.CLIENT_SECRET}`;
const base64Auth = Buffer.from(auth).toString('base64');

// const paypalApiUrl = 'https://api.sandbox.paypal.com'; // or 'https://api.paypal.com' for live
const paypalApiUrl = 'https://api-m.sandbox.paypal.com';
// console.log(JSON.stringify(paypal), "------------------logs");

exports.addSubscriptionPlan = async (req, res) => {
    try {

        let validation_result = await Validations.SubscriptionPlansValidations.addSubscriptionPlan(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { name, pricing, make_recommend } = req.body;


        let get_query = {
            isDeleted: false,
            name: name
        }
        let get_subscription_plan = await SubscriptionPlans.findOne(get_query);
        if (get_subscription_plan) {
            throw constants.SUBSCRIPTION_PLAN.NAME_EXIST;
        }

        if (req.body.upcoming_date) {
            req.body.upcoming_date = new Date(req.body.upcoming_date);

        }

        let created_product = await Services.StripeServices.create_product({ name: name });
        if (created_product) {
            // let plan_payload = {
            //     nickname: name,
            //     amount: amount,
            //     interval: req.body.interval ? req.body.interval : "month",
            //     // interval: "day",

            //     interval_count: req.body.interval_count ? req.body.interval_count : 1,
            //     trial_period_days: req.body.trial_period_days ? req.body.trial_period_days : 7,         // Set to 1 day instant of 7 day on 5 july for testing        // Clients Requirement
            //     // trial_period_days: 0,         // Clients Requirement

            //     product_id: created_product.id,
            //     currency: "USD",
            // }

            if (pricing) {
                for await (const itm of pricing) {
                    // console.log(itm, "---------------itm");
                    const price = await stripe.prices.create({
                        product: created_product.id,
                        unit_amount: itm.unit_amount * 100,
                        currency: itm.currency,
                        recurring: {
                            interval: itm.interval,
                            interval_count: itm.interval_count,
                        },
                        // trial_period_days: itm.trial_period_days ? itm.trial_period_days : 7,
                    });
                    itm.stripe_price_id = price.id;
                }
            }

            /**For free plan only*/

            // if (plan_type && plan_type == "free") {
            //     const price = await stripe.prices.create({
            //         product: created_product.id,
            //         unit_amount: 0,
            //         currency: "usd",
            //     });

            //     req.body.stripe_price_id = price.id;
            // }

            // let create_plan = await Services.StripeServices.create_plan(plan_payload);

            // if (create_plan) {
            req.body.addedBy = req.identity.id;
            // req.body.stripe_plan_id = create_plan.id;
            req.body.stripe_product_id = created_product.id;
            req.body.trial_period_days = req.body.trial_period_days ? req.body.trial_period_days : 7;

            let create_subscription_plan = await SubscriptionPlans.create(req.body).fetch();
            if (create_subscription_plan) {
                if (make_recommend && make_recommend == true) {
                    let update_recommend_plan = await SubscriptionPlans.update({
                        recommended: 'Y',
                        status: 'active',
                        isDeleted: false,
                        id: { "!=": create_subscription_plan.id },
                    },
                        {
                            recommended: "N",
                        }).fetch();
                }

                return response.success(null, constants.SUBSCRIPTION_PLAN.ADDED, req, res);
            }
            throw constants.COMMON.SERVER_ERROR;
            // }
            // throw constants.SUBSCRIPTION_PLAN.UNABLE_TO_CREATE_PLAN;
        }

        throw constants.SUBSCRIPTION_PLAN.UNABLE_TO_CREATE_PRODUCT;

    } catch (error) {
        // console.log(error, "----------------err");
        return response.failed(null, `${error}`, req, res);
    }
}

exports.addSubscriptionPlanOnpaypal = async (req, res) => {
    const createPricingPlan = {
        name: 'Example Plan',
        description: 'Monthly subscription plan',
        type: 'fixed',
        payment_definitions: [
            {
                name: 'Monthly Payment',
                type: 'REGULAR',
                frequency: 'MONTH',
                frequency_interval: '1',
                amount: {
                    currency: 'USD',
                    value: '9.99',
                },
                cycles: '12', // Number of billing cycles (e.g., 12 months)
            },
        ],
        merchant_preferences: {
            setup_fee: {
                currency: 'USD',
                value: '0.00',
            },
            cancel_url: 'https://example.com/cancel',
            return_url: 'https://example.com/success',
            auto_bill_amount: 'YES',
            initial_fail_amount_action: 'CONTINUE',
            max_fail_attempts: '3',
        },
    };

    paypal.billingPlan.create(createPricingPlan, (error, billingPlan) => {
        if (error) {
            console.error(error);
        } else {
            console.log('Created billing plan:');
            console.log(billingPlan);
            return res.status(200).json({
                success: true,
                data: billingPlan,
            })
        }
    });

}

// exports.addproducts = async (req, res) => {

//     const createProduct = {
//         name: 'Sample Product',
//         type: 'PHYSICAL', // Specify the type of product (e.g., PHYSICAL, DIGITAL, SERVICE)
//         category: 'PHYSICAL', // Specify the category
//         description: 'This is a sample product description.',
//         image_url: 'https://example.com/product-image.jpg', // URL to the product image
//         home_url: 'https://example.com/product-details', // URL to the product details page
//     };
//     console.log(paypal.configure, "----paypal");
//     paypal.catalog.products.create(createProduct, (error, product) => {
//         if (error) {
//             console.error(error);
//         } else {
//             console.log('Created product:');
//             console.log(product);
//             // Store the product ID or use it as needed in your application.
//         }
//     });
// }

// exports.createProduct = async (req, res) => {
//     try {
//         const product = {
//             name: 'Sample Product',
//             description: 'A sample product description',
//             type: 'SERVICE', // Change to 'PHYSICAL' for physical products
//             category: 'DIGITAL_GOODS',
//             image_url: 'https://example.com/product-image.jpg',
//             home_url: 'https://example.com',
//         };

//         paypal.catalog.products.create(product, (error, product) => {
//             if (error) {
//                 console.error(error);
//                 return res.status(500).json({ error: 'Error creating product' });
//             } else {
//                 return res.json(product);
//             }
//         });
//     } catch (err) {
//         console.error(err);
//         return res.status(500).json({ error: 'Error creating product' });
//     }
// }

exports.api = async (req, res) => {
    let result = await paypal.openIdConnect.authorizeUrl({ 'scope': 'openid profile' });
    if (result) {

        return res.status(200).json({
            success: true,
            data: result,
        })
    }

}

exports.createProduct = async (req, res) => {
    const productData = {
        name: 'Product Name',
        description: 'Product Description',
        type: 'PHYSICAL', // Change to 'DIGITAL' for digital products
        category: 'PHYSICAL', // Change to 'DIGITAL' for digital products
        base_price: {
            currency: 'USD',
            value: '10.00',
        },
    };
    console.log(JSON.stringify(paypal), "-------------in api paypal");
    paypal.product.create(productData, (error, product) => {
        if (error) {
            console.error(error);
            return res.serverError('Error creating product');
        } else {
            console.log('Created product: ', product);
            return res.ok(product);
        }
    });
}

// exports.generateToken = async (req, res) => {

//     // Define the data to be sent in the request body
//     const data = 'grant_type=client_credentials';

//     // Create a basic authentication header with your client ID and client secret
//     const auth = {
//         username: clientId,
//         password: clientSecret,
//     };

//     // Send a POST request to the PayPal OAuth endpoint
//     axios.post(oauthUrl, data, {
//         headers: {
//             'Accept': 'application/json',
//             'Accept-Language': 'en_US',
//         },
//         auth,
//     })
//         .then((response) => {
//             // Extract the access token from the response
//             const accessToken = response.data.access_token;

//             // Use the access token for making authorized API requests
//             console.log('Access Token:', accessToken);

//             // You can now use the access token to make PayPal API requests
//             // For example, you can create a product or perform other actions.
//         })
//         .catch((error) => {
//             console.error('Error generating access token:', error);
//         });
// }


// const auth = `${clientID}:${clientSecret}`;
// const base64Auth = Buffer.from(auth).toString('base64');

// const paypalApiUrl = 'https://api.sandbox.paypal.com'; // or 'https://api.paypal.com' for live

exports.generateToken = async (req, res) => {
    try {
        // Define the PayPal OAuth endpoint
        const response = await axios.post(`${paypalApiUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
            headers: {
                Authorization: `Basic ${base64Auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });

        const accessToken = response.data.access_token;
        if (accessToken) {
            return res.status(200).json({
                success: true,
                data: accessToken
            })
        }
        // console.log(`Access Token: ${accessToken}`);
    } catch (error) {
        console.log(error, "----err");
    }
};

exports.addProductsAxios = async (req, res) => {
    try {
        // Define the PayPal OAuth endpoint

        const productEndpoint = `${paypalApiUrl}/v1/catalogs/products`;
        const productData = {
            // Your product data here
            // Example:
            name: 'Sample Product',
            description: 'This is a test product',
            // Add other product details here
        };
        var accessToken = req.body.token;
        const response = await axios.post(productEndpoint, productData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(response);

        const accessToken_res = response.data.access_token;
        // console.log(accessToken, "-------aces");
        if (response) {

            return res.status(200).json({
                success: true,
                data: response.data
            })
        }

        // console.log(`Access Token: ${accessToken}`);
    } catch (error) {
        console.log(error, "-----------------err");
        // console.error(`Error getting access token: ${error}`);
    }
}

exports.createSubscriptionPlan = async (req, res) => {
    try {
        var subscriptionEndpoint = `${paypalApiUrl}/v1/billing/plans`;
        var accessToken = req.body.token;
        var product_id = req.body.product_id;

        var subscriptionPlanData = {


            "product_id": product_id,
            "name": "Basic Plan",
            "description": "Basic plan",
            "billing_cycles": [
                {
                    "frequency": {
                        "interval_unit": "MONTH",
                        "interval_count": 1
                    },
                    "tenure_type": "TRIAL",
                    "sequence": 1,
                    "total_cycles": 1
                },
                {
                    "frequency": {
                        "interval_unit": "MONTH",
                        "interval_count": 1
                    },
                    "tenure_type": "REGULAR",
                    "sequence": 2,
                    "total_cycles": 12,
                    "pricing_scheme": {
                        "fixed_price": {
                            "value": "10",
                            "currency_code": "USD"
                        }
                    }
                }
            ],
            "payment_preferences": {
                "auto_bill_outstanding": true,
                "setup_fee": {
                    "value": "10",
                    "currency_code": "USD"
                },
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3
            },
            "taxes": {
                "percentage": "10",
                "inclusive": false
            }
        }

        const response = await axios.post(subscriptionEndpoint, subscriptionPlanData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        console.log(response, "----------------response");


        return res.status(200).json({
            success: true
        })

    } catch (error) {
        console.log(error, "---error");
    }
}


exports.ProductPlan = async (req, res) => {
    try {

        let { token, name } = req.body
        const productEndpoint = `${paypalApiUrl}/v1/catalogs/products`;
        const productData = {
            // Your product data here
            // Example:
            name: 'Sample Product',
            description: 'This is a test product',
            // Add other product details here
        };
        var accessToken = token;
        var response = await axios.post(productEndpoint, productData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        var subscriptionEndpoint = `${paypalApiUrl}/v1/billing/plans`;
        var product_id = response.data.id;

        var subscriptionPlanData = {
            "product_id": product_id,
            "name": name,
            "description": "Basic plan",
            "billing_cycles": [
                {
                    "frequency": {
                        "interval_unit": "MONTH",
                        "interval_count": 1
                    },
                    "tenure_type": "TRIAL",
                    "sequence": 1,
                    "total_cycles": 1
                },
                {
                    "frequency": {
                        "interval_unit": "MONTH",
                        "interval_count": 1
                    },
                    "tenure_type": "REGULAR",
                    "sequence": 2,
                    "total_cycles": 12,
                    "pricing_scheme": {
                        "fixed_price": {
                            "value": "10",
                            "currency_code": "USD"
                        }
                    }
                }
            ],
            "payment_preferences": {
                "auto_bill_outstanding": true,
                "setup_fee": {
                    "value": "10",
                    "currency_code": "USD"
                },
                "setup_fee_failure_action": "CONTINUE",
                "payment_failure_threshold": 3
            },
            "taxes": {
                "percentage": "10",
                "inclusive": false
            }
        }

        const response_plan = await axios.post(subscriptionEndpoint, subscriptionPlanData, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        let plan_payload = {
            name: response_plan.data.name,
            paypal_plan_id: response_plan.data.id,
            paypal_product_id: response_plan.data.product_id
        }
        let create_plan = await SubscriptionPlans.create(plan_payload);

        if (response_plan) {
            return res.status(200).json({
                success: true
            })
        }
    } catch (error) {
        console.log(error, "---------err");
    }
}

// exports.createSubscription = async (req, res) => {
//     try {

//         var { token, plan_id } = req.body
//         // Define your plan ID (obtained from PayPal when you created the plan)

//         // Define the subscription data
//         var subscriptionData = {
//             "plan_id": plan_id,
//             "start_time": "2018-11-01T00:00:00Z",
//             "quantity": "20",
//             "shipping_amount": {
//                 "currency_code": "USD",
//                 "value": "10.00"
//             },
//             "subscriber": {
//                 "name": {
//                     "given_name": "John",
//                     "surname": "Doe"
//                 },
//                 "email_address": "customer@example.com",
//                 "shipping_address": {
//                     "name": {
//                         "full_name": "John Doe"
//                     },
//                     "address": {
//                         "address_line_1": "2211 N First Street",
//                         "address_line_2": "Building 17",
//                         "admin_area_2": "San Jose",
//                         "admin_area_1": "CA",
//                         "postal_code": "95131",
//                         "country_code": "US"
//                     }
//                 }
//             },
//             "application_context": {
//                 "brand_name": "walmart",
//                 "locale": "en-US",
//                 "shipping_preference": "SET_PROVIDED_ADDRESS",
//                 "user_action": "SUBSCRIBE_NOW",
//                 "payment_method": {
//                     "payer_selected": "PAYPAL",
//                     "payee_preferred": "IMMEDIATE_PAYMENT_REQUIRED"
//                 },
//                 "return_url": "https://example.com/returnUrl",
//                 "cancel_url": "https://example.com/cancelUrl"
//             }
//         }
//         // user: 1,
//         // plan_id: plan_id,
//         // start_time: new Date().toISOString(), // You can set the start time as needed
//         // "quantity": "20",
//         // subscriber: {
//         //     name: {
//         //         given_name: 'shivi',
//         //         surname: 'sharam',
//         //     },
//         //     email_address: 'shivi@jcsoftwaresolution.com',
//         // },
//         // };


//         var subscriptionEndpoint = `${paypalApiUrl}/v1/billing/subscriptions`;
//         var subscriptionResponse = await axios.post(
//             subscriptionEndpoint,
//             subscriptionData,
//             {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'application/json',
//                 },
//             }
//         );
//         console.log(subscriptionResponse, "-------------subscriptionResponse");

//         const subscriptionId = subscriptionResponse.data.id;
//         if (subscriptionResponse) {
//             return res.status(200).json({
//                 success: true
//             })
//         }
//     } catch (error) {
//         console.log(error, "-----------------error");
//     }
// }



exports.createSubscription = async (req, res) => {
    try {

        var { token, plan_id } = req.body
        // Define your plan ID (obtained from PayPal when you created the plan)

        // Define the subscription data
        const purchaseData = {
            plan_id: plan_id,
            // Add user and payment information here
        };


        // https://api.sandbox.paypal.com/v1/billing/subscriptions
        // var subscriptionEndpoint = `${paypalApiUrl}/v1/billing/subscriptions`;
        var subscriptionResponse = await axios.post(`${paypalApiUrl}/v1/billing/subscriptions`, purchaseData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })

        console.log(subscriptionResponse, "-------------subscriptionResponse");

        const subscriptionId = subscriptionResponse.data;
        console.log(subscriptionId, "--------------------subscriptionId");
        if (subscriptionResponse) {
            return res.status(200).json({
                success: true
            })
        }
    } catch (error) {
        console.log(error, "-----------------error");
    }
}

exports.createPlanWithCard = async (req, res) => {
    let { token } = req.body
    const cardData = {
        // Define card details here (e.g., card number, expiration date, CVV)
        "card_number": "4111111111111111",
        "exp_month": "12",
        "exp_year": "2023",
        "cvv": ""
    };

    // Define purchase data (e.g., item details, amount, currency)
    const purchaseData = {
        intent: 'sale',
        payer: {
            payment_method: 'paypal', // or 'paypal'
        },
        transactions: [
            {
                amount: {
                    total: '10.00',
                    currency: 'USD',
                    details: {
                        tax: '1.00',
                        shipping: '2.00',
                        subtotal: '7.00',
                    },
                },
                description: 'Purchase of Item XYZ',
                custom: 'Custom data for the purchase',
            },
        ],
        redirect_urls: {
            return_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
        },
        // Define purchase details here
    };

    // Use PayPal's REST API endpoint for payments
    axios
        .post('https://api.sandbox.paypal.com/v1/payments/payment', purchaseData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        })
        .then((response) => {
            console.log('Purchase successful:', response.data);
            return res.json(response.data);
        })
        .catch((error) => {
            console.error('Purchase error:', error);
            return res.serverError(error);
        });
}












