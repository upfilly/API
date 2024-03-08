/**
 * Plans.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */


module.exports = {
    schema: true,
    attributes: {
        name: { type: 'string', required: true },
        amount: { type: 'number', defaultsTo: 0 },
        plan_type: {
            type: 'string',
            isIn: ['paid', 'free'],
        },
        payment_type: {
            type: "string",
            isIn: ['trial', 'recurring']
        },

        status: {
            type: 'string',
            isIn: ['active', 'deactive'],
            defaultsTo: 'active'
        },

        interval: { type: 'string', isIn: ['month', 'year', 'week', 'day'] },
        interval_count: { type: 'number', defaultsTo: 1 },

        isUpcoming: { type: "Boolean", defaultsTo: false },
        stripe_plan_id: { type: 'string', },
        stripe_product_id: { type: 'string', },
        stripe_price_id: { type: "string" },
        user_id: { model: "users", },
        discount_id: { model: "discount" },
        number_of_affiliate: { type: 'number', defaultsTo: 0 },
        upcoming_date: { type: "ref", columnType: "datetime" },
        features: { type: "json", defaultsTo: [], },
        recommended: { type: 'string', isIn: ['Y', 'N'], defaultsTo: 'N', },
        isChecked: { type: "Boolean", defaultsTo: false },
        currency: { type: "string" },

        //Paypal keys

        // billing_frequency: { type: "number", defaultsTo: 0 },
        // currency_iso_code: { type: "string" },
        // price: { type: "string" },
        // merchantId: { type: "string" },
        trial_period_days: { type: 'number', defaultsTo: 0 },
        // paypal_plan_id: { type: 'string' },
        // paypal_product_id: { type: 'string' },



        // common feilds
        addedBy: { model: 'users' },
        updatedBy: { model: 'users' },
        isDeleted: { type: 'Boolean', defaultsTo: false },
        createdAt: { type: 'ref', autoCreatedAt: true },
        updatedAt: { type: 'ref', autoUpdatedAt: true },
    }
};
