/**
 * Faq.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

    schema: true,
    attributes: {

        question: { type: 'string', required: true },
        answer: { type: "string" },
        content_id:{model: 'contentmanagement' },
        category_id: { model: 'commoncategories' },
        sub_category_id: { model: 'commoncategories' },
        video: { type: "string" },
        status: {
            type: 'string',
            isIn: ['active', 'deactive'],
            defaultsTo: "active",
        },
        // Common Keys
        addedBy: { model: 'users' },
        updatedBy: { model: 'users' },
        isDeleted: { type: 'Boolean', defaultsTo: false },
        createdAt: { type: 'ref', columnType: 'datetime' },
        updatedAt: { type: 'ref', columnType: 'datetime' },
    },


};

