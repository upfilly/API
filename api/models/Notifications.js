/**
 * Notifications.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    type: { type: 'string', isIn: ["subscription", "contract", "campaign", "hiring", "profile_claim", "message", "campaign_result", "referral", "points", "product_assign", "make_offer"] },
    addedBy: { model: 'users' },
    send_to: { model: 'users' },
    title: { type: 'string' },
    message: { type: 'string' },
    status: { type: "string", isIn: ["read", "unread"], defaultsTo: "unread" },
    updatedBy: { model: "users", },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
    isDeleted: { type: 'Boolean', defaultsTo: false },

    // invite_id: { model: 'hirings' },
    // contract_id: { model: 'contracts' },
    campaign_id: { model: 'campaign' },
    product_id: { model: 'campaign' },
    subscription_plan_id: { model: "subscriptionplans" },
    // campaign_result_id : { model: 'campaignresults'},
    // referral_id : { model: 'referrals'},
    // points_id : { model: 'points'},

  },

};

