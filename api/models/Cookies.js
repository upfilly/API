/**
 * Cookies.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {

    affiliate_id: { model: "users" },
    affiliate_link: { type: "string" },
    ip_address: { type: "string" },
    location: { type: "string" },
    device: { type: "string" },
    browser: { type: "string" },
    address: { type: 'string' },
    country: { type: 'string' },
    state: { type: 'string' },
    city: { type: 'string' },
    pincode: { type: 'string' },
    lat: { type: 'string' },
    lng: { type: 'string' },
    os: { type: 'string' },         // Operating system
    timezone: { type: 'string' },
    isSet:{ type: 'Boolean', defaultsTo: false },

    addedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },

  },

};

