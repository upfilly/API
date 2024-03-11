const CouponServices = require('./CouponServices')
const StripeServices = require('./StripeServices')
const SettingServices = require('./SettingServices')
const Utils = require('./Utils');
const FCM = require('./FcmServices');

exports.generate_referal_code = () => {
    let first_random = (Math.random() * 46656) | 0;
    let second_random = (Math.random() * 46656) | 0;
    let third_random = (new Date().getTime()) | 0;
    first_random = (first_random.toString(36)).slice(-3);
    second_random = (second_random.toString(36)).slice(-3);
    third_random = (third_random.toString(36)).slice(-6);
    return first_random + second_random + third_random;
}

exports.check_valid_referal_code = async (referral_code) => {
    let get_user = await Users.findOne({
        my_code: referral_code,
        isDeleted: false,
        isVerified: "Y",
        role: { in: ["brand"] }
    });

    return get_user ? true : false;
}

exports.update_joined_status = async (referral_code, email, registered_user_id) => {
    let update_status = await Referrals.updateOne({
        email: email,
        referral_code: referral_code,
        isDeleted: false,
    }, {
        status: "joined",
        joined_at: new Date(),
        registered_user_id: registered_user_id
    });


    //-------------------- Send Notification To Invited By Brand------------------//
    let get_brand = await Users.findOne({ id: update_status.user_id });
    let get_registered_user = await Users.findOne({ id: update_status.registered_user_id });

    let notification_payload = {};
    notification_payload.send_to = get_brand.id;
    notification_payload.title = `Referral | User Joined | ${await Utils.title_case(get_registered_user.fullName)}`;
    notification_payload.message = `${await Utils.title_case(get_registered_user.fullName)} joined with your referral`;
    notification_payload.type = "referral"
    notification_payload.addedBy = get_registered_user.id;
    notification_payload.referral_id = update_status.id;
    let create_notification = await Notifications.create(notification_payload).fetch();
    if (create_notification && get_brand.device_token) {
        let fcm_payload = {
            device_token: get_brand.device_token,
            title: create_notification.title,
            message: create_notification.message,
        }

        await FCM.send_fcm_push_notification(fcm_payload)
    }

    //-------------------- Send Notification To Invited By Brand------------------//

    return update_status;
}

exports.apply_referral_discount = async (user_id) => {
    let get_settings = await SettingServices.get_settings();    // Get settings to find referral discount
    if (get_settings && get_settings.referral_discount > 0) {
        let coupon_discount = 0;
        let get_active_subscription = await Subscriptions.findOne({
            user_id: user_id,
            status: 'active',
        });

        if (get_active_subscription && get_active_subscription.coupon_id) {
            let get_coupon = await Coupons.findOne({ id: get_active_subscription.coupon_id });
            if (get_coupon) {
                coupon_discount += Number(get_coupon.total_amount);
            }
        }

        if (get_active_subscription) {
            if (get_settings.referral_discount_type == "flat") {
                coupon_discount += Number(get_settings.referral_discount);
            } else if (get_settings.referral_discount_type == "percentage") {
                coupon_discount += (Number(get_settings.referral_discount) * Number(get_active_subscription.amount)) / 100;
            }

            if (coupon_discount >= Number(get_active_subscription.amount)) {
                coupon_discount = Number(get_active_subscription.amount);
            }

            if (coupon_discount > 0) {
                let create_stripe_coupon = await StripeServices.create_coupon({
                    duration: "once",
                    amount_off: coupon_discount,
                    currency: "USD",
                    max_redemptions: 1,
                });

                if (create_stripe_coupon) {
                    let create_coupon = await Coupons.create({
                        name: create_stripe_coupon.id,
                        duration: create_stripe_coupon.duration,
                        duration_in_months: create_stripe_coupon.duration_in_months ? create_stripe_coupon.duration_in_months : 0,
                        stripe_coupon_id: create_stripe_coupon.id,
                        amount_off: (create_stripe_coupon.amount_off) / 100,
                        total_amount: (create_stripe_coupon.amount_off) / 100,
                        max_redemptions: create_stripe_coupon.max_redemptions,
                        user_id: user_id,
                        status: "used",
                        discount_type: "flat"
                    }).fetch();

                    if (create_coupon) {
                        let update_active_stripe_subscription = await StripeServices.update_subscription(get_active_subscription.stripe_subscription_id, {
                            coupon: create_coupon.stripe_coupon_id
                        });

                        let update_subscription = await Subscriptions.updateOne({ id: get_active_subscription.id }, { coupon_id: create_coupon.id });
                    }
                }
            }
        }
    }
}

