module.exports = {
    schema: false,
    attributes: {
        isDeleted: {type: 'Boolean', defaultsTo: false},
        createdAt: {
            type: 'ref', // Use 'ref' to ensure correct handling by the database
            columnType: 'datetime', // Or 'timestamp' depending on the DB
            autoCreatedAt: true,    // Enable auto timestamping
          },
          updatedAt: {
            type: 'ref',
            columnType: 'datetime',
            autoUpdatedAt: true,    // Enable auto timestamping
          },
    }
};
  