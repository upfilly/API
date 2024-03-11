module.exports = {
    schema: true,
    attributes: {
        role: { type: "string", isIn: ['brand', 'admin', 'subadmin'] },
        createdAt: { type: "ref", autoCreatedAt: true },
        updatedAt: { type: "ref", autoUpdatedAt: true },
    },
};