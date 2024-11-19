/**
 * CampaignAffiliate.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 * 
 *  
*/
module.exports = {
    schema: true,
    attributes: {
        brand_id: { model: "users" },
        campaign_id: {model: "campaign"},
        affiliate_id: { model: "users" },
        // name: { type: "string" },
        // description: { type: "string" },
        // images: { type: "json", columnType: "array" },
        // documents: { type: "json", columnType: "array" },
        // videos: { type: "json", columnType: "array" },
        // access_type: { type: 'string', isIn: ['public', 'private'], defaultsTo: 'private' },
        status: { type: 'string', isIn: ['pending', 'accepted', "rejected"], defaultsTo: 'pending' },
        // reason: { type: "string" },
        accepted_at: { type: 'ref', columnType: 'datetime' },
        // amount: { type: 'number', defaultsTo: 0 },
        // event_type: { type: "json", defaultsTo: [] },
        // campaign_unique_id: { type: "string" },
        // addedBy: { model: "users", },
        // updatedBy: { model: "users", },
        createdAt: { type: "ref", autoCreatedAt: true, },
        updatedAt: { type: "ref", autoUpdatedAt: true, },
        isDeleted: { type: 'Boolean', defaultsTo: false }
    },
};
