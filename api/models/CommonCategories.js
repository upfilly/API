/**
 * BussinessType.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    schema: true,
    attributes: {
        name: {
            type: 'string',
        },
        cat_type: {
            type: 'string',
            isIn: ["faq", "blog", "product"]
        },
        type: {
            type: 'string',
            isIn: ["sub", "main"]
        },
        parent_id: {
            model: "commoncategories"
        },
        isPopular: {
            type: 'Boolean',
            defaultsTo: false
        },
        status: {
            type: 'string',
            isIn: ['active', 'deactive'],
            defaultsTo: "active",
        },
        isDeleted: {
            type: 'Boolean',
            defaultsTo: false
        },
        addedBy: {
            model: 'users'
        },
        updatedBy: {
            model: 'users'
        },
        createdAt: {
            type: "ref",
            autoCreatedAt: true,
        },
        updatedAt: {
            type: "ref",
            autoUpdatedAt: true,
        },

    },

};

