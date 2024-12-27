
const constants = require('../../config/constants.js').constants;
const credentials = require('../../config/local.js'); //sails.config.env.production;
const stripe = require("stripe")(credentials.PAYMENT_INFO.SECREATKEY);
const response = require('../services/Response');
const Services = require('../services/index');
const Validations = require("../Validations/index");
const db = sails.getDatastore().manager
const ObjectId = require('mongodb').ObjectId;
const Emails = require('../Emails/index');

// var braintree = require('braintree');
// // console.log(braintree,"----------------braintree");

// var gateway = new braintree.BraintreeGateway({
//     environment: braintree.Environment.Sandbox, // Use 'Production' for live environment
//     merchantId: '9z8qb444sqn4qpzh',
//     publicKey: 'rzgv99j7cjfncz6c',
//     privateKey: 'd60651d59cc2feddc91550ce5ecafc09'
// });



// console.log(gateway, "------------gateway");

exports.addSubscriptionPlan = async (req, res) => {
    try {
        let validation_result = await Validations.SubscriptionPlansValidations.addSubscriptionPlan(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { name, make_recommend, amount } = req.body;


        let get_query = {
            isDeleted: false,
            name: name
        }
        let get_subscription_plan = await SubscriptionPlans.findOne(get_query);
        if (get_subscription_plan) {
            throw constants.SUBSCRIPTION_PLAN.NAME_EXIST;
        }

        if (req.body.upcoming_date) {
            req.body.upcoming_date = new Date(req.body.upcoming_date);

        }

        let created_product = await Services.StripeServices.create_product({ name: name });
        if (created_product) {
            let plan_payload = {
                nickname: name,
                amount: amount,
                interval: req.body.interval ? req.body.interval : "month",
                interval_count: req.body.interval_count ? req.body.interval_count : 1,
                trial_period_days: req.body.trial_period_days ? req.body.trial_period_days : 0,
                product_id: created_product.id,
                currency: "USD",
            }

            let create_plan = await Services.StripeServices.create_plan(plan_payload);

            if (create_plan) {
                req.body.addedBy = req.identity.id;
                req.body.stripe_plan_id = create_plan.id;
                req.body.stripe_product_id = created_product.id;

                let create_subscription_plan = await SubscriptionPlans.create(req.body).fetch();
                if (create_subscription_plan) {
                    if (create_subscription_plan) {
                        if (make_recommend && make_recommend == true) {
                            let update_recommend_plan = await SubscriptionPlans.update({
                                recommended: 'Y',
                                status: 'active',
                                isDeleted: false,
                                id: { "!=": create_subscription_plan.id },
                            },
                                {
                                    recommended: "N",
                                }).fetch();
                        }

                        return response.success(null, constants.SUBSCRIPTION_PLAN.ADDED, req, res);
                    }
                }
                throw constants.COMMON.SERVER_ERROR;
            }
            throw constants.SUBSCRIPTION_PLAN.UNABLE_TO_CREATE_PLAN;
        }

        throw constants.SUBSCRIPTION_PLAN.UNABLE_TO_CREATE_PRODUCT;

    } catch (error) {
        console.log(error, "----------------err");
        return response.failed(null, `${error}`, req, res);
    }
}

exports.editSubscriptionPlan = async (req, res) => {
    try {
        let validation_result = await Validations.SubscriptionPlansValidations.editSubscriptionPlan(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let { id, name, upcoming_date, make_recommend } = req.body;
        let get_query = {
            id: { "!=": id },
            name: name,
            isDeleted: false,
        }

        if (upcoming_date) {
            req.body.upcoming_date = new Date(upcoming_date);

        }
        let get_subscription_plan = await SubscriptionPlans.findOne(get_query);
        if (get_subscription_plan) {
            throw constants.SUBSCRIPTION_PLAN.NAME_EXIST;
        }

        req.body.updatedBy = req.identity.id;

        let update_subscription_plan = await SubscriptionPlans.updateOne({ id: id }, req.body)
        if (update_subscription_plan) {
            if (make_recommend && make_recommend == true) {
                let update_recommend_plan = await SubscriptionPlans.update({
                    recommended: 'Y',
                    status: 'active',
                    isDeleted: false,
                    id: { "!=": update_subscription_plan.id },
                },
                    {
                        recommended: "N",
                    }).fetch();
            }
            return response.success(null, constants.SUBSCRIPTION_PLAN.UPDATED, req, res);
        }
        throw constants.SUBSCRIPTION_PLAN.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getAllSubscriptionPlans = async (req, res) => {
    try {
        let query = {};
        let count = req.param('count') || 10;
        let page = req.param('page') || 1;
        let skipNo = (Number(page) - 1) * Number(count);
        let { search, sortBy, status, isDeleted, plan_type, userId, category } = req.query;
        let sortquery = {};

        if (search) {
            search = Services.Utils.remove_special_char_exept_underscores(search);
            query.$or = [
                { name: { $regex: search, '$options': 'i' } }
            ]
        }

        if(category) {
            query.category = category;
        }

        if (isDeleted) {
            query.isDeleted = isDeleted ? isDeleted === 'true' : true ? isDeleted : false;
        } else {
            query.isDeleted = false;
        }

        if (sortBy) {
            let typeArr = [];
            typeArr = sortBy.split(" ");
            let sortType = typeArr[1];
            let field = typeArr[0];
            sortquery[field ? field : 'createdAt'] = sortType ? (sortType == 'desc' ? -1 : 1) : -1;
        } else {
            sortquery = { createdAt: -1 }
        }

        if (status) {
            query.status = status;
        }

        if (plan_type) {
            query.plan_type = plan_type;
        }

        // console.log(sortquery, "-----------------sortquery");
        let pipeline = [
            {
                $unwind: {
                    path: '$features',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    features_id: { $toObjectId: "$features.id" }
                }
            },
            {
                $lookup: {
                    from: 'features',
                    localField: 'features_id',
                    foreignField: '_id',
                    as: "features_details"
                }
            },
            {
                $unwind: {
                    path: '$features_details',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'discount',
                    localField: 'discount_id',
                    foreignField: '_id',
                    as: "discount_details"
                }
            },
            {
                $unwind: {
                    path: '$discount_details',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];
        let projection = {
            $project: {
                id: '$_id',
                name: '$name',
                status: '$status',
                features: '$features',
                number_of_affiliate: "$number_of_affiliate",
                trial_period_days: "$trial_period_days",
                category: "$category",
                isUpcoming: "$isUpcoming",
                upcoming_date: "$upcoming_date",
                plan_type: "$plan_type",
                payment_type: "$payment_type",
                role_type: "$role_type",
                discount_id: "$discount_id",
                features_id: "$features_id",
                stripe_plan_id: '$stripe_plan_id',
                stripe_price_id: "$stripe_price_id",
                recommended: '$recommended',
                feature_name: "$features_details.name",
                discount_name: "$discount_details.name",
                discount_details: "$discount_details",
                amount: '$amount',
                isChecked: "$isChecked",
                isActive: "$isActive",
                createdBy: "$createdBy",
                interval: '$interval',
                interval_count: "$interval_count",
                isDeleted: "$isDeleted",
                deletedAt: "$deletedAt",
                deletedBy: "$deletedBy",
                addedBy: "$addedBy",
                updatedBy: "$updatedBy",
                updatedAt: "$updatedAt",
                createdAt: "$createdAt",
            }
        };
        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        // pipeline.push({
        //     $sort: sortquery
        // });
        let group_stage = {
            $group: {
                _id: "$_id",
                name: { $first: "$name" },
                status: { $first: "$status" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                plan_type: { $first: "$plan_type" },
                isActive: { $first: "$isActive" },
                stripe_price_id: { $first: "$stripe_price_id" },
                discount_name: { $first: "$discount_name" },
                isUpcoming: { $first: "$isUpcoming" },
                upcoming_date: { $first: "$upcoming_date" },
                trial_period_days: { $first: "$trial_period_days" },
                number_of_affiliate: { $first: "$number_of_affiliate" },
                recommended: { $first: "$recommended" },
                payment_type: { $first: "$payment_type" },
                amount: { $first: "$amount" },
                interval: { $first: "$interval" },
                interval_count: { $first: "$interval_count" },
                discount_details: { $first: "$discount_details" },
                category: {$first: "$category"},
                features: {
                    $push: {
                        feature_name: "$feature_name",
                        id: "$features_id",
                        isChecked: "$features.isChecked",
                    }
                }
            },
        };

        pipeline.push(group_stage)
        pipeline.push({
            $sort: sortquery
        });

        // let unset_stage = {
        //     $unset: ['_id']
        // }
        // pipeline.push(unset_stage)

        let totalresult = await   db.collection('subscriptionplans').aggregate(pipeline).toArray();
            pipeline.push({
                $skip: Number(skipNo)
            });
            pipeline.push({
                $limit: Number(count)
            });
            let result = await   db.collection('subscriptionplans').aggregate(pipeline).toArray();
                if (userId) {
                    var userDetail = await Users.findOne({ id: userId })
                }

                await (async function () {
                    for await (let data of result) {
                        // console.log(data._id, "----data");
                        // console.log(userDetail.plan_id, "--userDetail");
                        if (userDetail && ((String(userDetail.plan_id) == String(data._id)))) {
                            // console.log(userDetail, "--------------userDetail");
                            // console.log("after match");
                            let find_subscription = await Subscriptions.findOne({ subscription_plan_id: userDetail.plan_id, user_id: userDetail.id, stripe_subscription_id: userDetail.subscription_id, status: 'active' });
                            // console.log(find_subscription, "-----------find_subscription");
                            if (find_subscription) {
                                // console.log(find_subscription,"-----------find_subscription");
                                data.isActive = true
                            } else {
                                data.isActive = false
                            }
                        }
                        else {
                            data.isActive = false
                        }
                    }

                })();


                let resData = {
                    total_count: totalresult ? totalresult.length : 0,
                    data: result ? result : [],
                }
                if (!req.param('page') && !req.param('count')) {
                    resData.data = totalresult ? totalresult : [];
                }
                return response.success(resData, constants.SUBSCRIPTION_PLAN.FETCHED, req, res);
          
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getSubscriptionPlanById = async (req, res) => {
    try {

        const id = req.param('id');
        if (!id) {
            throw constants.SUBSCRIPTION_PLAN.ID_REQUIRED;
        }

        let get_subscription_plan = await SubscriptionPlans.findOne({ id: id });
        if (get_subscription_plan) {

            if (get_subscription_plan.addedBy) {
                let get_added_by_details = await Users.findOne({ id: get_subscription_plan.addedBy });
                if (get_added_by_details) {
                    get_subscription_plan.addedBy_name = get_added_by_details.fullName;
                }
            }
            if (get_subscription_plan.discount_id) {
                let get_discount_details = await Discount.findOne({ id: get_subscription_plan.discount_id });

                if (get_discount_details) {
                    get_subscription_plan.discount_name = get_discount_details.name;

                    if (get_discount_details && get_discount_details.discount_type == "percentage") {
                        if (get_subscription_plan.pricing && get_subscription_plan.pricing.length > 0) {
                            for await (let pricing of get_subscription_plan.pricing) {
                                pricing.discount = Number(pricing.unit_amount) * get_discount_details.amount_value / 100;
                            }
                        }
                    } else {
                        if (get_subscription_plan.pricing && get_subscription_plan.pricing.length > 0) {
                            for await (let pricing of get_subscription_plan.pricing) {
                                pricing.discount = pricing.unit_amount - get_discount_details.amount_value;
                                if (pricing.discount < 0) {
                                    pricing.discount = 0;
                                }
                            }
                        }
                    }
                }
            }
            var featureDetails = [];

            if (get_subscription_plan && get_subscription_plan.features && get_subscription_plan.features.length > 0) {
                for await (let item of get_subscription_plan.features) {
                    if (item) {
                        const get_features = await Features.findOne({
                            id: item.id,
                            isDeleted: false,
                        });
                        if (get_features && get_features != undefined) {
                            featureDetails.push(get_features);
                            get_subscription_plan['featureDetails'] = featureDetails;
                        }
                    }
                }
            }
            return response.success(get_subscription_plan, constants.SUBSCRIPTION_PLAN.FETCHED, req, res);
        }

        throw constants.SUBSCRIPTION_PLAN.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.deleteSubscriptionPlan = async (req, res) => {
    try {
        const id = req.param('id');
        if (!id) {
            throw constants.SUBSCRIPTION_PLAN.ID_REQUIRED;
        }

        let update_subscription_plan = await SubscriptionPlans.updateOne({ id: id }, { isDeleted: true, updatedBy: req.identity.id });
        if (update_subscription_plan) {
            return response.success(null, constants.SUBSCRIPTION_PLAN.DELETED, req, res);
        }
        throw constants.SUBSCRIPTION_PLAN.INVALID_ID;

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.subscribe = async (req, res) => {
    try {
        let validation_result = await Validations.SubscriptionPlansValidations.subscribe(req, res);
        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        const subscription_plan_id = req.body.id;
        const card_id = req.body.card_id;
        const user_id = req.body.user_id;

        let get_subscription_plan = await SubscriptionPlans.findOne({ id: subscription_plan_id, isDeleted: false, status: "active" });
        if (!get_subscription_plan) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_ID;
        }
        // console.log(get_subscription_plan, "get_subscription_plan");
        if (get_subscription_plan.discount_id && get_subscription_plan.discount_id != null) {
            var get_discounts = await Discount.findOne({ id: get_subscription_plan.discount_id, isDeleted: false });
            // console.log(get_discounts, "----------------get_discounts");
        }

        var get_user = await Users.findOne({ id: user_id });
        if (!get_user) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_USER;
        }

        let card_details = await Cards.findOne({ user_id: get_user.id, card_id: card_id, isDeleted: false });
        if (!card_details) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_CARD;
        }

        let getSubsQuery = {
            status: "active",
            user_id: user_id
        };

        let get_existing_subscription = await Subscriptions.findOne(getSubsQuery);

        if (get_existing_subscription && get_existing_subscription.stripe_subscription_id) {
            try {
                let get_stripe_existing_subscription = await Services.StripeServices.retrieve_subscrition({
                    stripe_subscription_id: get_existing_subscription.stripe_subscription_id
                })

                if (get_stripe_existing_subscription) {
                    let delete_old_subscription = await Services.StripeServices.delete_subscription({
                        stripe_subscription_id: get_existing_subscription.stripe_subscription_id
                    })
                    if (delete_old_subscription) {
                        let updateSubscription = await Subscriptions.updateOne({ id: get_existing_subscription.id }, {
                            status: "cancelled",
                            updatedBy: user_id
                        });
                        // console.log(updateSubscription,"---updateSubscription");
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }

        let but_subscription_payload = {
            stripe_customer_id: get_user.stripe_customer_id,
            stripe_plan_id: get_subscription_plan.stripe_plan_id,
            card_id: card_id,
            // quantity: req.body.infuencers_count ? req.body.infuencers_count : 1,
            trial_period_days: get_subscription_plan.trial_period_days ? get_subscription_plan.trial_period_days : 0
        }
        if (get_discounts) {
            but_subscription_payload.coupon = get_discounts.stripe_coupon_id
        }
        let create_subscription = await Services.StripeServices.buy_subscription(but_subscription_payload);
        // console.log(create_subscription, "create_subscriptioncreate_subscriptioncreate_subscription");

        if (create_subscription && ["trialing", "active"].includes(create_subscription.status)) {

            let get_inactive_subscription = await Subscriptions.findOne({
                status: "inactive",
                user_id: user_id
            });

            if (get_inactive_subscription) {
                let updateSubscription = await Subscriptions.updateOne({ id: get_inactive_subscription.id }, {
                    status: "cancelled",
                    updatedBy: user_id
                });
            }

            let create_subscription_payload = {
                user_id: user_id,
                subscription_plan_id: get_subscription_plan.id,
                stripe_subscription_id: create_subscription.id,
                addedBy: user_id,
                name: get_subscription_plan.name ? get_subscription_plan.name : "",
                amount: get_subscription_plan.amount,
                interval: get_subscription_plan.interval ? get_subscription_plan.interval : "month",
                interval_count: get_subscription_plan.interval_count ? get_subscription_plan.interval_count : 1,
                trial_period_days: get_subscription_plan.trial_period_days ? get_subscription_plan.trial_period_days : 0,

                valid_upto: new Date(create_subscription.current_period_end * 1000),
                trial_period_end_date: new Date(create_subscription.trial_end * 1000),
            };

            let add_subscription = await Subscriptions.create(create_subscription_payload).fetch(); // Saving In Db, No Contact With Stripe
            // console.log(add_subscription, "--------------add_subscription");
            if (add_subscription) {

                await Users.updateOne(
                    { id: user_id },
                    {
                        subscription_id: add_subscription.stripe_subscription_id,
                        plan_id: get_subscription_plan.id,
                        isPayment: true
                    }
                );
                // ----------- Updating User Points ---------------//
                // let update_points = await Services.Points.add_user_points(add_subscription.user_id, "subscription");
                // ----------- Updating User Points ---------------//

                // -----------  Give Discount On Subscriptions -------- // 
                let get_unused_coupons = await Discount.find({
                    user_id: add_subscription.user_id,
                    status: "pending"
                });

                if (get_unused_coupons && get_unused_coupons.length > 0) {
                    await Services.Referral.apply_referral_discount_at_buy(add_subscription.user_id);
                }
                // -----------  Give Discount On Subscriptions -------- // 


                // ------------------ Updating referral status --------------//
                // if (get_user.referral_code) {
                //     let update_referral_status = await Referrals.updateOne({ registered_user_id: get_user.id, status: { nin: ["paid"] } }, {
                //         status: "paid",
                //         paid_at: new Date()
                //     });

                //     if (update_referral_status) {
                //         //-------------------- Send Notification To Invited By Brand ------------------//
                //         let get_brand = await Users.findOne({ id: update_referral_status.user_id });

                //         let notification_payload = {};
                //         notification_payload.send_to = get_brand.id;
                //         notification_payload.title = `Referral | Subscription Purchased | ${Services.Utils.title_case(get_user.fullName)}`;
                //         notification_payload.message = `${Services.Utils.title_case(get_user.fullName)} purchased subscription`;
                //         notification_payload.type = "referral"
                //         notification_payload.addedBy = req.identity.id;
                //         notification_payload.referral_id = update_referral_status.id;
                //         let create_notification = await Notifications.create(notification_payload).fetch();
                //         if (create_notification && get_brand.device_token) {
                //             let fcm_payload = {
                //                 device_token: get_brand.device_token,
                //                 title: create_notification.title,
                //                 message: create_notification.message,
                //             }

                //             await Services.FCM.send_fcm_push_notification(fcm_payload)
                //         }

                //         //-------------------- Send Notification To Invited By Brand ------------------//
                //     }
                // }
                // ------------------ Updating referral status --------------//

                // let get_send_to_details = await Users.findOne({ id: get_subscription_plan.addedBy });
                // let notification_payload = {};
                // notification_payload.send_to = get_subscription_plan.addedBy;
                // notification_payload.title = `Subscription Purchased | ${get_subscription_plan.name} | ${get_user.fullName}`;
                // notification_payload.message = `${get_user.fullName} puchased  ${get_subscription_plan.name}`;
                // notification_payload.type = "subscription"
                // notification_payload.addedBy = req.identity.id;
                // notification_payload.subscription_plan_id = add_subscription.subscription_plan_id;
                // let create_notification = await Notifications.create(notification_payload).fetch();
                // if (create_notification && get_send_to_details.device_token) {
                //     let fcm_payload = {
                //         device_token: get_send_to_details.device_token,
                //         title: create_notification.title,
                //         message: create_notification.message,
                //     }

                //     await Services.FCM.send_fcm_push_notification(fcm_payload)
                // }

                let get_plan_added_by = await Users.findOne({ id: get_subscription_plan.addedBy });
                let email_payload_to_admin = {
                    email: get_plan_added_by.email,
                    subscription_id: add_subscription.id,
                    user_id: get_plan_added_by.id,
                    subscribed_by: user_id,
                }

                let email_payload_to_user = {
                    email: get_user.email,
                    subscription_id: add_subscription.id,
                    user_id: user_id,
                    subscribed_by: user_id,
                }
                // // console.log(email_payload_to_admin);
                await Emails.OnboardingEmails.subscribe_email(email_payload_to_admin);
                await Emails.OnboardingEmails.subscribe_email(email_payload_to_user);

                return response.success(null, constants.SUBSCRIPTION_PLAN.BUY_SUBSCRIPTION, req, res);
            }
        } else {
            await Transactions.create({
                user_id: user_id,
                paid_to: get_subscription_plan.addedBy,
                transaction_type: "buy_subscription",
                subscription_plan_id: get_subscription_plan.id,
                transaction_id: create_subscription.latest_invoice,
                subscription_id: add_subscription.id,
                stripe_charge_id: create_subscription.latest_invoice,
                currency: create_subscription.plan.currency,
                amount: create_subscription.plan.amount / 100,
                stripe_subscription_id: create_subscription.id,
                transaction_status: "pending",
            });

            return response.failed(subscription, constants.SUBSCRIPTION_PLAN.PAYMENT_FAILED, req, res);
        }
    } catch (error) {
        console.log(error, '===========error');
        return response.failed(null, `${error}`, req, res);
    }
}

exports.cancelSubscription = async (req, res) => {
    try {
        let validation_result = await Validations.SubscriptionPlansValidations.cancelSubscription(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        let user_id = req.identity.id;
        let subscription_plan_id = req.body.id;

        let get_user = await Users.findOne({ id: user_id });
        if (!get_user) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_USER;
        }

        let getSubsQuery = {
            status: "active",
            user_id: user_id,
            subscription_plan_id: subscription_plan_id,
        };

        let get_existing_subscription = await Subscriptions.findOne(getSubsQuery);

        if (get_existing_subscription && get_existing_subscription.stripe_subscription_id) {

            let get_stripe_existing_subscription = await Services.StripeServices.retrieve_subscrition({
                stripe_subscription_id: get_existing_subscription.stripe_subscription_id
            })

            if (get_stripe_existing_subscription) {
                let delete_old_subscription = await Services.StripeServices.delete_subscription({
                    stripe_subscription_id: get_existing_subscription.stripe_subscription_id
                })

                if (delete_old_subscription && delete_old_subscription.status == "canceled") {

                    let updated_payload = {
                        updatedBy: req.identity.id,
                        status: "cancelled"
                    }
                    if (get_existing_subscription.valid_upto >= new Date()) {
                        updated_payload.status = "inactive"
                    }

                    let updateSubscription = await Subscriptions.updateOne({ id: get_existing_subscription.id }, updated_payload);

                    if (updateSubscription && (updateSubscription.status == "cancelled" || updateSubscription.status == "inactive")) {

                        let get_subscription_plan = await SubscriptionPlans.findOne({ id: updateSubscription.subscription_plan_id });
                        if (!get_subscription_plan) {
                            throw constants.SUBSCRIPTION_PLAN.INVALID_ID;
                        }

                        // let get_plan_added_by = await Users.findOne({ id: get_subscription_plan.addedBy });
                        // let get_plan_added_by_notification_email = await Services.UserServices.get_user_notification_email(get_plan_added_by.id);
                        // let get_user_notification_email = await Services.UserServices.get_user_notification_email(get_user.id)
                        // let email_payload_to_admin = {
                        //     email: get_plan_added_by_notification_email,
                        //     subscription_id: updateSubscription.id,
                        //     user_id: get_plan_added_by.id,
                        //     subscribed_by: user_id,
                        // }

                        // let email_payload_to_user = {
                        //     email: get_user_notification_email,
                        //     subscription_id: updateSubscription.id,
                        //     user_id: user_id,
                        //     subscribed_by: user_id,
                        // }
                        // await Emails.OnboardingEmails.subscription_canncelled(email_payload_to_admin);
                        // await Emails.OnboardingEmails.subscription_canncelled(email_payload_to_user);

                        //-------------------- Send Notification ------------------//
                        // let get_send_to_details = await Users.findOne({ id: get_subscription_plan.addedBy });
                        // let notification_payload = {};
                        // notification_payload.send_to = get_subscription_plan.addedBy;
                        // notification_payload.title = `Subscription Cancelled | ${get_subscription_plan.name} | ${get_user.fullName}`;
                        // notification_payload.message = `${get_user.fullName} cancelled  ${get_subscription_plan.name}`;
                        // notification_payload.type = "subscription"
                        // notification_payload.addedBy = req.identity.id;
                        // notification_payload.subscription_plan_id = get_subscription_plan.id;
                        // let create_notification = await Notifications.create(notification_payload).fetch();
                        // if (create_notification && get_send_to_details.device_token) {
                        //     let fcm_payload = {
                        //         device_token: get_send_to_details.device_token,
                        //         title: create_notification.title,
                        //         message: create_notification.message,
                        //     }

                        //     await Services.FCM.send_fcm_push_notification(fcm_payload)
                        // }
                        //-------------------- Send Notification ------------------//

                        return response.success(null, constants.SUBSCRIPTION_PLAN.SUBSCRIPTION_CANCELLED, req, res);
                    }

                    throw constants.COMMON.SERVER_ERROR;

                }
                throw constants.COMMON.SERVER_ERROR;
            }

            throw constants.SUBSCRIPTION_PLAN.SUBSCRIPTION_NOT_FOUND;
        }

        throw constants.SUBSCRIPTION_PLAN.INVALID_ID;
    } catch (error) {
        // console.log(error, '=========errir');
        return response.failed(null, `${error}`, req, res);
    }
}

exports.myActiveSubscription = async (req, res) => {
    try {
        const user_id = req.param('user_id');
        if (!user_id) {
            throw constants.SUBSCRIPTION_PLAN.USER_ID_REQUIRED;
        }

        let get_user = await Users.findOne({ id: user_id });
        if (!get_user) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_USER_ID;
        }

        let get_user_active_subscription = await Subscriptions.findOne({
            user_id: user_id,
            status: "active",
        });

        let total_profile_views = await ProfileViews.count({
            visited_by: user_id
        })

        if (get_user_active_subscription) {
            get_user_active_subscription.total_profile_views = total_profile_views;
            get_user_active_subscription.total_credits = get_user.total_credits;
            get_user_active_subscription.remaining_credits = get_user.remaining_credits;
            return response.success(get_user_active_subscription, constants.SUBSCRIPTION_PLAN.ACTIVE_SUBSCRIPTION_FETCHED, req, res);
        }

        let get_user_inactive_subscription = await Subscriptions.findOne({
            user_id: user_id,
            status: "inactive",
            valid_upto: { ">=": new Date() }
        });

        if (get_user_inactive_subscription) {
            get_user_inactive_subscription.total_profile_views = total_profile_views;
            get_user_inactive_subscription.total_credits = get_user.total_credits;
            get_user_inactive_subscription.remaining_credits = get_user.remaining_credits;
            return response.success(get_user_inactive_subscription, constants.SUBSCRIPTION_PLAN.ACTIVE_SUBSCRIPTION_FETCHED, req, res);
        }

        throw constants.SUBSCRIPTION_PLAN.NO_SUBSCRIPTION_FOUND;
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.showDiscountAtSubscribe = async (req, res) => {
    try {
        const { id } = req.query;
        const user_id = req.identity.id;

        if (!id) {
            throw constants.SUBSCRIPTION_PLAN.ID_REQUIRED;
        }

        let get_user = await Users.findOne({ id: user_id });
        if (!get_user) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_USER_ID;
        }

        let get_subscription_plan = await SubscriptionPlans.findOne({ id: id });
        if (!get_subscription_plan) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_SUBSCRIPTION_PLAN_ID;
        }
        console.log(id, "---------------------id");
        let get_discount = await Services.Referral.calculate_discount_before_subscribe(user_id, id);
        let resData = {
            discount: get_discount > 0 ? get_discount : 0
        }

        return response.success(resData, constants.COMMON.SUCCESS, req, res);

    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getSubscriptionsGraphData = async (req, res) => {
    try {
        let query = {};
        let { user_id, subscription_plan_id, year, month, status } = req.query;
        if (user_id) { query.user_id = new ObjectId(user_id); }
        if (subscription_plan_id) { query.subscription_plan_id = new ObjectId(subscription_plan_id); }
        if (year) { query.year = Number(year) };
        if (month) { query.month = Number(month) };
        if (status) { query.status = status };

        // Pipeline Stages
        let pipeline = [];
        let projection = {
            $project: {
                id: "$_id",
                user_id: "$user_id",
                subscription_plan_id: "$subscription_plan_id",
                status: "$status",
                amount: "$amount",
                addedBy: "$addedBy",
                isDeleted: "isDeleted",
                createdAt: "$createdAt",
                updatedAt: "$updatedAt",
                updatedBy: "$updatedBy",
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
            },
        };

        pipeline.push(projection);
        pipeline.push({
            $match: query
        });
        let facet = {
            $facet: {
                Hourly: [
                    {
                        $group: {
                            _id: {
                                $hour: "$createdAt"
                            },
                            total: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            result: {
                                $push: {
                                    hour: "$_id",
                                    total: "$total"
                                }
                            }
                        }
                    }
                ],
                Weekly: [
                    {
                        $group: {
                            _id: {
                                "$week": "$createdAt"
                            },
                            total: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            result: {
                                $push: {
                                    week: "$_id",
                                    total: "$total"
                                }
                            }
                        }
                    }
                ],
                Monthly: [
                    {
                        $group: {
                            _id: {
                                $month: "$createdAt"
                            },
                            total: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            result: {
                                $push: {
                                    month: "$_id",
                                    total: "$total"
                                }
                            }
                        }
                    }
                ],
                Yearly: [
                    {
                        $group: {
                            _id: {
                                $year: "$createdAt"
                            },
                            total: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            result: {
                                $push: {
                                    year: "$_id",
                                    total: "$total"
                                }
                            }
                        }
                    }
                ],
                Quarterly: [
                    {
                        $addFields: {
                            quarter: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } }
                        },
                    },
                    {
                        $group: {
                            _id: "$quarter",
                            total: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            _id: 1
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            result: {
                                $push: {
                                    quarter: "$_id",
                                    total: "$total"
                                }
                            }
                        }
                    }
                ]
            }
        };
        pipeline.push(facet);

        let addFields1 = {
            $addFields: {
                Hourly: {
                    "$arrayElemAt": [
                        "$Hourly",
                        0
                    ]
                },
                Weekly: {
                    "$arrayElemAt": [
                        "$Weekly",
                        0
                    ]
                },
                Monthly: {
                    "$arrayElemAt": [
                        "$Monthly",
                        0
                    ]
                },
                Yearly: {
                    "$arrayElemAt": [
                        "$Yearly",
                        0
                    ]
                },
                Quarterly: {
                    "$arrayElemAt": [
                        "$Quarterly",
                        0
                    ]
                }
            }
        }
        pipeline.push(addFields1);

        let addFields2 = {
            $addFields: {
                Hourly: "$Hourly.result",
                Weekly: "$Weekly.result",
                Monthly: "$Monthly.result",
                Yearly: "$Yearly.result",
                Quarterly: "$Quarterly.result"

            }
        }
        pipeline.push(addFields2);

        // Pipeline Stages
        db.collection("subscriptions").aggregate(pipeline).toArray((err, result) => {
            if (err) throw err;
            let resData = {
                data: result ? result : [],
            }
            resData.isDataAvailable = Number(Object.values(result[0]).length) > 0 ? true : false;
            return response.success(resData, constants.CONTRACT.GRAPH_DATA_FETCHED, req, res);
        })
    } catch (error) {
        return response.failed(null, `${error}`, req, res);
    }
}

exports.getRecommendedPlans = async (req, res) => {
    try {
        const get_plan = await SubscriptionPlans.find({ recommended: 'Y', isDeleted: false, status: 'active' });
        if (get_plan && get_plan.length > 0) {
            return res.status(400).json({
                success: false,
                error: { "code": 400 }
            });
        } else {
            return res.status(200).json({
                success: true,
            });
        }
    } catch (error) {
        // console.log(error);
        return response.failed(null, `${error}`, req, res)
    }
}

//Paypal apis

exports.addSubscriptionPlanBraintree = async (req, res) => {
    try {
        let validation_result = await Validations.BraintreeValidation.addPlanWithBraintree(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }
        let { name, make_recommend, billing_frequency, currency_iso_code, price, trial_period_days } = req.body;

        var planData = {
            name: name,
            billingFrequency: billing_frequency,
            currencyIsoCode: currency_iso_code,
            price: price,
            // id: 'ABC', // Unique plan ID
            // price: price,     // Monthly price in your currency
            // billingDayOfMonth: 1, // Billing day of the month
            // name: 'shivika', // A human-readable name for your plan
            trialDurationUnit: "day", // Unit for trial duration
            // "day": Represents a trial period in days.
            // "month": Represents a trial period in months.
            // "year": Represents a trial period in years.
            trialDuration: trial_period_days ? trial_period_days : '',  // Trial period duration in days (0 for no trial)
            trialPeriod: trial_period_days ? true : false,

            // numberOfBillingCycles: 12, // Number of billing cycles (e.g., 12 for a 12-month subscription)
            // currencyIsoCode: 'USD', // Currency code (e.g., USD)
            // billingFrequency: 1
        };

        let get_query = {
            isDeleted: false,
            name: name
        }
        let get_subscription_plan = await SubscriptionPlans.findOne(get_query);
        if (get_subscription_plan) {
            throw constants.SUBSCRIPTION_PLAN.NAME_EXIST;
        }

        if (req.body.upcoming_date) {
            req.body.upcoming_date = new Date(req.body.upcoming_date);

        }

        let create_plan = await gateway.plan.create(planData);

        // let created_product = await Services.StripeServices.create_product({ name: name });
        if (create_plan) {
            // console.log(create_plan, "----------create_plan");
            req.body.addedBy = req.identity.id;
            req.body.paypal_plan_id = create_plan.plan.id;
            req.body.merchantId = create_plan.plan.merchantId;

            let create_subscription_plan = await SubscriptionPlans.create(req.body).fetch();
            if (create_subscription_plan) {
                if (make_recommend && make_recommend == true) {
                    let update_recommend_plan = await SubscriptionPlans.update({
                        recommended: 'Y',
                        status: 'active',
                        isDeleted: false,
                        id: { "!=": create_subscription_plan.id },
                    },
                        {
                            recommended: "N",
                        }).fetch();
                }

                return response.success(null, constants.SUBSCRIPTION_PLAN.ADDED, req, res);
            }
            throw constants.COMMON.SERVER_ERROR;
        }

    } catch (error) {
        console.log(error, "----------------err");
        return response.failed(null, `${error}`, req, res);
    }

}

exports.subscribeOnBraintree = async (req, res) => {
    try {

        let validation_result = await Validations.BraintreeValidation.subscribe(req, res);

        if (validation_result && !validation_result.success) {
            throw validation_result.message;
        }

        var { user_id, plan_id, card_token } = req.body;
        var subscription_plan_id = plan_id;
        var user_id = user_id


        var get_subscription_plan = await SubscriptionPlans.findOne({ id: subscription_plan_id, isDeleted: false, status: "active" });
        // console.log(get_subscription_plan, "---get_subscription_plan");
        if (!get_subscription_plan) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_ID;
        }

        let get_user = await Users.findOne({ id: user_id });
        if (!get_user) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_USER;
        }


        var card_details = await CardBraintree.findOne({ user_id: get_user.id, card_token: card_token, isDeleted: false });
        if (!card_details) {
            throw constants.SUBSCRIPTION_PLAN.INVALID_CARD;
        }

        let getSubsQuery = {
            subscription_status: "Active",
            user_id: user_id
        };

        let get_existing_subscription = await Subscriptions.findOne(getSubsQuery);
        // console.log(get_existing_subscription, "-------------------get_existing_subscription");
        if (get_existing_subscription && get_existing_subscription.paypal_subscription_id) {
            try {
                let get_paypal_existing_subscription = await Services.PaypalBraintreeServices.retrieve_subscrition({
                    paypal_subscription_id: get_existing_subscription.paypal_subscription_id
                })

                if (get_paypal_existing_subscription) {
                    let delete_old_subscription = await Services.PaypalBraintreeServices.delete_subscription({
                        paypal_subscription_id: get_existing_subscription.paypal_subscription_id
                    })
                    if (delete_old_subscription) {
                        let updateSubscription = await Subscriptions.updateOne({ id: get_existing_subscription.id }, {
                            status: "cancelled",
                            subscription_status: "Canceled",
                            updatedBy: user_id
                        });
                    }
                }
            } catch (error) {
                console.log(error);
            }
        }

        var subscriptionData = {
            paymentMethodToken: card_details.card_token,
            planId: get_subscription_plan.paypal_plan_id, // Replace with the actual subscription plan ID
            price: get_subscription_plan.price, // Replace with the subscription price
            // Other subscription options like trialDuration, trialDurationUnit, etc.
        };

        let create_subscription_paypal = await gateway.subscription.create(subscriptionData);
        // console.log(create_subscription_paypal, "-----------------create_subscription_paypal");

        if (create_subscription_paypal.subscription.id) {
            let subscription_payload = {
                paypal_subscription_id: create_subscription_paypal.subscription.id,
                paypal_plan_id: create_subscription_paypal.subscription.planId,
                subscription_status: create_subscription_paypal.subscription.status,
                next_billing_date: create_subscription_paypal.subscription.nextBillingDate,
                amount: create_subscription_paypal.subscription.price,
                user_id: user_id,
                paypal_email: get_user.paypal_email
            }
            let create_subscription = await Subscriptions.create(subscription_payload);
            // const transactionData = {
            //     amount: get_subscription_plan.price,
            //     paymentMethodNonce: "nonce-from-the-client",
            //     customer_id: create_customer.customer.id,
            //     options: {
            //         submitForSettlement: true, // Automatically submit for settlement
            //     },
            //     "credit_card": {
            //         "number": card_number,
            //         "expiration_month": exp_month,  // Integer value for the month (e.g., 1 for January)
            //         "expiration_year": exp_year,  // Integer value for the year (e.g., 2023)
            //         "cvv": cvv
            //     },
            // };
            // console.log('last');

            //     return
            //     let create_transaction = await gateway.transaction.sale(transactionData);
            //     console.log(create_transaction, "-----------------create_transaction");
            let findUser = await Users.findOne({ id: req.body.user_id, isDeleted: false, status: "active" });
            if (findUser) {
                //         console.log(findUser, "-------users");
                let updateUser = await Users.updateOne({ id: findUser.id }, {
                    paypal_customer_id: get_user.paypal_customer_id,
                    paypal_subscription_id: create_subscription_paypal.subscription.id,
                    paypal_plan_id: get_subscription_plan.paypal_plan_id,
                    isPayment: true
                });
            }
            //     if (create_transaction) {
            //         let transaction_payload = {
            //             user_id: req.body.user_id,
            //             paypal_transaction_id: create_transaction.transaction.id,
            //             paypal_transaction_status: create_transaction.transaction.status,
            //             currency: create_transaction.transaction.currencyIsoCode,
            //             amount: create_transaction.transaction.price
            //         }
            //         let transaction = await Transactions.create(transaction_payload);

            //         return response.success(null, constants.SUBSCRIPTION_PLAN.BUY_SUBSCRIPTION, req, res);
            //     }
            return response.success(null, constants.SUBSCRIPTION_PLAN.BUY_SUBSCRIPTION, req, res);
        }
    } catch (error) {
        console.log(error, '===========error');
        return response.failed(null, `${error}`, req, res);
    }
}

