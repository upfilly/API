module.exports = {
    schema: true,
    attributes: {
        transferredAmount: {type: "number"},
        paidTo: { model: "users" },
        currency: {type: "string"},
        transferId: {type: "string"},
        accountId: {type: "string"},
        status: { type: "string", defaultsTo: "active" },
        transferredAt: {type: 'ref', columnType: "DateTime"},
        isDeleted: { type: "boolean", defaultsTo: false },
        createdAt: { type: 'ref', autoCreatedAt: true },
        updatedAt: { type: 'ref', autoUpdatedAt: true }
    }
  };