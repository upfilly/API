/**
 * Settings.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,
  attributes: {
    logo: { type: 'string' },
    fav_icon: { type: 'string' },

    //Website
    website_email: { type: 'string' },

    // Company details
    company_name: { type: 'string' },
    company_email: { type: 'string' },
    company_address: { type: 'string' },
    company_country_code: { type: 'string' },
    company_dial_code: { type: 'string' },
    company_mobile_no: { type: 'string' },

    //Support details
    support_email: { type: 'string' },

    sales_tax: { type: "Number", defaultsTo: 0 },
    brand_fee: { type: "Number", defaultsTo: 0 },
    earning_fee: { type: "Number", defaultsTo: 0 },

    // SEO meta tags
    site_name: { type: 'string' },
    meta_title: { type: 'string' },
    meta_description: { type: 'string' },

    google_api_key: { type: 'string' },
    copy_right: { type: 'string' },

    updatedBy: { model: 'users' },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    createdAt: { type: 'ref', autoCreatedAt: true },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
  },
};

