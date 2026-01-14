/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

const smtpTransport = require('nodemailer-smtp-transport');
const Services = require('../api/services/index');
const cron = require('node-cron');
const moment = require('moment');
const Emails = require('../api/Emails/index');
const MonthlyInvoiceService = require("../api/services/MonthlyInvoiceService")


module.exports.bootstrap = async function () {
  // By convention, this is a good place to set up fake data during development.
  //
  // For example:
  // ```
  // // Set up fake development data (or if we already have some, avast)
  // if (await User.count() > 0) {
  //   return;
  // }
  //

  /**Seeding the user in db  */
  // Users.count({}).then(async (userCount) => {
  //   if (userCount == 0) {
  //     await Users.createEach([
  //       {
  //         email: 'amitk@yopmail.com',
  //         firstName: 'Amit',
  //         lastName: 'Kumar',
  //         status: 'active',
  //         password: 'Amit@17231',
  //         isVerified: 'Y',
  //         date_verified: new Date(),
  //         role: 'admin',
  //       },
  //       {
  //         email: 'culture_admin@yopmail.com',
  //         firstName: 'Amit',
  //         lastName: 'Kumar',
  //         status: 'active',
  //         password: 'Jc@12345',
  //         isVerified: 'Y',
  //         date_verified: new Date(),
  //         role: 'admin',
  //       },

  //       // etc.
  //     ]).fetch();
  //   }
  // });

  /**Seeding SMTP Detail into db */

  //-------------- creating index for location in users model----------//
  const db = sails.getDatastore().manager
  await db.collection("users").createIndex({ location: "2dsphere" });
  //-------------- creating index for location in users model----------//

  // if ((await Smtp.count()) == 0) {
  //   var smtp = await Smtp.create({
  //     service: 'Gmail',
  //     host: 'smtp.gmail.com',
  //     port: 587,
  //     debug: true,
  //     sendmail: true,
  //     requiresAuth: true,
  //     domains: ['gmail.com', 'googlemail.com'],
  //     user: 'amitkjcsoftwaresolution@gmail.com',
  //     pass: 'fdvjrupmierdlzbt',
  //   });
  // }

  // subscription cancel
  cron.schedule("0 */12 * * *", async () => {
    let date = new Date();
    date.setDate(date.getDate() - 1)
    let update_subscriptions = await Subscriptions.update({
      amount: 0,
      status: { in: ["active"] },
      valid_upto: { "<=": date }
    }).set(
      {
        status: "cancelled",
      });

    if (update_subscriptions && update_subscriptions.length > 0) {
      for await (let item of update_subscriptions) {
        try {
          let delete_old_subscription = await Services.StripeServices.delete_subscription({
            stripe_subscription_id: item.stripe_subscription_id
          });
          if(item.user_id) {
            await Users.updateOne({id: item.user_id}).set({plan_id: null,special_plan_id: null});
          }
        } catch (error) {
        }
      }
    }
  })

  // Seeding Points Template In DB
  // Points.count({ isTemplate: true }).then(async (template_count) => {
  //   if (template_count == 0) {
  //     await Points.create(
  //       {
  //         isTemplate: true,
  //         profile_completion: 0,
  //         subscription: 0,
  //         like: 0,
  //         contract: 0,
  //         referral: 0,
  //       }
  //     ).fetch();
  //   }
  // });

  // Seeding Settings In DB
  // cron.schedule("*/10 * * * * *", async () => {
  //   Settings.count().then(async (setting) => {
  //     console.log(setting);
  //     if (setting == 0) {
  //       await Settings.create(
  //         {
  //           referral_discount_type: "flat",
  //           referral_discount: 0,
  //         }
  //       ).fetch();
  //     }
  //   });
  // })

  //Adding content management data
  // cron.schedule("*/10 * * * * *", async () => {
  ContentManagement.count({}).then(async data_count => {
    if (data_count == 0) {
      await ContentManagement.createEach([
        { title: 'contact-us', image: '', description: 'contact us description', meta_title: 'meta title', meta_description: 'meta description', meta_key: 'meta keys' },
        { title: 'privacy-policy', image: '', description: 'privacy policy description', meta_title: 'meta title', meta_description: 'meta description', meta_key: 'meta keys' },
        { title: 'terms-and-conditions', image: '', description: 'terms and conditions description', meta_title: 'meta title', meta_description: 'meta description', meta_key: 'meta keys' },
        { title: 'about-us', image: '', description: 'about us description', meta_title: 'meta title', meta_description: 'meta description', meta_key: 'meta keys' },
        // etc.
      ]);
    }
  })
  // })

  // run every 59 minutes // * */59 * * * *
  cron.schedule("* * * * *", async () => {
    let start_date = new Date(moment().subtract(72, 'hours'));
    let end_date = new Date(moment().subtract(72, 'hours')).subtract(1, 'minutes');
    let get_hirings = await Hirings.find({
      status: "pending",
      createdAt: { ">=": start_date, "<=": end_date },
      isDeleted: false,
    });

    if (get_hirings && get_hirings.length > 0) {
      for await (item of get_hirings) {
        Emails.HiringEmails.suggested_influencers({
          invite_id: item.id
        })
      }
    }
  })

  // create cron which change status to expired of coupons when expired date goes
  cron.schedule("0 12 * * *", async () => {
    const todayDate = new Date(new Date().setUTCHours(0,0,0,0))
    let allCoupons = await Coupon.find({isDeleted:false, status : "Enabled"})
    if(allCoupons && allCoupons.length>0){
      let i = 0
      for await (let coupon of allCoupons){
        let expiredDate = new Date(coupon.expirationDate)
        if(expiredDate < todayDate){
          await Coupon.updateOne({id:coupon.id},{status:"Expired"})
          i++
        }
      }
      console.log(`From ${allCoupons.length} ${i} are expired on ${todayDate}`)
    }
  })

   // Initialize cron jobs
  // if (process.env.ENABLE_CRON === 'true') {
  //   require('../config/cron').cron.init();
  // }

  cron.schedule('0 2 1 * *', async () => {
        try {
          const result = await MonthlyInvoiceService.generateSingleMonthlyInvoice();
          console.log('Monthly invoice generation completed:', result);
          
        } catch (error) {
          console.error('Cron job failed:', error);
        }
      }, {
        scheduled: true,
        timezone: "UTC"
      });

};
