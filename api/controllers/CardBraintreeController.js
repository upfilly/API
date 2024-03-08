/**
 * CardBraintreeController
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
const db = sails.getDatastore().manager;
const ObjectId = require('mongodb').ObjectId;
const Emails = require('../Emails/index.js');

var braintree = require('braintree');
// console.log(braintree,"----------------braintree");

// var gateway = new braintree.BraintreeGateway({
//     environment: braintree.Environment.Sandbox, // Use 'Production' for live environment
//     merchantId: "9z8qb444sqn4qpzh",
//     publicKey: "rzgv99j7cjfncz6c",
//     privateKey: "d60651d59cc2feddc91550ce5ecafc09",
// });

exports.addCard = async (req, res) => {
    try {
        // console.log('in add card');
        let validation_result = await Validations.BraintreeValidation.addCard(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { card_number, exp_month, exp_year, cvv, user_id, firstName, lastName, paypal_email } = req.body

        if (paypal_email) {
            req.body.paypal_email = paypal_email.toLowerCase();
        }

        const fullYear = `20${exp_year}`;
        const expiration = new Date(fullYear, exp_month - 1); // Subtract 1 from the month because it's zero-based
        const currentDate = new Date();
        if (expiration < currentDate) {
            throw constants.SUBSCRIPTION_PLAN.CARD_EXPIRE;
        }

        var paypal_customer_id;

        let get_user = await Users.findOne({ id: user_id });
        if (!get_user) {
            throw constants.CARD.INVALID_USER_ID;
        }
        paypal_customer_id = get_user.paypal_customer_id;

        /**If user is already registered on paypal  */
        if (get_user.paypal_customer_id != undefined && get_user.paypal_customer_id != "") {
            // console.log("If user is already registered on paypal");
            var cardNumber = String(req.body.card_number);
            last4 = cardNumber.slice(cardNumber.length - 4);

            const cards = await CardBraintree.find({ user_id: user_id, last4: last4 })
            // console.log(cards, "---------------cards");

            /**User can't add same card multiple time */
            if (cards && cards.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 400,
                        message: constants.CARD.CARD_EXIST,
                    },
                });
            } else {
                const creditCard_payload = {
                    customerId: paypal_customer_id,
                    number: card_number,
                    expirationDate: `${exp_month}/${exp_year}`,
                    cvv: cvv
                };

                let AddCard = await gateway.creditCard.create(creditCard_payload);
                // console.log(AddCard, "-----------------AddCard");
                if (AddCard) {
                    // let get_primary_card = await CardBraintree.findOne({ user_id: get_user.id, isDeleted: false, isPrimary: true });
                    // if (!get_primary_card) {
                    //     req.body.isPrimary = true;
                    // }

                    let card_payload = {
                        // card_id: AddCard.creditCard.id,
                        card_token: AddCard.creditCard.token,
                        user_id: user_id,
                        last4: AddCard.creditCard.last4,
                        addedBy: user_id
                    }
                    const existedUserCards = await CardBraintree.find({ user_id: user_id })
                    // console.log(existedUserCards,"===existedUserCards");
                    if (existedUserCards && existedUserCards.length == 0) {
                        card_payload.isPrimary = true
                    }
                    let add_card = await CardBraintree.create(card_payload).fetch();
                    if (add_card) {

                        // console.log(AddCard.creditCard.token, "-----------------add_card");
                        // let update_default_cardOnPaypal = await gateway.customer.update(paypal_customer_id, {
                        //     paymentMethodToken: AddCard.creditCard.token
                        // });
                        // console.log(update_default_cardOnPaypal, "----update_default_cardOnPaypal");
                    }
                    return response.success(add_card, constants.CARD.ADDED, req, res);
                }
            }
        } else {
            /**If user is not registered on paypal */
            // console.log("If user is not registered on paypal");
            const customerData = {
                firstName: firstName,
                lastName: lastName,
                email: paypal_email
            };
            let create_customer = await gateway.customer.create(customerData);
            // console.log(create_customer, "-----create_customer");
            if (create_customer.customer.id) {

                const creditCardData = {
                    customerId: '', // Will be populated with the customer ID after customer creation
                    number: card_number, // Replace with the credit card number
                    expirationDate: `${exp_month}/${exp_year}`,// Replace with the expiration date (MM/YY)
                    cvv: cvv
                };

                creditCardData.customerId = create_customer.customer.id;
                const customerId = { paypal_customer_id: create_customer.customer.id, paypal_email: paypal_email }
                const updatedUser = await Users.updateOne({ id: user_id }, customerId)

                let AddCard = await gateway.creditCard.create(creditCardData);
                if (AddCard) {
                    let card_payload = {
                        // card_id: AddCard.creditCard.id,
                        card_token: AddCard.creditCard.token,
                        isPrimary: true,
                        user_id: user_id,
                        last4: AddCard.creditCard.last4,
                        addedBy: user_id
                    }
                    let add_card = await CardBraintree.create(card_payload).fetch();
                    if (add_card) {
                        return response.success(add_card, constants.CARD.ADDED, req, res);
                    }

                }
            }
        }
        throw constants.COMMON.SERVER_ERROR;
    } catch (error) {
        console.log(error, "--------------err");
        return response.failed(null, `${error}`, req, res);
    }
}