exports.apply_referral_discount_at_buy = async (user_id) => {
    let coupon_discount = 0;
    let get_active_subscription = await Subscriptions.findOne({
        status: "active",
        user_id: user_id
    });

    let get_unused_coupons = await Coupons.find({
        user_id: user_id,
        status: "pending"
    });

    if (get_unused_coupons && get_unused_coupons.length > 0) {
        for await (let item of get_unused_coupons) {
            if (item.discount_type === "flat") {
                coupon_discount += (item.total_amount);
            }

            if (item.discount_type === "percentage" && item.percent_off > 0) {
                if (get_active_subscription) {
                    coupon_discount += (Number(item.percent_off) * Number(get_active_subscription.amount)) / 100;
                }
            }

            let update_coupon_status = await Coupons.updateOne({
                id: item.id
            }, {
                status: "used"
            });
        }
    }

    if (coupon_discount > 0) {
        let create_stripe_coupon = await StripeServices.create_coupon({
            duration: "once",
            amount_off: coupon_discount,
            currency: "USD",
            max_redemptions: 1,
        });

        if (create_stripe_coupon) {
            let create_coupon = await Coupons.create({
                name: create_stripe_coupon.id,
                duration: create_stripe_coupon.duration,
                duration_in_months: create_stripe_coupon.duration_in_months ? create_stripe_coupon.duration_in_months : 0,
                stripe_coupon_id: create_stripe_coupon.id,
                amount_off: create_stripe_coupon.amount_off,
                total_amount: create_stripe_coupon.amount_off,
                max_redemptions: create_stripe_coupon.max_redemptions,
                user_id: user_id,
                status: "used",
                discount_type: "flat"
            }).fetch();

            if (create_coupon) {
                let update_active_stripe_subscription = await StripeServices.update_subscription(get_active_subscription.stripe_subscription_id, {
                    coupon: create_coupon.stripe_coupon_id
                });

                let update_subscription = await Subscriptions.updateOne({ id: get_active_subscription.id }, { coupon_id: create_coupon.id });
            }
        }
    }
}

exports.calculate_discount_before_subscribe = async (user_id, subscription_plan_id) => {
    let coupon_discount = 0;
    let get_subscription_plan = await SubscriptionPlans.findOne({
        id: subscription_plan_id
    });

    let get_unused_coupons = await Discount.find({
        // user_id: user_id,
        discount_status: "pending"
    });
    console.log(get_unused_coupons, "---get_unused_coupons");

    if (get_subscription_plan) {

        let get_discount = await SubscriptionPlans.findOne({
            id: subscription_plan_id
        });

        
        if (get_subscription_plan.discount_type === "flat") {
            coupon_discount += (item.amount_value);
        }
        if (get_subscription_plan.discount_type === "percentage") {
            if (get_subscription_plan) {
                console.log("in per", get_subscription_plan);
                coupon_discount += (Number(item.amount_value) * Number(get_subscription_plan.amount)) / 100;
                console.log(coupon_discount, "---coupon_discount");
            }
        }
    }
    // if (get_unused_coupons && get_unused_coupons.length > 0) {
    //     for await (let item of get_unused_coupons) {
    //         if (item.discount_type === "flat") {
    //             coupon_discount += (item.amount_value);
    //         }

    //         if (item.discount_type === "percentage") {
    //             if (get_subscription_plan) {
    //                 console.log("in per", get_subscription_plan);
    //                 coupon_discount += (Number(item.amount_value) * Number(get_subscription_plan.amount)) / 100;
    //                 console.log(coupon_discount,"---coupon_discount");
    //             }
    //         }
    //     }
    // }

    return coupon_discount;
}