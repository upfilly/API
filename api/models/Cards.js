/**
 * Card.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */


module.exports = {
    schema: true,
    attributes: {
        card_id: { type: "string" },
        isPrimary: { type: "Boolean", defaultsTo: false },
        last4: {
            type: "string",
        },
        user_id: { model: "users" },
        addedBy: { model: 'users' },
        updatedBy: { model: 'users' },
        isDeleted: { type: 'Boolean', defaultsTo: false },
        createdAt: { type: 'ref', autoCreatedAt: true },
        updatedAt: { type: 'ref', autoUpdatedAt: true },
    }
};