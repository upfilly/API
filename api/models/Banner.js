/**
 * Banner.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    title: { type: "string" },
    destination_url: { type: "string" },
    affiliate_id:{type:"string"},
    description: { type: "string" },
    seo_attributes: { type: "string" },
    access_type: { type: "string" },
    activation_date: { type: "ref", columnType: "datetime" },
    availability_date: { type: "ref", columnType: "datetime" },
    expiration_date: { type: "ref", columnType: "datetime" },
    image: { type: "string" },
    is_animation: { type: "Boolean", defaultsTo: false },
    is_deep_linking: { type: "Boolean", defaultsTo: false },
    mobile_creative: { type: "Boolean", defaultsTo: false },
    category_id: { model: "commoncategories" },
    //Common keys
    isDeleted: { type: "Boolean", defaultsTo: false },
    status: {
      type: "string",
      isIn: ["active", "deactive"],
      defaultsTo: "active",
    },
    updatedBy: { model: "users" },
    addedBy: { model: "users" },
    createdAt: { type: "ref", autoCreatedAt: true },
    updatedAt: { type: "ref", autoUpdatedAt: true },
  },

  afterCreate: async function (newlyInsertedRecord, proceed) {
    await AuditService.log(
      'create',
      'Banners',
      null,
      newlyInsertedRecord,
      newlyInsertedRecord.addedBy// or fetch from the session if available
    );
    return proceed();
  },
  beforeUpdate: async function (newlyInsertedRecord, proceed) {
    let isExists = await Banners.findOne({id:newlyInsertedRecord.id,isDeleted:false})
    if(isExists){
      await AuditService.log(
        'update',
        'Banners',
        isExists,
        newlyInsertedRecord,
        newlyInsertedRecord.addedBy// or fetch from the session if available
      );
    }
    return proceed();
  },

  // afterDestroy: async function (destroyedRecords, proceed) {
  //   for (let record of destroyedRecords) {
  //     await AuditService.log(
  //       'delete',
  //       'Banners',
  //       record.previousState,
  //       null,
  //       'system' // or fetch from the session if available
  //     );
  //   }
  //   return proceed();
  // },
/**
 * 
 * beforeUpdate: async function (valuesToUpdate, proceed) {
    const previousState = await User.findOne(valuesToUpdate.id);
    valuesToUpdate.previousState = previousState;
    return proceed();
  },

  afterUpdate: async function (updatedRecord, proceed) {
    await AuditService.log(
      'update',
      'User',
      updatedRecord.previousState,
      updatedRecord,
      'system' // or fetch from the session if available
    );
    return proceed();
  },

  beforeDestroy: async function (criteria, proceed) {
    const previousState = await User.findOne(criteria.where.id);
    criteria.previousState = previousState;
    return proceed();
  },

  afterDestroy: async function (destroyedRecords, proceed) {
    for (let record of destroyedRecords) {
      await AuditService.log(
        'delete',
        'User',
        record.previousState,
        null,
        'system' // or fetch from the session if available
      );
    }
    return proceed();
  },

  afterCreate: async function (newlyInsertedRecord, proceed) {
    await AuditService.log(
      'create',
      'User',
      null,
      newlyInsertedRecord,
      'system' // or fetch from the session if available
    );
    return proceed();
  },
 * 
 * 
 */

};
