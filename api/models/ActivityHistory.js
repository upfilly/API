/**
 * ActivityHistory.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {

  attributes: {
    module: {
      type: "string",
      isIn: [
        'emailmessagetemplate',
        'marketplace_product',
        'untrack_sales',
        'generate_link',
        'users',
        'campaign',
        'banner',
        'coupon'

      ]
    },
    type: { type: "string", isIn: ['created', 'updated', 'deleted'] },
    user_id: { model: "users" },
    account_manager_id: { model: "users" },
    changed_id: { type: "string" },
    old_data: { type: "json", },
    new_data: { type: "json", },
    data: { type: "json", },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },

};

