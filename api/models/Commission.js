/**
 * Commission.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  schema: true,
  attributes: {
    commission: { type: "string", isIn: ["manual"] },
    upload_method: { type: "string", isIn: ["single", "batch"] },
    commission_type: { type: "string", isIn: ["sales", "lead"] },
    publisher_id: { type: 'number', defaultsTo: 0 },
    amount_of_sale: { type: 'number', defaultsTo: 0 },
    amount_of_commission: { type: 'number', defaultsTo: 0 },
    order_reference: { type: "string" },
    click_ref: { type: "string" },
    affiliate_id: { model: 'users' },                                     //publisher only
    is_send_email_to_publisher: { type: 'Boolean', defaultsTo: false },
    batch_file: { type: "string" },
    locality: { type: "string" },
    isContain_headers: { type: "string", isIn: ["yes", "no"], defaultsTo: "no" },
    status: { type: "string", isIn: ["confirmed", "pending"], defaultsTo: "pending" },

    //Common keys
    isDeleted: { type: 'Boolean', defaultsTo: false },
    deletedBy: { model: 'users' },
    deletedAt: { type: 'ref', columnType: 'datetime' },
    updatedBy: { model: 'users' },
    addedBy: { model: 'users' },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  },

};

