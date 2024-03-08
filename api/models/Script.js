/**
 * Script.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
    schema: true,
    attributes: {
        script_content: { type: "string" },
        script_type: { type: "string" },
        status: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: 'active', },
        addedBy: { model: "users", },
        updatedBy: { model: 'users' },
        isDeleted: { type: 'Boolean', defaultsTo: false },
        createdAt: { type: 'ref', autoCreatedAt: true },
        updatedAt: { type: 'ref', autoUpdatedAt: true },
    },

};

