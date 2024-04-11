/**
 * Tax.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    tax_name: { type: "string" },
    tax_classification: { type: 'string', isIn: ['individual', 'business'], defaultsTo: 'individual' },
    social_security_number: { type: "string" },
    federal_text_classification: { type: "string" },
    is_us_citizen: { type: "boolean", defaultsTo: false },
    consent_agreed: { type: "boolean", defaultsTo: false },
    signature: { type: "string" },
    ein: { type: "string" },
    trade_name: { type: "string" },
    signature_date: { type: 'ref', columnType: 'datetime' },


    user_id: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    updatedBy: { model: 'users' },
    createdAt: { type: 'ref', autoCreatedAt: true, },
    updatedAt: { type: 'ref', autoUpdatedAt: true },


  },

};

