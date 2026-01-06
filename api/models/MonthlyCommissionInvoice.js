/**
 * MonthlyCommissionInvoice.js
 *
 * @description :: Monthly affiliate commission invoice model
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,

  attributes: {
    // Invoice details
    invoice_number: {
      type: "string",
      required: true,
      unique: true,
    },
    affiliate_id: {
      model: "users",
    },
    month: {
      type: "number",
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: "number",
      required: true,
    },
    total_commission: {
      type: "number",
      defaultsTo: 0,
    },

    total_amount: {
      type: "number",
      defaultsTo: 0,
    },
    commission_count: {
      type: "number",
      defaultsTo: 0,
    },
    invoice_url: {
      type: "string",
    },
    // Status: pending | processing | paid | failed
    status: {
      type: "string",
      isIn: ["pending", "processing", "paid", "failed"],
      defaultsTo: "pending",
    },
    details: {
      type: "json",
      defaultsTo: [],
    },
    paid_at: {
      type: "ref",
      columnType: "datetime",
    },

    transaction_id: {
      model: "transactions",
    },
    isDeleted: {
      type: "boolean",
      defaultsTo: false,
    },
    createdAt: {
      type: "ref",
      autoCreatedAt: true,
    },
    updatedAt: {
      type: "ref",
      autoCreatedAt: true,
    },
  },
};
