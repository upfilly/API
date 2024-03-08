/**
 * Discount.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    discount_type: { type: "string", isIn: ['percentage', 'flat'], required: true },
    name: { type: "string" },
    duration: { type: "string", isIn: ["once", "repeating", "forever"], defaultsTo: "once" },
    duration_in_months: { type: "Number", defaultsTo: 0 },
    stripe_coupon_id: { type: "string" },
    amount_value: { type: "Number", defaultsTo: 0 },
    // amount_off: { type: "Number", defaultsTo: 0 },
    total_amount: { type: "Number", defaultsTo: 0 },
    max_redemptions: { type: "Number", defaultsTo: 1 },
    user_id: { model: "users" },
    addedBy: { model: "users" },
    status: {
      type: 'string',
      isIn: ['active', 'deactive'],
      defaultsTo: 'active'
    },
    discount_status: { type: "string", isIn: ["pending", "used"], defaultsTo: "pending" },
    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  },
};