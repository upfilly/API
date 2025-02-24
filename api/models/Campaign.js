/**
 * Campaign.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 * 
 * pending : when influencer start campaign then bydefault it will be pending
 * accepted : After influencer start campaign then brand will be accept this
 * need_improvement : brand can request to improve the campaign and this status will be changed after accepted/improved/need_improvement only
 * improved : when influencer fullfill the need_improvement things then he can change status to improved but need_improvement and improved cycle can go infinite.
 */

module.exports = {
    schema: true,
    attributes: {
        brand_id: { model: "users" },
        parent_id:{model:'users'},
        parent_role:{type: "string" },
        // affiliate_id: { collection: "users", via: "id" },
        name: { type: "string" },
        description: { type: "string" },
        images: { type: "json", columnType: "array" },
        documents: { type: "json", columnType: "array" },
        videos: { type: "json", columnType: "array" },
        access_type: { type: 'string', isIn: ['public', 'private'], defaultsTo: 'private' },
        // reason: { type: "string" },
        // accepted_at: { type: 'ref', columnType: 'datetime' },
        amount: { type: 'number', defaultsTo: 0 },
        event_type: { type: "json", defaultsTo: [] },
        campaign_unique_id: { type: "string" },
        // campaign_link: { type: "json", defaultsTo: [] },
        // new key added for campaign commission to show in campaign listing
        commission : {type: 'number',defaultsTo: 0},
        commission_event_type : {type: 'string',isIn:["lead","purchase","visitor"]},
        commission_type : {type: 'string',isIn:["amount","percentage"]},
        addedBy: { model: "users", },
        updatedBy: { model: "users", },
        createdAt: { type: "ref", autoCreatedAt: true, },
        updatedAt: { type: "ref", autoUpdatedAt: true, },
        isDefault: {type: 'Boolean', defaultsTo: false},
        isDeleted: { type: 'Boolean', defaultsTo: false },
        // new keys 
        category : {type:"json"},
        sub_category: {type:"json"},
        category_type : {type:"string"},
        sub_child_category : {type: "json"},
        region : {type:"json"},
    },

};
