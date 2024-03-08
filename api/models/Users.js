/**
 * Users.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */
var bcrypt = require('bcrypt-nodejs');
module.exports = {
  schema: true,
  attributes: {

    firstName: { type: 'string' },
    lastName: { type: 'string' },
    fullName: { type: 'string' },
    brand_name: { type: 'string' },

    email: { type: 'string' },
    dialCode: { type: 'string' },
    cellDialCode: { type: 'string' },
    mobileNo: { type: 'string' },
    image: { type: 'string' },
    logo: { type: 'string' },
    banner_image: { type: 'string' },
    password: { type: 'string', columnName: 'encryptedPassword', minLength: 8 },
    gender: { type: 'string', isIn: ["male", "female", "transgender", "others"] },
    isVerified: { type: 'string', isIn: ['Y', 'N'], defaultsTo: 'N', },
    role: { type: 'string', isIn: ['brand', 'admin', 'affiliate', 'team', 'accountExecutive', 'parterManager', 'customer'], },
    address: { type: "string" },
    country: { type: 'string' },
    state: { type: 'string' },
    city: { type: 'string' },
    pincode: { type: 'string' },
    description: { type: "string" },
    plan_id: {
      model: 'subscriptionplans'
    },
    subscription_id: {
      type: 'string'
    },
    affiliate_group: { model: 'affiliatemanagement' },
    social_media_platforms: { type: "json", defaultsTo: [] },
    tags: { type: "json", defaultsTo: [] },

    category_id: { model: "commoncategories" },
    updated_password: { type: 'string' },

    // youtube_email: { type: 'string' },
    youtube_username: { type: 'string' },
    youtube_profile_link: { type: 'string' },
    // youtube_channel_id: { type: 'string' },
    // youtube_followers: { type: 'number', defaultsTo: 0 },

    // twitter_email: { type: 'string' },
    twitter_username: { type: 'string' },
    twitter_profile_link: { type: 'string' },
    // twitter_followers: { type: 'number', defaultsTo: 0 },

    // facebook_email: { type: 'string' },
    facebook_username: { type: 'string' },
    facebook_profile_link: { type: 'string' },
    // facebook_followers: { type: 'number', defaultsTo: 0 },

    // instagram_email: { type: 'string' },
    instagram_username: { type: 'string' },
    instagram_profile_link: { type: 'string' },
    // instagram_followers: { type: 'number', defaultsTo: 0 },

    // pinterest_email: { type: 'string' },
    pinterest_username: { type: 'string' },
    pinterest_profile_link: { type: 'string' },
    // pinterest_followers: { type: 'number', defaultsTo: 0 },

    // linkedin_email: { type: 'string' },
    linkedin_username: { type: 'string' },
    linkedin_profile_link: { type: 'string' },
    // linkedin_followers: { type: 'number', defaultsTo: 0 },

    // snapchat_email: { type: 'string' },
    snapchat_username: { type: 'string' },
    snapchat_profile_link: { type: 'string' },
    // snapchat_followers: { type: 'number', defaultsTo: 0 },

    verificationCode: { type: 'string', allowNull: true },
    last_vc_updated_at: { type: 'ref', columnType: 'datetime' },

    status: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: 'active', },
    domain: { type: 'string', isIn: ['web', 'ios', 'andriod'], defaultsTo: 'web' },
    createdAt: { type: 'ref', autoCreatedAt: true, },
    updatedAt: { type: 'ref', autoUpdatedAt: true },
    isDeleted: { type: 'Boolean', defaultsTo: false },
    addedBy: { model: 'users' },
    deletedBy: { model: 'users' },
    updatedBy: { model: 'users' },
    website: { type: 'string' },
    phone: { type: 'json' },

    stripe_customer_id: { type: 'string' },
    account_id: { type: 'string' },

    last_login: { type: 'ref', columnType: 'datetime' },
    terms_and_conditions: { type: 'Boolean', defaultsTo: false },
    is_imported: { type: 'string', isIn: ['Y', 'N'], defaultsTo: 'N', },
    lat: { type: 'string' },
    lng: { type: 'string' },
    location: { type: "json" },
    languages: { type: "json" },
    // dob: { type: 'ref', columnType: 'datetime' },
    isOnline: { type: 'Boolean', defaultsTo: false },
    device_token: { type: 'string' },
    is_profile_claimed: { type: 'Boolean', defaultsTo: false },
    avg_rating: { type: "number", defaultsTo: 0 },
    total_reviews: { type: "number", defaultsTo: 0 },
    referral_code: { type: 'string' },
    my_code: { type: 'string' },
    total_credits: { type: "number", defaultsTo: 0 },
    remaining_credits: { type: "number", defaultsTo: 0 },
    analytics_fetched: { type: 'Boolean', defaultsTo: false },

    facebook_auth_id: { type: 'string' },
    google_auth_id: { type: 'string' },
    isTrusted: { type: 'Boolean', defaultsTo: false },
    isFeatured: { type: 'Boolean', defaultsTo: false },

    // Company details for brand
    company_name: { type: 'string' },
    company_email: { type: 'string' },
    company_address: { type: 'string' },
    company_country_code: { type: 'string' },
    company_dial_code: { type: 'string' },
    company_mobile_no: { type: 'string' },
    is_mobile_verified: { type: 'Boolean', defaultsTo: false },


    //Paypal
    paypal_customer_id: { type: 'string' },
    paypal_subscription_id: { type: 'string' },
    paypal_plan_id: { type: 'string' },
    paypal_email: { type: 'string' },


    //Extra keys for steps
    createdByBrand: { model: "users" },
    parter_manager_id: { model: "users" },
    account_executive_id: { model: "users" },
    refferedBy: { type: 'string', isIn: ['active', 'deactive'], defaultsTo: 'active', },
    labels: { type: 'string' },
    currency: { type: 'string' },
    allow_notification: { type: 'Boolean', defaultsTo: false },
    is_enable_mediacost: { type: 'Boolean', defaultsTo: false },
    address2: { type: "string" },
    auto_invoice: { type: 'Boolean', defaultsTo: false },
    is_hide_invoice: { type: 'Boolean', defaultsTo: false },
    billing_frequency: { type: 'string' },
    payment_method: { type: 'string' },
    tax_detail: { type: 'string' },
    default_invoice_setting: { type: 'string' },
    title: { type: 'string' },
    work_phone: { type: 'string' },
    language: { type: 'string' },
    time_zone: { type: 'string' },
    instant_messaging: { type: 'string' },
    isSendActivationEmail: { type: 'Boolean', defaultsTo: false },
    isSetPasswordManually: { type: 'Boolean', defaultsTo: false },
    isPayment: { type: 'Boolean', defaultsTo: false },
    reffering_affiliate: { type: 'string' },//brand email
    affiliate_code: { type: "string" },
    reffer_domain: { type: "string" },
    // invite_status: { type: 'string', isIn: ['onboard', 'invited'], defaultsTo: 'invited', },


    //Affiliate
    affiliate_link: { type: "string" },
    affilaite_unique_id: { type: "string" },
    campaign_unique_id: { type: "string" },

    //Affiliate bank details
    accountholder_name: { type: "string" },
    routing_number: { type: "string" },
    ssn_number: { type: "string" },
    account_number: { type: "string" },
    dob: { type: "json" },
    front_image: { type: "string" },
    back_image: { type: "string" },


  },

  beforeCreate: function (user, next) {
    // console.log(user,"--------------user");
    if (user.firstName || user.lastName) {
      user.fullName = user.firstName + ' ' + user.lastName;
    }
    // console.log(user,"--------------user");
    if (user.email) {
      user.email = user.email.toLowerCase();
    }

    if (user.hasOwnProperty('password')) {
      user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(10));
      next(false, user);
    } else {
      next(null, user);
    }
  },
  authenticate: function (email, password) {
    console.log('in auth    ');
    var query = {};
    query.email = email;
    query.$or = [{ roles: ['SA', 'A'] }];

    return Users.findOne(query)
      .populate('roleId')
      .then(function (user) {
        //return API.Model(Users).findOne(query).then(function(user){
        return user && user.date_verified && user.comparePassword(password)
          ? user
          : null;
      });
  },
  customToJSON: function () {
    // Return a shallow copy of this record with the password and ssn removed.
    return _.omit(this, ['password', 'verificationCode']);
  },
};
