module.exports = {
    schema: true,
    attributes: {
        user_id:{model:"users"},
        filePath:{type:"string"},
      addedBy: { model: 'users' },
      updatedBy: { model: 'users' },
      isDeleted: { type: 'Boolean', defaultsTo: false },
      createdAt: { type: 'ref', autoCreatedAt: true },
      updatedAt: { type: 'ref', autoUpdatedAt: true },
    },
  };