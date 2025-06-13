/**
 * AffiliateLink.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
// api/models/AffiliateProgram.js

module.exports = {
  schema: true,
  attributes: {
    affiliate_id: { model: "users" },
    brand_id: { model: "users" },

    campaignId: {model: "campaign"},
    discount: {type: "json"},
    link: { type: "string" },
    order_id: { type: "string" },
    currency: { type: "string" },
    price: { type: "number" },

    event: {
      type: 'string',
    },
    timestamp: {
      type: 'string',
    },
    urlParams: {
      type: 'json',

    },
    data: {
      type: 'json',
    },
    addedBy: { model: "users" },
    updatedBy: { model: "users" },
    createdAt: { type: "ref", autoCreatedAt: true, },
    updatedAt: { type: "ref", autoUpdatedAt: true, },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    // keys for commission approved and reject by brand and these below keys are used for bran
    commission_status : {type:"string",isIn:["pending","accepted","rejected"],defaultsTo:"pending"},
    commission_paid : {type:'string',isIn:["pending", "paid", "unPaid"],defaultsTo:"pending"},
    admin_paid : {type : "string",isIn:["pending", "paid", "not_paid"],defaultsTo:"pending"},
    lead_id : {type:"string"},
    // manual_commission keys
    amount_of_sale: { type: 'number', defaultsTo: 0 },
    amount_of_commission: { type: 'number', defaultsTo: 0 },
    commission_type: { type: "string", isIn: ["sales", "lead","bonus"] },
    order_reference: {type:"string"},
  }
};

