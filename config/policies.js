/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions, unless overridden.       *
  * (`true` allows public access)                                            *
  *                                                                          *
  ***************************************************************************/

  '*': 'isAuthorized',


  UsersController: {
    // 'adminSignin': true,     
    'register': true,
    'userSignin': true,
    'verifyUser': true,
    'checkEmail': true,
    'forgotPassword': true,
    'resetPassword': true,
    'adminSignin': true,
    'userDetails': true,
    "forgotPasswordFrontend": true,
    userAutoLogin: true,
    getUserByEmail: true,
    userSocialLogin: true,
    verifyUserEmail: true,
    reverifyUser: true,
    deleteUserWithoutAuth: true,
    userDetail: true,
    googleLoginAuthentication: true,
    googleLogin: true
  },
  SubscriptionPlansController: {
    getAllSubscriptionPlans: true,
    subscribe: true,
    subscribeOnBraintree: true
  },
  StripeController: {
    webhook: true,
    addCard: true,
    createCheckoutSession: true
  },
  FaqController: {
    getAllFaqs: true,
    faqDetail: true,
  },
  ContentManagementController: {
    getAllContents: true,
    getContent: true,
  },
  BlogController: {
    getAllBlogs: true,
    getById: true,
  },
  CountriesController: {
    getAllCountries: true,
  },
  ReviewsController: {
    getAllReviews: true,
  },
  SettingsController: {
    getSettings: true,
  },
  // PaypalController: {
  //   generateToken: true,
  //   addProductsAxios: true
  // },
  // BraintreeController: {
  //   NewPlan: true
  // }
  CardBraintreeController: {
    addCard: true
  },
  TrackingManagementController: {
    addTracking: true
  },
  CookiesController: {
    savedCookies: true
  },
  
  // AffiliateLinkController: {
  //   shorturl: true,
  //   getOriginalUrl: true

  // }
  AffiliateLinkController:{

    create:true
  },
  FirstpromoterController:{
    removeFirstPromoter:true,
    updateFirstPromoter:true
  }
};
