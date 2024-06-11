/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  '/': { view: 'pages/homepage' },


  /***************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/

  /**
   * @Onboarding
   */
  'post /admin/signin': 'UsersController.adminSignin',
  'put /change/password': 'UsersController.changePassword',
  'post /register': 'UsersController.register',
  'post /user/signin': 'UsersController.userSignin',
  'post /user/verify-email': 'UsersController.verifyUserEmail',
  'post /forgot/password': 'UsersController.forgotPassword',
  'post /forgot/password/users': 'UsersController.forgotPasswordFrontend',
  'put /reset/password': 'UsersController.resetPassword',
  'post /add/user': 'UsersController.addUser',
  'get /users/list': 'UsersController.getAllUsers',
  'get /invite/users-list': 'UsersController.getAllInvitedUsers',
  'delete /remove/user': 'UsersController.deleteUser',
  'get /profile': 'UsersController.userProfileData',
  'get /user/detail': 'UsersController.userDetail',
  'put /edit/profile': 'UsersController.editProfile',
  'get /verifyUser': 'UsersController.verifyUser',
  "post /user/auto-login": "UsersController.userAutoLogin",
  'get /sample/user': "UsersController.sampleFile",

  'post /import/brand': "UsersController.importBrand",
  'put /user/basic-detail': 'UsersController.updateBasicDetails',
  'get /user/find-by-email': 'UsersController.getUserByEmail',
  // 'get /user/dashboard': 'UsersController.getUserDashboard',
  // 'get /admin/dashboard': 'UsersController.getAdminDashboard',
  // 'get /admin/users-graph': 'UsersController.getUsersGraphData',
  'post /user/social-lggin': 'UsersController.userSocialLogin',
  'post /user/resendotp': 'UsersController.resendOtp',
  'get /user/reverify': 'UsersController.reverifyUser',
  'delete /remove/user': 'UsersController.deleteUser',
  'delete /destroy/user': 'UsersController.deleteUserWithoutAuth',
  'get /google/login/authentication': 'UsersController.googleLoginAuthentication',
  'post /google/login': 'UsersController.googleLogin',

  /**
   * @CommonAPIs
  */
  'post /upload/image': 'CommonController.uploadImage',
  'post /upload/image/multiple': 'CommonController.uploadMultipleImage',
  'put /change/status': 'CommonController.changeStatus',
  'post /upload/document/multiple': 'CommonController.multipleUploadDocument',        //For Upload Multiple Documetns
  'post /upload/document': 'CommonController.uploadSingleDocument',        //For Upload Multiple Documents
  'delete /delete/image': 'CommonController.deleteImage',
  'delete /delete/image/multiple': 'CommonController.deleteMultipleImages',
  'delete /delete/document': 'CommonController.deleteDocument',
  'post /upload/video/multiple': 'CommonController.uploadMultipleVideos',
  'delete /delete/video': 'CommonController.deleteVideo',
  'delete /delete': 'CommonController.commonDelete',

  /**
   * @Features
   */

  "post /feature": "FeaturesController.addFeatures",
  "put /feature": "FeaturesController.editfeature",
  "get /features": "FeaturesController.getAllFeatures",
  "get /feature": "FeaturesController.findSingleFeature",


  /**
   * @SubscriptionPlans
  */

  'post /subscription-plan': "SubscriptionPlansController.addSubscriptionPlan",
  'put /subscription-plan': "SubscriptionPlansController.editSubscriptionPlan",
  'get /subscription-plan/all': "SubscriptionPlansController.getAllSubscriptionPlans",
  'get /subscription-plan': "SubscriptionPlansController.getSubscriptionPlanById",
  'delete /subscription-plan': "SubscriptionPlansController.deleteSubscriptionPlan",
  'post /subscribe': "SubscriptionPlansController.subscribe",
  'put /cancel-subscription': "SubscriptionPlansController.cancelSubscription",
  'get /active-subscription': "SubscriptionPlansController.myActiveSubscription",
  "get /subscribe/show-discount": "SubscriptionPlansController.showDiscountAtSubscribe",
  'get /subscription/graph': "SubscriptionPlansController.getSubscriptionsGraphData",
  'get /recommend-plans': "SubscriptionPlansController.getRecommendedPlans",

  /**
   * @Braintree
   */
  //With 3rd party- Braintree

  'post /subscription-plan/braintree': "SubscriptionPlansController.addSubscriptionPlanBraintree",
  'post /subscribe/braintree': "SubscriptionPlansController.subscribeOnBraintree",

  /**
* @Transactions
*/
  'get /transaction/all': "TransactionsController.getAllTransactions",
  'get /transaction': "TransactionsController.getTransactionById",
  'post /transaction/download-invoice': "TransactionsController.downloadInvoice",
  'get /transaction/contract-all': "TransactionsController.getAllTransactionsContracts",
  'get /transaction/graph': "TransactionsController.getTransactionsGraphData",


  /**
   * @Cards
   * 
   */
  'post /card': "StripeController.addCard",
  'put /card/set-primary': "StripeController.setPrimaryCard",
  'get /card/all': "StripeController.getAllCards",
  'get /card': "StripeController.getCardById",
  'delete /card': "StripeController.deleteCard",
  'post /hook': 'StripeController.webhook',
  'post /create/session': "StripeController.createCheckoutSession",


  /**
 * @SMTP
 */
  'get /smtp': 'SmtpController.smtp',
  'put /smtp': "SmtpController.edit",
  'put /smtp-test': "SmtpController.testSMTP",

  /**
  * @Notifications
 */
  "put /notification/change-status": "NotificationsController.ReadUnread",
  "put /notification/change-status-all": "NotificationsController.ReadUnreadAll",
  'delete /notification': "NotificationsController.deleteNotification",
  'get /notification/all': "NotificationsController.getAllNotifications",
  'delete /notification/all': "NotificationsController.deleteAllNotification",

  /**
  * @CommonCategory
  */
  'post /common-category': "CommonCategoryController.addCommonCategory",
  'get /common-category': 'CommonCategoryController.getById',
  'put /common-category': "CommonCategoryController.editCommonCategory",
  'delete /common-category': "CommonCategoryController.deleteCommonCategory",
  'get /categoryWithSub': "CommonCategoryController.getCategoryWithSub",
  'get /sub-category/all': "CommonCategoryController.getAllSubsCommonCategory",
  'get /main-category/all': "CommonCategoryController.getAllMainCommonCategory",
  'post /common-category/multiple': "CommonCategoryController.addMultipleCommonCategories",
  'put /common/toggle-key': "CommonCategoryController.updateToggleKeys",

  /**
    * @FAQ
    */
  'post /faq': "FaqController.addFaq",
  'put /faq': "FaqController.editFaq",
  'get /faq': "FaqController.faqDetail",
  'get /faq/all': "FaqController.getAllFaqs",
  'delete /faq': "FaqController.deleteFaq",

  /**
  * @CommonDeletes
  */

  'post /common-delete': "CommonDeletesController.deleteCommonData",

  /**
   * @Countries
   */
  'get /country/all': "CountriesController.getAllCountries",


  /**
  * @Reviews
  */
  "post /reviews": "ReviewsController.addReviews",
  "put /reviews": "ReviewsController.editReviews",
  "get /reviews": "ReviewsController.getById",
  "get /reviews/by-contract": "ReviewsController.getReviewByContractId",
  "get /reviews/all": "ReviewsController.getAllReviews",
  "delete /reviews": "ReviewsController.deleteReviews",



  /**
  * @Settings
  */
  "get /settings": "SettingsController.getSettings",
  "put /settings": "SettingsController.editSettings",

  /**
  * @Permissions
  */
  "put /permission": "PermissionsController.editPermission",
  "get /permission/all": "PermissionsController.getAllPermissions",
  "get /permission/user-base": "PermissionsController.getPermissionByUserId",

  /**
   * @Discounts
   */
  "post /discount": "DiscountController.addDiscount",
  // "post /discount-braintree": "DiscountBraintreeController.addDiscountOnBraintree", //Braintree
  "get /discount": "DiscountController.getByIdDiscount",
  "get /discounts": "DiscountController.getAllDiscount",
  'put /discount': "DiscountController.editDiscount",


  /**
 * @ContentManagement
 */
  "post /content": "ContentManagementController.addContent",
  'get /content/all': 'ContentManagementController.getAllContents',
  'put /content': 'ContentManagementController.editContent',
  'get /content': 'ContentManagementController.getContent',

  /**
   * @AuditTrails
   */

  "get /audit-trails": "AuditTrialsController.getAllAuditTrials",
  "get /audit-trail": "AuditTrialsController.getAuditTrialById",

  /**
   * @Script
   */
  "post /script": "ScriptController.addScript",
  "get /script": "ScriptController.getById",
  "get /scripts": "ScriptController.getAllScript",
  'put /script': "ScriptController.editScript",

  /**
* @Blog
*/
  'post /blog': "BlogController.addBlog",
  'put /blog': "BlogController.editBlog",
  'get /blog': "BlogController.getById",
  'get /blog/all': "BlogController.getAllBlogs",
  'delete /blog': "BlogController.deleteBlog",
  "put /blog/publish": "BlogController.publishBlog",


  /**
* @Campaign
*/
  'post /campaign': "CampaignController.addCampaign",
  'get /campaign': 'CampaignController.getCampaignById',
  'put /campaign': "CampaignController.editCampaign",
  'get /campaign/all': "CampaignController.getAllCampaigns",
  'put /campaign/change-status': "CampaignController.changeCampaignStatus",
  'delete /campaign': "CampaignController.deleteCampaign",

  /**
   * @Proposals
   */
  "post /proposal": "ProposalController.addproposal",
  "get /proposal": "ProposalController.findSingleProposal",
  "get /proposals": "ProposalController.getAllProposals",
  'put /update/proposal/status': 'ProposalController.changeStatus',

  /**
 * @AffiliateManagementController
 */
  "post /affiliate-group": "AffiliateManagementController.addAffiliateGroup",
  "get /affiliate-group": "AffiliateManagementController.getAffiliateGroupById",
  "get /affiliate-groups": "AffiliateManagementController.getAllAffiliateGroup",
  'put /affiliate-group': 'AffiliateManagementController.editAffiliateGroup',
  'get /default/affiliate-group': "AffiliateManagementController.getDefaultAffiliateGroup",


  /**
   * @PaypalController
   */

  // 'post /subscription-plan/paypal': "PaypalController.addSubscriptionPlanOnpaypal",
  // 'post /product/paypal': "PaypalController.createProduct",
  // 'post /api': "PaypalController.api",

  // 'post /token': "PaypalController.generateToken",
  // 'post /create/product': "PaypalController.addProductsAxios",
  // 'post /addSubscription': "PaypalController.createSubscriptionPlan",
  // 'post /Create/plan': "PaypalController.ProductPlan",
  // 'post /Create/subscription': "PaypalController.createSubscription",
  // 'post /Create/subscription/card': "PaypalController.createPlanWithCard",

  /**
   * @BraintreeController
   */
  // 'post /createproduct': "BraintreeController.createProduct",
  // 'post /createplan': "BraintreeController.createSubscriptionPlan",
  // 'post /createCustomer': "BraintreeController.createCustomer",
  // 'post /newplan': "BraintreeController.NewPlan",
  // 'get /paymentToken': "BraintreeController.paymenttoken",
  // 'post /Create/Subscriptionnew': "BraintreeController.CreateSubscriptionNew",
  // 'post /paymentMethodNonce': "BraintreeController.paymentMethodNonce",
  // 'post /customerWithCards': "BraintreeController.customerWithCards",
  // 'post /customerwithplantran': "BraintreeController.TestApi",
  // 'post /createproduct': "BraintreeController.createProduct",

  // //discounts
  // 'post /creatediscount/braintree': "BraintreeController.creatediscountapi",
  // 'get /getAlldiscount': "BraintreeController.getAlldiscounts",



  /**
* @CommissionsManagementController
*/
  "post /commission": "CommissionsManagementController.addCommission",
  "get /commission": "CommissionsManagementController.getCommissionById",
  "get /commissions": "CommissionsManagementController.getAllCommission",
  'put /commission': 'CommissionsManagementController.editCommssion',


  /**
   * @TrackingManagementController
   */
  "post /tracking": "TrackingManagementController.addTracking",
  "get /tracking": "TrackingManagementController.getAllTracking",
  "put /generate/tracking": "TrackingManagementController.generateTrackingLink",

  /**
   * @StripeController
   */
  'post /upload/front/image': 'StripeController.uploadFrontImage',
  'post /upload/back/image': 'StripeController.uploadBackImage',
  'post /verify/images': 'StripeController.uploadStripeVerificationDocument',
  'post /bank': 'StripeController.addBank',
  'post /bank/transfer': 'StripeController.stripeAccountTransfer',

  /**
   * @Dashboard
   */

  "get /total-users": "DashboardController.totalUsers",
  "get /my-total-users": "DashboardController.myTotalUsers",
  "get /total-campaigns": "DashboardController.totalCampaigns",
  "get /recent-users": "DashboardController.recentUser",
  "get /campaign-request": "DashboardController.totalCampaignsRequests",

  /**
* @Product
*/
  'post /product': "ProductController.addProduct",
  'get /product': 'ProductController.ProductById',
  'put /product': "ProductController.editProduct",
  'get /product/all': "ProductController.ProductList",
  // 'put /campaign/change-status': "ProductController.changeCampaignStatus",
  // 'delete /campaign': "ProductController.deleteCampaign",

  /**
 * @AssignProduct
 */
  'post /make-offer': 'MakeOfferController.makeOfferToAffiliate',
  'get /make-offers': 'MakeOfferController.getAllOffers',
  'get /make-offer': 'MakeOfferController.getOfferById',
  'put /offer/change-status': "MakeOfferController.changeOfferStatus",

  /**
   * @Invites
   */
  'post /invite': 'InviteController.addInvite',
  'get /invites': 'InviteController.getAllInvite',
  'get /invite': 'InviteController.getById',
  'get /getallaffiliatelisting': 'InviteController.getAllAffiliateListing',

  /**
   * @AffiliateLink
   */
  'post /get-link': 'AffiliateLinkController.generateLink',
  'get /get-affilaite-link': 'AffiliateLinkController.generateLinkOfAffiliate',
  // 'put /shorturl': 'AffiliateLinkController.shorturl',
  // 'get /:shortUrl': 'AffiliateLinkController.getOriginalUrl',


  /**
   * @Cookies
   */
  'post /saved-cookies': 'CookiesController.savedCookies',

  /**
   * @trackingCustomers
   */
  'get /tracking-customers': 'TrackCustomerController.getAllTrackingCustomer',
  'get /tracking-customer': 'TrackCustomerController.getByIdTrackingCustomer',

  /**@unTrackSales */

  'post /addsales': 'UntrackSalesController.addsales',
  'get /getTrackingById': 'UntrackSalesController.getTrackingById',
  'put /updateSales': 'UntracksaleSController.updateSales',
  'delete /removeSales': 'UntrackSalesController.removeSales',
  'get /getallSalesDetails': 'UntrackSalesController.getallSalesDetails',
  'put /update/status': 'UntrackSalesController.changeStatus',

  /**@NewTax */
  'post /addTax': 'NewTaxController.addTax',

  /**@AffiliateInvite */

  'post /addInvite': 'AffiliateInviteController.addInvite',
  'get /getInviteById': 'AffiliateInviteController.getInviteById',
  'put /updateInvite': 'AffiliateInviteController.updateInvite',
  'delete /deleteInvite': 'AffiliateInviteController.deleteInvite',
  'get /getAllInviteDetails': 'AffiliateInviteController.getAllInviteDetails',
  'put /update/status': 'AffiliateInviteController.changeStatus',
 

  /**
   * @ChildSubCategory
   */
  'post /sub-child-category': "SubChildCategoryController.addSubChildCategory",
  'get /sub-child-category': 'SubChildCategoryController.getAllSubChildCommonCategory',
  'get /view/sub-child-category': 'SubChildCategoryController.getById',
  'put /sub-child-category': 'SubChildCategoryController.editSubChildCategory',
  'delete /sub-child-category': 'SubChildCategoryController.deleteSubChildCommonCategory',


  /**
   * @Banner
   */
  'post /banner': "Banner.addBanner",
  'get /banners': 'Banner.getAllBanner',
  'get /banner': 'Banner.getById',
  'put /banner': 'Banner.editBanner',
  'delete /banner': 'Banner.deleteBanner',

  /**
* @CommissionsController
*/
"post /add-commission": "Commission.addCommission",
"get /get-commission": "Commission.getCommissionById",
"get /get-commissions": "Commission.getAllCommission",
'put /edit-commission': 'Commission.editCommission',

