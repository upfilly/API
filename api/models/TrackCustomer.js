/**
 * TrackCustomer.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {

    affiliate_id: { model: "users" },
    affiliate_link: { type: "string" },
    track_to: { type: 'string', isIn: ["customer",] },
    type: { type: 'string', isIn: ["new_customer", "returning_customer"] },
    clicks: { type: "number", defaultsTo: 0 },

    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },

};

