module.exports = {
    schema: true,
    attributes: {
        type: { type: 'string', isIn: ["contract"], required: true },
        user_id: { model: 'users' },
        // contract_id: { model: 'contracts' },
        isDeleted: { type: 'Boolean', defaultsTo: true },
        createdAt: { type: 'ref', autoCreatedAt: true },
        updatedAt: { type: 'ref', autoUpdatedAt: true },
        updatedBy: { model: 'users' },
    }
};