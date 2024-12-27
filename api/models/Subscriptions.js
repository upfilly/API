/**
  * Subscriptions.js
*/
module.exports = {
    schema: true,
    attributes: {
        user_id: { model: "users", required: true },
        stripe_subscription_id: { type: "string" },
        subscription_plan_id: { model: "subscriptionplans" },
        status: {
            type: "string",
            isIn: ["active", "cancelled", "inactive"],           // 1 for active, 2 for cancelled, inactive : cancelled but billing cycle not ended
            defaultsTo: "active"
        },

        name: { type: 'string' },
        amount: { type: 'number', defaultsTo: 0 },

        interval: { type: 'string', isIn: ['month', 'year', 'week', 'day'] },
        interval_count: { type: 'number', defaultsTo: 1 },
        trial_period_days: { type: 'number', defaultsTo: 0 },
        valid_upto: { type: 'ref', columnType: "datetime" },
        special_plan_id: { model: "subscriptionplans" },
        // trial_period_end_date: { type: 'ref', columnType: "datetime" },


        //paypal keys
        paypal_email: { type: 'string' },
        next_billing_date: { type: 'ref', columnType: "datetime" },
        paypal_subscription_id: { type: 'string' },
        paypal_plan_id: { type: 'string' },
        subscription_status: { type: 'string' },

        // common fields
        addedBy: { model: "users", },
        updatedBy: { model: "users", },
        createdAt: { type: 'ref', autoCreatedAt: true },
        updatedAt: { type: 'ref', autoUpdatedAt: true },
        // coupons: { type: 'json', columnType :"array" },
        // coupon_id: { model: "coupons" }

    }
};
