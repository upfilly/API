/**
 * BraintreeController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

// const constants = require('../../config/constants.js').constants;
// // const credentials = require('../../config/local.js'); //sails.config.env.production;
// const stripe = require("stripe")(credentials.PAYMENT_INFO.SECREATKEY);
// const response = require('../services/Response');
// const Services = require('../services/index');
// const Validations = require("../Validations/index");
// const db = sails.getDatastore().manager
// const ObjectId = require('mongodb').ObjectId;
// const Emails = require('../Emails/index');

const paypal = require('paypal-rest-sdk');
const credentials = require('../../config/local');
paypal.configure({
    'mode': credentials.PAYPAL_MODE ? credentials.PAYPAL_MODE : 'live', //sandbox or live
    'client_id': credentials.PAYMENT_INFO.CLIENT_ID,
    'client_secret': credentials.PAYMENT_INFO.CLIENT_SECRET,
});

var braintree = require('braintree');
// // console.log(braintree,"----------------braintree");

// var gateway = new braintree.BraintreeGateway({
//     environment: braintree.Environment.Sandbox, // Use 'Production' for live environment
//     merchantId: "9z8qb444sqn4qpzh",
//     publicKey: "rzgv99j7cjfncz6c",
//     privateKey: "d60651d59cc2feddc91550ce5ecafc09",
// });


// exports.createProduct = async (req, res) => {
//     const productData = {
//         // Define product details here
//         id: 1, // A unique identifier for the product or subscription plan.
//         name: 'Product Name',     // The name or title of the product.
//         description: 'Product description', // A brief description of the product.
//         price: '19.99',           // The price of the product or subscription.
//         currency: 'USD',          // The currency in which the price is specified.
//         billingFrequency: 1,     // Billing frequency (e.g., 1 for monthly, 12 for annually).
//         billingCycle: 1,         // Number of billing cycles before the subscription expires.
//         trialPeriod: false,      // Whether the product has a trial period (true or false).
//         trialDuration: 0,
//     };

//     gateway.product.create(productData, function (error, result) {
//         if (error) {
//             console.error('Product creation error:', error);
//             return res.serverError(error);
//         }
//         console.log('Product creation successful:', result);
//         return res.json(result);
//     });
// }

// api/controllers/PaymentController.js

// let BraintreeService = require("../services/BraintreeService")

module.exports = {
    createProduct: async function (req, res) {
        const gateway = BraintreeService.setupBraintree();
        console.log(gateway, "-----gateway");

        const productData = {
            // Define product details here
        };

        await gateway.product.create(productData, function (error, result) {
            if (error) {
                console.error('Product creation error:', error);
                return res.serverError(error);
            }
            console.log('Product creation successful:', result);
            return res.json(result);
        });
    },

    createSubscriptionPlan: async function (req, res) {
        const gateway = BraintreeService.setupBraintree();
        console.log(gateway, "-------------------------gateway---------------");
        const subscriptionPlanData = {
            // Unique identifier for the subscription plan.
            id: 1,

            // Plan name or title.
            name: 'Pro',

            // Plan description.
            description: 'Plan pro Description',

            // Billing frequency (e.g., monthly).
            billingFrequency: 1,

            // Billing cycle (number of billing cycles before the plan expires).
            billingCycle: 12,

            // Price of the subscription plan.
            price: '19.99',

            // Currency for the price (e.g., USD).
            currency: 'USD',

            // Payment method (e.g., credit_card, PayPal, etc.).
            paymentMethod: 'credit_card',

            // Plan trial period (true or false).
            trialPeriod: false,

            // Duration of the trial period (in days).
            trialDuration: 0,

            // Additional subscription plan details as needed.
        };



        await gateway.plan.create(subscriptionPlanData, function (error, result) {
            if (error) {
                console.error('Subscription plan creation error:', error);
                return res.serverError(error);
            }
            console.log('Subscription plan creation successful:', result);
            return res.json(result);
        });
    },

    createCustomer: async (req, res) => {
        const { firstName, lastName, email } = req.body;

        gateway.customer.create({
            firstName,
            lastName,
            email,
            creditCard: {
                number: '4111111111111111', // Replace with an actual card number
                expirationDate: '12/24',     // Replace with the expiration date (MM/YY)
            },
        }, (err, result) => {
            if (err) {
                console.log(err, "---------------err");
                return res.serverError(err);
            }

            // Handle the customer creation success
            return res.json(result.customer);
        });
    },

    NewPlan: async (req, res) => {
        try {
            console.log('in api new');

            const planData = {
                name: "Advance",
                billingFrequency: 1,
                currencyIsoCode: "USD",
                price: "10.00",
                // id: 'ABC', // Unique plan ID
                // price: '10.00',     // Monthly price in your currency
                // billingDayOfMonth: 1, // Billing day of the month
                // name: 'shivika', // A human-readable name for your plan
                // trialDuration: 30,  // Trial period duration in days (0 for no trial)
                // trialDurationUnit: braintree.Plan.DurationUnit.Day, // Unit for trial duration
                // numberOfBillingCycles: 12, // Number of billing cycles (e.g., 12 for a 12-month subscription)
                // currencyIsoCode: 'USD', // Currency code (e.g., USD)
                // billingFrequency: 1                
            };

            let data = await gateway.plan.create(planData)
            console.log(data.plan.id);
        } catch (error) {
            console.log(error, "--------error in catch");
        }
    },

    paymentMethodNonce: async (req, res) => {
        // Collect payment method information using your payment form
        gateway.client.create({
            authorization: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjUxZTU1OWE1NTlmODQwMmM5M2UxZGZhIiwiZmlyc3ROYW1lIjoiSmMiLCJpYXQiOjE2OTgzMDI2NzgsImV4cCI6MTY5ODMzODY3OCwiYXVkIjoicHVibGljIiwiaXNzIjoidXBmaWxseSIsInN1YiI6ImFtaXRAeW9wbWFpbC5jb20ifQ.RxdX2uqlTQBwcjY9jv3xpEzj3_xztLLPj7XV-WHYhDdXMVVyumN1qubj8unysP-KxBqMTHP3gCayzE8GxR7-_g',
        }, (clientErr, clientInstance) => {
            if (clientErr) {
                console.log(clientErr, "--------------clientErr");
                console.error(clientErr);
                // Handle client-side error
                return;
            }

            // Collect payment method information using your payment form

            clientInstance.request({
                endpoint: 'payment_methods/credit_cards',
                method: 'post',
                data: {
                    creditCard: {
                        number: '4111111111111111', // Example credit card number
                        expirationDate: '12/22',     // Example expiration date (MM/YY)
                    },
                },
            }, (nonceErr, response) => {
                if (nonceErr) {
                    console.error(nonceErr);
                    // Handle nonce error
                } else {
                    const paymentMethodNonce = response.creditCards[0].nonce;
                    // Send the paymentMethodNonce to your server
                }
            });
        });
    },

    paymenttoken: async (req, res) => {
        gateway.paymentMethod.create({
            customerId: '82715210481', // Replace with the actual customer ID
            paymentMethodNonce: 'payment_method_nonce', // Replace with the actual nonce
        }, (err, result) => {
            if (err) {
                console.error(err);
                // Handle the error
            } else {
                console.log(result, "---result");
                const paymentMethodToken = result.paymentMethod.token;
                console.log(paymentMethodToken, "--------paymentMethodToken");
                if (paymentMethodToken) {
                    return res.status(200).json({
                        success: true,
                        token: paymentMethodToken
                    })
                }
                // You now have the paymentMethodToken for the associated payment method
            }
        });

    },

    // CreateSubscription: async (req, res) => {
    //     const customerId = "82715210481"; // Replace with the actual customer ID
    //     const paymentMethodToken = 'payment_method_token'; // Replace with the actual payment method token
    //     const planId = 'cvdr'; // Replace with the actual subscription plan ID

    //     const subscriptionOptions = {
    //         paymentMethodToken: paymentMethodToken,
    //         planId: planId,
    //     };

    //     gateway.subscription.create(customerId, subscriptionOptions, (err, result) => {
    //         if (err) {
    //             console.error(err);
    //             // Handle the error appropriately
    //         } else {
    //             console.log('Subscription created:', result.subscription);
    //             // Handle the successful subscription creation
    //         }
    //     });

    // }

    CreateSubscriptionNew: async (req, res) => {
        try {

            const customerId = "11727573914"; // Replace with the actual customer ID
            const planId = 'ktkw';    // Replace with the actual subscription plan ID

            let result = await gateway.subscription.create({
                paymentMethodToken: "m283tp2w",  // Use the customer ID as the payment method token
                planId: planId,
            })
            console.log(result, "res");
            if (result) {
                return res.status(200).json({
                    sucess: true,
                    data: result.subscription
                })
            }
        } catch (error) {
            console.log(error, "---err in catch");
        }
    },


    TestApi: async (req, res) => {
        const customerData = {
            firstName: 'rubi',
            lastName: 'sharma',
            email: 'rubi@example.com',
        };

        // const paymentMethodData = {
        //     customerId: 'customer_id', // Replace with the actual customer ID
        //     paymentMethodNonce: 'payment_method_nonce', // Replace with the actual payment method nonce
        // };

        await gateway.customer.create(customerData, async (customerErr, customerResult) => {
            if (customerErr) {
                console.error(customerErr);
                // Handle the customer creation error
                return res.serverError(customerErr);
            }
            var paymentMethodData = {
                customerId: customerResult.customer.id, // Replace with the actual customer ID
                paymentMethodNonce: 'nonce-from-the-client', // Replace with the actual payment method nonce
            };
            await gateway.paymentMethod.create(paymentMethodData, async (paymentMethodErr, paymentMethodResult) => {
                if (paymentMethodErr) {
                    console.error(paymentMethodErr);
                    // Handle the payment method creation error
                    return res.serverError(paymentMethodErr);
                }

                var customerId = customerResult.customer.id;
                const paymentMethodToken = paymentMethodResult.paymentMethod.token;

                var planData = {
                    name: "Advance",
                    billingFrequency: 1,
                    currencyIsoCode: "USD",
                    price: "5.00",
                    // id: 'ABC', // Unique plan ID
                    // price: '10.00',     // Monthly price in your currency
                    // billingDayOfMonth: 1, // Billing day of the month
                    // name: 'shivika', // A human-readable name for your plan
                    // trialDuration: 30,  // Trial period duration in days (0 for no trial)
                    // trialDurationUnit: braintree.Plan.DurationUnit.Day, // Unit for trial duration
                    // numberOfBillingCycles: 12, // Number of billing cycles (e.g., 12 for a 12-month subscription)
                    // currencyIsoCode: 'USD', // Currency code (e.g., USD)
                    // billingFrequency: 1                
                };

                await gateway.plan.create(planData, async (err, result) => {
                    if (err) {
                        console.log(err, "--------------err in function");
                        // console.error(err);
                    } else {
                        console.log(result.plan);
                    }

                    var subscriptionData = {
                        paymentMethodToken: paymentMethodToken,
                        planId: result.plan.id, // Replace with the actual subscription plan ID
                        price: planData.price, // Replace with the subscription price
                        // Other subscription options like trialDuration, trialDurationUnit, etc.
                    };


                    await gateway.subscription.create(subscriptionData, async (subscriptionErr, subscriptionResult) => {
                        if (subscriptionErr) {
                            console.error(subscriptionErr);
                            // Handle the subscription creation error
                            return res.serverError(subscriptionErr);
                        }

                        console.log(subscriptionResult, "subscriptionResult---------------------------");

                        var customerId = paymentMethodData.customerId; // Replace with the actual customer ID
                        const planId = subscriptionData.planId; // Replace with the actual subscription plan ID
                        var amount = subscriptionData.price; // Replace with the transaction amount

                        const transactionData = {
                            amount: amount,
                            paymentMethodNonce: "nonce-from-the-client",
                            customer_id: customerId,
                            options: {
                                submitForSettlement: true, // Automatically submit for settlement
                            },
                            "credit_card": {
                                "number": '4111111111111111',
                                "expiration_month": 12,  // Integer value for the month (e.g., 1 for January)
                                "expiration_year": 24,  // Integer value for the year (e.g., 2023)
                                "cvv": 123

                            },
                        };


                        await gateway.transaction.sale(transactionData, (transactionErr, transactionResult) => {
                            console.log(transactionResult, "-----------------------transactionResult");
                            if (transactionErr) {
                                console.log(transactionErr, "-----------err");
                                console.error(transactionErr);
                                // Handle the transaction error
                                return res.serverError(transactionErr);
                            } else if (transactionResult.success) {
                                console.log('Transaction ID:', transactionResult.transaction.id);
                                // Handle the successful transaction
                                return res.json({ message: 'Transaction successful' });
                            } else {
                                console.error('Transaction failed:', transactionResult.message);
                                // Handle the failed transaction
                                return res.json({ message: 'Transaction failed' });
                            }
                        });
                    });

                })
            });
        });
    },


    /**used Apis */

    // addSubscriptionPlan: async (req, res) => {
    //     try {

    //         // let validation_result = await Validations.BraintreeValidation.addPlanWithBraintree(req, res);

    //         // if (validation_result && !validation_result.success) {
    //         //     throw validation_result.message;
    //         // }
    //         const customerData = {
    //             firstName: 'rubi',
    //             lastName: 'sharma',
    //             email: 'rubi@example.com',
    //         };

    //         let create_customer = await gateway.customer.create(customerData);
    //         if (create_customer) {

    //             var paymentMethodData = {
    //                 customerId: create_customer.customer.id, // Replace with the actual customer ID
    //                 paymentMethodNonce: 'nonce-from-the-client', // Replace with the actual payment method nonce
    //             };
    //             var paymentMethodResult = await gateway.paymentMethod.create(paymentMethodData);
    //             if (paymentMethodResult) {
    //                 var planData = {
    //                     name: "Advance",
    //                     billingFrequency: 1,
    //                     currencyIsoCode: "USD",
    //                     price: "5.00",
    //                     // id: 'ABC', // Unique plan ID
    //                     // price: '10.00',     // Monthly price in your currency
    //                     // billingDayOfMonth: 1, // Billing day of the month
    //                     // name: 'shivika', // A human-readable name for your plan
    //                     // trialDuration: 30,  // Trial period duration in days (0 for no trial)
    //                     // trialDurationUnit: braintree.Plan.DurationUnit.Day, // Unit for trial duration
    //                     // numberOfBillingCycles: 12, // Number of billing cycles (e.g., 12 for a 12-month subscription)
    //                     // currencyIsoCode: 'USD', // Currency code (e.g., USD)
    //                     // billingFrequency: 1                
    //                 };

    //                 let create_plan = await gateway.plan.create(planData);
    //                 if (create_plan) {
    //                     var subscriptionData = {
    //                         paymentMethodToken: paymentMethodResult.paymentMethod.token,
    //                         planId: create_plan.plan.id, // Replace with the actual subscription plan ID
    //                         price: planData.price, // Replace with the subscription price
    //                         // Other subscription options like trialDuration, trialDurationUnit, etc.
    //                     };


    //                     let create_subscription = await gateway.subscription.create(subscriptionData);
    //                     if (create_subscription) {
    //                         return res.status(200).json({
    //                             success: true
    //                         })
    //                     }
    //                 }
    //             }
    //         }
    //     } catch (error) {
    //         // console.log(error, "----------------err");
    //         return response.failed(null, `${error}`, req, res);
    //     }

    // }



    addSubscriptionPlan: async (req, res) => {
        try {

            // let validation_result = await Validations.BraintreeValidation.addPlanWithBraintree(req, res);

            // if (validation_result && !validation_result.success) {
            //     throw validation_result.message;
            // }


            var planData = {
                name: "Advance",
                billingFrequency: 1,
                currencyIsoCode: "USD",
                price: "5.00",
                // id: 'ABC', // Unique plan ID
                // price: '10.00',     // Monthly price in your currency
                // billingDayOfMonth: 1, // Billing day of the month
                // name: 'shivika', // A human-readable name for your plan
                // trialDuration: 30,  // Trial period duration in days (0 for no trial)
                // trialDurationUnit: braintree.Plan.DurationUnit.Day, // Unit for trial duration
                // numberOfBillingCycles: 12, // Number of billing cycles (e.g., 12 for a 12-month subscription)
                // currencyIsoCode: 'USD', // Currency code (e.g., USD)
                // billingFrequency: 1                
            };

            let create_plan = await gateway.plan.create(planData);
            if (create_plan) {
                var subscriptionData = {
                    paymentMethodToken: paymentMethodResult.paymentMethod.token,
                    planId: create_plan.plan.id, // Replace with the actual subscription plan ID
                    price: planData.price, // Replace with the subscription price
                    // Other subscription options like trialDuration, trialDurationUnit, etc.
                };


                let create_subscription = await gateway.subscription.create(subscriptionData);
                if (create_subscription) {
                    return res.status(200).json({
                        success: true
                    })
                }


            }
        } catch (error) {
            // console.log(error, "----------------err");
            return response.failed(null, `${error}`, req, res);
        }

    },

    customerWithCards: async (req, res) => {


        // Replace with customer and credit card details
        const customerData = {
            firstName: 'tanu',
            lastName: 'sharma',
            email: 'tanu@example.com',
        };

        const creditCardData = {
            customerId: '', // Will be populated with the customer ID after customer creation
            number: '4111111111111111', // Replace with the credit card number
            expirationDate: '12/23', // Replace with the expiration date (MM/YY)
        };

        // Step 1: Create the customer
        gateway.customer.create(customerData, (customerErr, customerResult) => {
            if (customerErr) {
                console.error('Error creating customer:', customerErr);
                return res.serverError(customerErr);
            }

            if (customerResult.success) {
                // Customer has been created successfully
                const customerId = customerResult.customer.id;
                console.log('Customer created with ID:', customerId);

                // Step 2: Add the credit card
                creditCardData.customerId = customerId;

                gateway.creditCard.create(creditCardData, (creditCardErr, creditCardResult) => {
                    if (creditCardErr) {
                        console.error('Error adding credit card to customer:', creditCardErr);
                        return res.serverError(creditCardErr);
                    }

                    if (creditCardResult.success) {
                        console.log(creditCardResult, '------------------creditCardResult');
                        // Credit card has been added to the customer successfully
                        const creditCardToken = creditCardResult.creditCard.token;
                        console.log('Credit card added to customer with token:', creditCardToken);
                        return res.json({ message: 'Customer and credit card created successfully' });
                    } else {
                        // Credit card addition failed
                        console.error('Credit card addition failed:', creditCardResult.errors);
                        return res.json({ message: 'Credit card addition failed' });
                    }
                });
            } else {
                // Customer creation failed
                console.error('Customer creation failed:', customerResult.errors);
                return res.json({ message: 'Customer creation failed' });
            }
        });
    },

    creatediscountapi: async (req, res) => {
        const discountParams = {
            "name": "First Month Discount",
            "kind": "fixed_amount", // or "percentage" for percentage-based discounts
            "amount": "10.00", // The discount amount (if kind is "fixed_amount") or percentage (if kind is "percentage")
            "numberOfBillingCycles": 1, // Number of billing cycles for which the discount applies (e.g., 1 for the first month)
            "neverExpires": false,
            // Define the discount details here, e.g., amount, duration, etc.
        };

        gateway.discount.create(discountParams, (error, result) => {
            if (!error) {
                const discountId = result.discount.id;
                // Use the 'discountId' as needed in your Sails.js application.
            } else {
                // Handle error appropriately
            }
        });

    },
    getAlldiscounts: async (req, res) => {
        let get_dicountes = await gateway.discount.all();
        console.log(get_dicountes);
    }

}
