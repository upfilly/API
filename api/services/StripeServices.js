const credentials = require('../../config/local.js'); //sails.config.env.production;
const stripe = require("stripe")(credentials.PAYMENT_INFO.SECREATKEY);

exports.create_product = async (options) => {
    const product = await stripe.products.create({
        name: options.name
    });
    return product;
}

exports.create_plan = async (options) => {

    const plan = await stripe.plans.create({
        nickname: options.name,
        amount: Number(options.amount) * 100,
        interval: options.interval ? options.interval : 'month',
        interval_count: options.interval_count ? options.interval_count : 1,
        active: true,
        trial_period_days: options.trial_period_days ? options.trial_period_days : 0,
        product: options.product_id,
        currency: options.currency ? options.currency : 'USD'
    });
    return plan;
}

exports.create_customer = async (options) => {
    let create_payload = {
        name: options.fullName,
        email: options.email,
        description: `This is ${options.fullName} details`,
    }

    let address = {};

    if (options.country) {
        address.country = options.country;
    }

    if (options.postal_code) {
        address.postal_code = options.postal_code;
    }

    if (options.line1) {
        address.line1 = options.line1;
    }

    if (options.line2) {
        address.line2 = options.line2;
    }

    if (options.city) {
        address.city = options.city;
    }
    if (options.state) {
        address.state = options.state;
    }

    if (Object.keys(address).length === 0) {
        address = null;
    }

    if (address) {
        create_payload.address = address;
    }

    const create_stripe_customer = await stripe.customers.create(create_payload);
    return create_stripe_customer;
}

exports.create_token = async (options) => {
    const token = await stripe.tokens.create({
        card: {
            number: options.card_number,
            exp_month: options.exp_month,
            exp_year: options.exp_year,
            cvc: options.cvc,
            name: options.fullName,
        }
    });

    return token;
}

exports.create_customer_source = async (options) => {
    const customer_source = await stripe.customers.createSource(
        options.stripe_customer_id,
        { source: options.token_id } // Use this to make this token id card default This always default first card
    );
    return customer_source;
}

// set default card
exports.update_stripe_customer = async (options) => {
    let update_stripe_customer = await stripe.customers.update(
        // To make default added card
        options.stripe_customer_id,
        {
            default_source: options.source_id,
        }
    );

    return update_stripe_customer;
}

// list all cards of customer
exports.list_sources = async (options) => {
    let object = {
        object: 'card',
    }
    if (options.starting_after) {
        object.starting_after = options.starting_after;
    }

    if (options.limit) {
        object.limit = options.limit;
    }

    const cards = await stripe.customers.listSources(
        options.stripe_customer_id,
        object
    );

    return cards;
}

exports.retrieve_source = async (options) => {
    const card = await stripe.customers.retrieveSource(
        options.stripe_customer_id,
        options.card_id
    );
    return card;
}

exports.delete_source = async (options) => {
    const deleted = await stripe.customers.deleteSource(
        options.stripe_customer_id,
        options.card_id
    );
    return deleted;
}

exports.buy_subscription = async (options) => {
    let create_subscription = await stripe.subscriptions.create({
        customer: options.stripe_customer_id,
        default_source: options.card_id,
        collection_method: "charge_automatically",
        coupon: options.coupon,
        items: [
            {
                plan: options.stripe_plan_id,
                quantity: options.quantity ? options.quantity : 1,
            },
        ],
        trial_period_days: options.trial_period_days, // Set to 1 day instant of 7 day on 5 july for testing
        trial_settings: {
            end_behavior: {
                missing_payment_method: 'pause',
            },
        },

    });
    return create_subscription;
}

exports.retrieve_subscrition = async (options) => {
    let retrieve_subscrition = await stripe.subscriptions.retrieve(
        options.stripe_subscription_id
    );
    return retrieve_subscrition;
}

// cancel subscription
exports.delete_subscription = async (options) => {
    const deleted = await stripe.subscriptions.del(
        options.stripe_subscription_id
    );

    return deleted;
}

