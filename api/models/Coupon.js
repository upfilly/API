// api/models/Coupon.js

module.exports = {
  attributes: {
    // Media to assign to user
    media: { // here media refers to affiliate 
      model: "users",
    },

    // Unique Coupon Code
    couponCode: {
      type: "string",
      unique: true,
      required: true,
    },

    // Coupon Type
    couponType: {
      type: "string",
      required: true,
    },

    // Start Date
    startDate: {
      type: "ref",
      columnType: "datetime",
      required: true,
    },

    // Expiration Date
    expirationDate: {
      type: "ref",
      columnType: "datetime",
      required: true,
    },

    // Commission Type: Percentage Commission, Fixed amount
    commissionType: {
      type: "string",
      isIn: ["Percentage Commission", "Fixed amount"],
      required: true,
    },

    // Applicable Products or Categories
    applicable: {
      type: "json",
      columnType: "array",
    },

    // Public or Private
    visibility: {
      type: "string",
      isIn: [
        "Public",
        "Exclusive to specific affiliate",
        "Exclusive to group of affiliates",
        "Excluded from a specific affiliate",
        "Excluded from a group of affiliates",
      ],
      required: true,
    },

    // Status: Enabled/Disabled
    status: {
      type: "string",
      isIn: ["Enabled", "Disabled"],
      required: true,
    },

    // URL
    url: {
      type: "string",
      required: true,
      isURL: true,
    },

    // Coupon commission
    couponCommission: {
      type: "number",
      required: true,
    },
    addedBy: { model: "users" },
    updatedBy: { model: "users" },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
    isDeleted: { type: "Boolean", defaultsTo: false },
  },
};
