/**
 * Transactions.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    schema: true,
    attributes: {
        user_id: { model: "users", required: true, },
        paid_to: { model: "users" },
        transaction_type: {
            type: 'string',
            isIn: ["buy_subscription", "bank_account"]
        },

        subscription_plan_id: { model: "subscriptionplans" },
        subscription_id: { model: "subscriptions" },
        transaction_id: { type: "string" },
        stripe_charge_id: { type: "string" },
        currency: { type: "string" },
        amount: { type: 'number' },
        stripe_subscription_id: { type: "string" },
        transaction_status: { type: 'string' },     // pending, successfull
        addedBy: { model: "users", },
        updatedBy: { model: "users", },
        createdAt: { type: "ref", autoCreatedAt: true, },
        updatedAt: { type: "ref", autoUpdatedAt: true, },
        transactions_number: { type: "number" },
        // contract_id: { model: "contracts" },



        //paypal
        paypal_transaction_id: { type: "string" },
        paypal_transaction_status: { type: 'string' },


        //Transfer in bank
        // chargeId: { type: "string" },



    },
    beforeCreate: async function (data, next) {
        let count = await Transactions.count({});
        if (count) {
            data.transactions_number = 1 + count;
        } else {
            data.transactions_number = 1;
        }
        next(false, data);


    }
};
