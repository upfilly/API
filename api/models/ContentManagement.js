/**
 * Content Management.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    schema: true,
    attributes: {
        // title: { type: "string", isIn: ["contact-us", "privacy-policy", "terms-and-conditions","about-us"] },
        title: { type: "string" },
        image: { type: "string" },
        description: { type: "string" },
        meta_title: { type: "string" },
        meta_description: { type: "string" },
        meta_key: { type: "string" },
        isDeleted: { type: 'Boolean', defaultsTo: false },
        status: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: 'active', },
        updatedBy: { model: 'users' },
        addedBy: { model: 'users' },
        createdAt: { type: 'ref', autoCreatedAt: true },
        updatedAt: { type: 'ref', autoUpdatedAt: true },
    },
};

