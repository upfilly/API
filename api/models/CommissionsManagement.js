/**
 * CommissionsManagement.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    plan_id: { model: 'subscriptionplans' },
    event_type: { type: "string", isIn: ["lead", "visitor", "purchase", "line-item"] },
    amount_type: { type: "string", isIn: ["percentage", "amount"] },
    amount: { type: 'number', defaultsTo: 0 },
    affiliate_group: { model: 'affiliatemanagement' },
    campaign: { model: 'campaign' },
    time_frame_type: { type: "string", isIn: ["day", "month"] },
    time_frame: { type: 'number', defaultsTo: 0 },
    status: { type: "string", isIn: ["completed", "pending",], defaultsTo: "pending" },
    due_date: { type: 'ref', columnType: 'datetime' },

    //Common keys
    isDeleted: { type: 'Boolean', defaultsTo: false }, deletedBy: { model: 'users' },
    deletedAt: { type: 'ref', columnType: 'datetime' },
    updatedBy: { model: 'users' },
    addedBy: { model: 'users' },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  },

};

