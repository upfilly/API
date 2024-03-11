/**
 * Countries.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    schema: true,
    attributes: {
        name: { type: "string" },
        isoCode: { type: "string" },
        flag: { type: "string" },
        phonecode: { type: "string" },
        currency: { type: "string" },
        latitude: { type: "string" },
        longitude: { type: "string" },
        timezones: { type: "json" },
        updatedBy: { model: "users", },
        createdAt: { type: "ref", autoCreatedAt: true, },
        updatedAt: { type: "ref", autoUpdatedAt: true, },
    }
};