exports.create_coupon = async (options) => {
    let payload = {}

    if (options.duration) {                       // can be once, forever, or repeating.
        if (options.duration == "repeating") {
            payload.duration = options.duration;
            payload.duration_in_months = options.duration_in_months ? options.duration_in_months : 1;   // if duration is repeating then duration_in_months is required to specify repeating period
        } else if (options.duration == "forever") {
            payload.duration = options.duration;            // Applies to all charges from a subscription with this coupon applied
        } else {
            payload.duration = 'once';
        }
    } else {
        payload.duration = 'once';
    }

    if (options.amount_value && options.discount_type && options.discount_type == "percentage") {
        payload.percent_off = Number(options.amount_value);                      // 
    } else if (options.amount_value && options.discount_type && options.discount_type == "flat") {
        payload.amount_off = Number(options.amount_value) * 100;                       // required if percent_off is not passed
        payload.currency = options.currency ? options.currency : 'USD'  // if amount off then need currency is required 
    }

    if (options.name) {     //Optional, Name of the coupon displayed to customers on, for instance invoices, or receipts. By default the id is shown if name is not set.
        payload.name = options.name;
    }

    if (options.id) { // optional, Unique string of your choice that will be used to identify this coupon when applying it to a customer.
        payload.id = options.id;
    }

    // if (options.max_redemptions) {      // optional, Maximum number of times you can apply this coupon
    //     payload.max_redemptions = Number(options.max_redemptions);
    // }

    if (options.metadata) {                       // optional, Object containing key value pairs to store additional information required by developers
        payload.metadata = options.metadata;
    }

    if (options.applies_to) {                 // optional,Object    A list of product IDs this coupon applies to
        payload.applies_to = options.applies_to;                        // example applies_to : {products : ["product1", "product2"]}
    }

    const coupon = await stripe.coupons.create(payload);
    // console.log(coupon, "-----------coupon");
    return coupon;
}

exports.delete_coupon = async (coupon_id) => {
    const deleted = await stripe.coupons.del(
        coupon_id
    );
    return deleted;
}

exports.update_subscription = async (stripe_subscription_id, options) => {
    const subscription = await stripe.subscriptions.update(
        stripe_subscription_id,
        options
    );
    return subscription;
}

exports.retrieve_upcoming_invoice = async (options) => {
    let payload = {};
    if (options.stripe_customer_id) {
        payload.customer = options.stripe_customer_id
    }

    if (options.stripe_subscription_id) {
        payload.subscription = options.stripe_subscription_id
    }

    const invoice = await stripe.invoices.retrieveUpcoming(payload);
    return invoice;
}

exports.one_time_payment = async (options) => {
    const session = await stripe.checkout.sessions.create({
        // line_items: [
        //     {
        //         price_data: {
        //             currency: 'usd',
        //             product_data: {
        //                 name: options.name,
        //             },
        //             unit_amount: Number(options.amount) * 100,
        //         },
        //         // price: options.stripe_price_id,
        //         quantity: options.qty,
        //     }
        // ],
        line_items: options.line_items,
        discounts: options.discounts,
        mode: 'subscription',
        subscription_data: options.subscription_data,
        success_url: `${credentials.FRONT_WEB_URL}/paymentSuccess?id=${options.metadata.user_id}`,
        cancel_url: `${credentials.FRONT_WEB_URL}/cancel?id=${options.metadata.user_id}`,
        metadata: options.metadata,
        customer_email: options.email
    });
    return session;
}

// exports.one_time_payment = async (options) => {
//     const session = await stripe.checkout.sessions.create({
       
//         line_items: options.line_items,
//         mode: 'subscription',
//         success_url: `${credentials.FRONT_WEB_URL}active-plan?payment=success`,
//         cancel_url: `${credentials.FRONT_WEB_URL}plans`,
//         metadata: options.metadata,
//         customer_email: options.email,
//         discounts:options.discounts
//     });
//     return session;
// }