/**
* @InviteUserController
*/

"post /addinviteuser":"InviteUserController.addInviteUser",
"put /changeactiveuser":"InviteUserController.changeActiveUser",
"delete /deleteinviteuser":"InviteUserController.deleteInviteUser",
"get /getallactivities":"InviteUserController.getAllActivities",
"get /getallassociatedusers":"InviteUserController.getAllAssociatedUsers",
"put /updateInviteUser":"InviteUserController.updateInviteUser",
"get /getinviteuser":"InviteUserController.getInviteUser",
"get /getAllInvitedUsers":"InviteUserController.getAllInvitedUsers",

/**
 * @AffiliateBrandInviteController
 * 
*/

"post /brand/applyrequest":"AffiliateBrandInviteController.sendApplyRequest",
"get /brand/getallrequests":"AffiliateBrandInviteController.getAllRequests",
"get /brand/getrequestdetails":"AffiliateBrandInviteController.getRequestDetail",
"put /brand/changerequeststatus":"AffiliateBrandInviteController.changeRequestStatus",

/**
 * @CouponController
 * 
*/
'post /coupon/add': "CouponController.addCoupon",
'get /coupon/get': 'CouponController.getByIdCoupon',
'get /coupon/getAll': 'CouponController.getAllCoupon',
'put /coupon/edit': 'CouponController.editCoupon',
'delete /coupon/delete': 'CouponController.deleteCoupon',

/**
 * @CSVImportController
 * 
*/

'post /csv/import':'DataSetController.importCsvData',
'post /dataset/send':'DataSetController.sendDataSets',
'get /dataset/list':'DataSetController.listOfDataSet',
/**
 * @EmailMessageTemplate
 * 
*/
'post /emailmessage/send':'DataSetController.sendEmailMessage',
'get /emailmessage/list':'DataSetController.listOfEmailMessage',
'get /emailmessage':'DataSetController.getEmailMessage',


};