// exports.getCardById = async (req, res) => {
//     try {
//         const id = req.param('id');
//         if (!id) {
//             throw constants.CARD.ID_REQUIRED;
//         }

//         let get_card = await Cards.findOne({ id: id });
//         if (get_card) {
//             let get_user = await Users.findOne({ id: get_card.user_id });
//             let get_card_details = await Services.StripeServices.retrieve_source({
//                 stripe_customer_id: get_user.stripe_customer_id,
//                 card_id: get_card.card_id
//             })
//             if (get_card_details) {
//                 get_card.card_details = get_card_details;
//             }
//             return response.success(get_card, constants.CARD.FETCHED, req, res);
//         }

//         throw constants.CARD.INVALID_ID;

//     } catch (error) {
//         return response.failed(null, `${error}`, req, res);
//     }
// }

exports.getCardById = async (req, res) => {
    // console.log(req.identity,"=======req.identity");
    const user_id = req.identity.id
    let paypal_customer_id = req.identity.paypal_customer_id
    // console.log(customer_id,"======customer_id");
    try {
        const cards = await CardBraintree.find({ user_id: user_id }).sort("isPrimary DESC")
        if (cards && cards.length > 0) {
            for await (const data of cards) {
                var date = new Date()
                var currentMonth = date.getUTCMonth() + 1
                var currentYear = date.getUTCFullYear()
                if (Number(data.exp_year) < Number(currentYear)) {
                    data.isExpired = true
                } else if (Number(data.exp_month) < Number(currentMonth) && Number(data.exp_year) <= Number(currentYear)) {
                    data.isExpired = true
                } else {
                    data.isExpired = false
                }
                data.paypal_customer_id = paypal_customer_id
            }
        }
        return res.status(200).json({
            success: true,
            data: cards
        })
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: { code: 400, message: "" + err }
        })
    }
}

exports.deleteCard = async (req, res) => {
    // console.log('in delete card api');
    // console.log(req.identity,"-------------------req.identity");
    var customer_id = req.identity.paypal_customer_id;
    // console.log(customer_id,"====customer id ");
    var card_token = req.param('card_token');

    if (!card_token || card_token == undefined) {
        return res.status(404).json({
            success: false,
            error: { code: 404, message: constants.CARD.CARD_ID_REQUIRED }
        })
    }
    const id = req.identity.id;
    try {
        gateway.creditCard.delete(card_token,
            customer_id,
            async (err, confirmation) => {
                if (err) {
                    return res.status(400).json({
                        success: false,
                        code: { code: 400, error: err }
                    })
                } else {
                    var card = await CardBraintree.findOne({ user_id: id, card_token: card_token })
                    if (card.isPrimary == true) {
                        const cards = await CardBraintree.find({ user_id: id, isPrimary: false })
                        if (cards && cards.length > 0) {
                            updatedCard = await CardBraintree.update({ id: cards[0].id }, { isPrimary: true })
                        }
                    }
                    const removedCard = await CardBraintree.destroy({ user_id: id, card_token: card_token })

                    return res.status(200).json({
                        success: true,
                        message: constants.CARD.DELETED
                    })
                }
            }
        );

    } catch (err) {
        // console.log(err,"err");
        return res.status(400).json({
            success: false,
            error: {
                code: 400,
                message: '' + err,
            },
        });
    }
}

exports.webhook = async (request, response) => {
    try {
        const event = request.body;
        // Handle the event
        switch (event.type) {
            case 'customer.subscription.created':
                var event_object = event.data.object;
                break;

            case 'customer.subscription.updated':
                var event_object = event.data.object;
                if (event_object.status == "active") {
                    let update_subscription = await Services.Webhook.update_subscription_valid_upto(event_object);
                }
                break;

            case 'invoice.payment_succeeded':
                var event_object = event.data.object;
                if (event_object.subscription) {
                    let get_email_payloads = await Services.Webhook.create_subscription_transaction(event_object);
                    if (get_email_payloads) {
                        await Emails.OnboardingEmails.subscription_transaction_email(get_email_payloads.admin_payload);
                        await Emails.OnboardingEmails.subscription_transaction_email(get_email_payloads.user_payload);
                    }
                }
                break;

            case 'customer.subscription.trial_will_end':
                var event_object = event.data.object;
                if (event_object.id) {
                    let get_email_payloads = await Services.Webhook.update_trial_period_end_date(event_object);
                    if (get_email_payloads) {
                        await Emails.OnboardingEmails.trial_will_end_email(get_email_payloads.user_payload)
                    }
                }
                break;

            case 'customer.subscription.deleted':
                var event_object = event.data.object;
                if (event_object.status == "canceled") {
                    let update_subscription = await Services.Webhook.cancel_subscription(event_object);
                }
                break;

            case 'invoice.upcoming':
                var event_object = event.data.object;
                if (event_object.subscription) {
                    let get_email_payloads = await Services.Webhook.send_upcoming_invoice_email(event_object);
                    if (get_email_payloads) {
                        await Emails.OnboardingEmails.upcomming_invoice_email(get_email_payloads.user_payload)
                    }
                }

                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // Return a response to acknowledge receipt of the event
        response.json({ received: true });

    } catch (error) {
        console.log(error, '=============error');
    }
}


