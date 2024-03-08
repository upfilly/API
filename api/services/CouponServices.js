const SettingServices = require('./SettingServices')
const StripeServices = require('./StripeServices')

exports.get_total_discount = async (ids) => {
    let total_discount = 0;
    if (ids && ids.length > 0) {
        for await (let id of ids) {
            let get_coupon = await Coupons.findOne({ id: id });
            if (get_coupon) {
                total_discount += Number(get_coupon.total_amount);
            }
        }
    }

    return total_discount;
}

exports.create_coupon_from_referral = async (user_id,) => {
    let get_settings = await SettingServices.get_settings();    // Get settings to find referral discount
    if (get_settings && get_settings.referral_discount > 0) {
        let stripe_coupon_payload = {
            duration: "once",
            max_redemptions: 1,
        };
        if (get_settings.referral_discount_type == "flat") {
            stripe_coupon_payload.amount_off = Number(get_settings.referral_discount);
            stripe_coupon_payload.currency = "USD";
        } else if (get_settings.referral_discount_type == "percentage") {
            stripe_coupon_payload.percent_off = Number(get_settings.referral_discount);
        }

        let create_stripe_coupon = await StripeServices.create_coupon(stripe_coupon_payload);
        if (create_stripe_coupon) {
            let coupon_payload = {
                name: create_stripe_coupon.id,
                duration: create_stripe_coupon.duration,
                stripe_coupon_id: create_stripe_coupon.id,
                max_redemptions: create_stripe_coupon.max_redemptions,
                user_id: user_id,
                discount_type: get_settings.referral_discount_type
            };

            if (create_stripe_coupon.duration_in_months > 0) {
                coupon_payload.duration_in_months = create_stripe_coupon.duration_in_months;
            };

            if (create_stripe_coupon.amount_off) {
                coupon_payload.amount_off = (create_stripe_coupon.amount_off)/100;
            }

            if (create_stripe_coupon.percent_off) {
                coupon_payload.percent_off = create_stripe_coupon.percent_off;
            }

            let create_coupon = await Coupons.create(coupon_payload).fetch();

            if (create_coupon) {
                return create_coupon;
            }
        }

        return false;
    }


    return false;
}
