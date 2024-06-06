
module.exports = {

    attributes: {
      affiliate_id: { model: "users" },
      brand_id:{model:"users"},
      status: { type: 'string', isIn: ['accepted', 'rejected','pending'], defaultsTo: 'pending', },
      message: { type: 'string'},
      addedBy: { model: "users" },
      updatedBy: { model: "users" },
      createdAt: { type: "ref", autoCreatedAt: true },
      updatedAt: { type: "ref", autoUpdatedAt: true },
      isDeleted: { type: 'Boolean', defaultsTo: false }
    },
  
  };
  