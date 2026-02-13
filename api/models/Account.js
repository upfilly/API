module.exports = {
  schema: true,
  attributes: {
    status: { type: "string", defaultsTo: "active" },
    accountId: { type: "string" },
    addedBy: { model: "users" },
    transfer: { type: "string" },
    account_holder_name: { type: "string" },
    bank_name: { type: "string" },
    country: { type: "string" },
    currency: { type: "string" },
    accountStatus: { type: "string" },
    reason: { type: "string" },
    routingNumber: { type: "number" },
    bankAccountNumber: { type: "number" },
    isDeleted: { type: "boolean", defaultsTo: false },
    isActive: { type: "boolean", defaultsTo: true },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
    // New fields
    legalName: { type: "string" },
    address: { type: "json" }, // Stores the full address object
    vatOrEin: { type: "string" },
  },
};
