
/**
 * Local environment settings
 *
 * Use this file to specify configuration settings for use while developing
 * the app on your personal system.
 *
 * For more information, check out:
 * https://sailsjs.com/docs/concepts/configuration/the-local-js-file
 */

module.exports = {
  port: process.env.PORT || 6043,
 
  BACK_WEB_URL: 'https://upfillyapi.jcsoftwaresolution.in',
  FRONT_WEB_URL: 'https://upfilly.jcsoftwaresolution.in',
  ADMIN_WEB_URL: 'https://upfillyadmin.jcsoftwaresolution.in',


  DB_USER: 'upfillyapp',
  DB_PASSWORD: 'up12filLLL09LIl23e',
  DB_HOST: '74.208.206.18',
  DB_PORT: 27017,
  DB_NAME: "db_upfilly",
  // GOOGLE_API_KEY :"AIzaSyDmvz3A-BAjR77dy4PsaoHJC15mUdffLSA"
  PAYMENT_INFO:{
    SECREATKEY: "sk_test_51KyZElEGnmCJcey2JMo2oBLuISg88GktUVg2TxqaflQCYQKChZJr7xdF0MbrgV5Ibv4oJiEioHXVvVcb0j4M1oXD00vK4r7PVl",
  },
   GOOGLE_LOGIN: {
    GOOGLE_CLIENT_ID: "73803748125-15asfa91rsrldv4e49438dkt6dddqmit.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "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",
    GOOGLE_LOGIN_REDIRECT: "https://upfilly.jcsoftwaresolution.in/login"
  },
 BRAINTREE: {
    merchantId: "9z8qb444sqn4qpzh",
    publicKey: "rzgv99j7cjfncz6c",
    privateKey: "d60651d59cc2feddc91550ce5ecafc09",
  },
 FCM_KEY:"AAAAvl8LWNI:APA91bFaQoymWiPrUf2IEVL8-W_GWFGdEp7V3bQodn9W8HOljy3ungT0WCDLjPJZWpaN5jnJQJgWGa_CpFOZy6FuX5shfXTqnciDAl3xrkvIHuYYWVYIBxNELsmWKLJH0wc4TPvOiteB"
  //  FCM_KEY:"AAAAjMtJS4A:APA91bGBnEJEVIvk1JU0IG0wKopQJGdGlVVvR4O4PO8v1tFQ5erMbA9tiQBTbS-0Kg1QEFmFs0xqbBrfyxFVdTe-HR_AO1DqQge5UMpIlHrOLNOCoh4CvlZcaOp9586IoxU5QHMyyQtm",
  // ADMIN_EMAIL: "amit@yopmail.com",
  // /**BELOW ZOOM CREDS */
  // CLIENT_ID: "9lGUGyKS5qKYmFcgHY3vA",
  // CLIENT_SECRET: "8FkIG182CAGDFHHCvbtrPJ62hOtGBdh7"
};
