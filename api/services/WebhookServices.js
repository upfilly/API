const UserServices = require('./UserServices');

exports.create_subscription_transaction = async (event_object) => {

    let get_subscription_data = await Subscriptions.findOne({
        stripe_subscription_id: event_object.subscription
    });

    if (get_subscription_data) {
        let remove_coupon_from_subscription = this.remove_coupon_from_subscription(get_subscription_data.id)
        let get_subscription_plan = await SubscriptionPlans.findOne({
            id: get_subscription_data.subscription_plan_id
        });

        let transaction_payload = {
            user_id: get_subscription_data.user_id,
            paid_to: get_subscription_plan ? get_subscription_plan.addedBy : null,
            transaction_type: "buy_subscription",
            subscription_plan_id: get_subscription_plan.id,
            transaction_id: event_object.id,
            subscription_id: get_subscription_data.id,
            stripe_charge_id: event_object.id,
            currency: event_object.currency,
            amount: event_object.amount_paid ? event_object.amount_paid/100 : 0,
            stripe_subscription_id: event_object.subscription,
            transaction_status: event_object.status,
        }

        if (event_object.status == "paid") {
            transaction_payload.transaction_status = "successful";
        }
        let create_transacton = await Transactions.create(transaction_payload).fetch();
        if (create_transacton) {
            if (create_transacton.transaction_type == "buy_subscription") {
                let get_plan_added_by = await Users.findOne({ id: get_subscription_plan.addedBy });
                let get_subscriber = await Users.findOne({ id: get_subscription_data.user_id });
                let email_payload_to_admin = {
                    email: get_plan_added_by.email,
                    subscription_id: get_subscription_data.id,
                    user_id: get_plan_added_by.id,
                    subscribed_by: get_subscription_data.user_id,
                    transaction_id: create_transacton.id
                }

                let email_payload_to_user = {
                    email: get_subscriber.email,
                    subscription_id: get_subscription_data.id,
                    user_id: get_subscriber.id,
                    subscribed_by: get_subscriber.id,
                    transaction_id: create_transacton.id
                }

                return {
                    admin_payload: email_payload_to_admin,
                    user_payload: email_payload_to_user
                }
                // await Emails.OnboardingEmails.subscription_transaction_email(email_payload_to_admin);
                // await Emails.OnboardingEmails.subscription_transaction_email(email_payload_to_user);
            }
            return false;
        }
        return false;
    }

    return false
}

exports.update_subscription_valid_upto = async (event_object) => {
    let update_subscription = await Subscriptions.updateOne({ stripe_subscription_id: event_object.id }, {
        valid_upto: new Date(event_object.current_period_end * 1000),
        status: "active"
    });

    return update_subscription;
}

exports.update_trial_period_end_date = async (event_object) => {
    if (event_object.id) {
        let get_subscription_data = await Subscriptions.updateOne({
            stripe_subscription_id: event_object.id
        },
            {
                trial_period_end_date: new Date(event_object.trial_end * 1000)
            }
        );

        if (get_subscription_data) {
            let get_user_notification_email = await UserServices.get_user_notification_email(get_subscription_data.user_id)
            let email_payload_to_user = {
                email: get_user_notification_email,
                subscription_id: get_subscription_data.id,
                user_id: get_subscription_data.user_id,
                subscribed_by: get_subscription_data.user_id,
            }

            return {
                user_payload: email_payload_to_user
            }
            await Emails.OnboardingEmails.trial_will_end_email(email_payload_to_user)
        }
        return false;
    }
    return false;
}

exports.cancel_subscription = async (event_object) => {
    if (event_object.status == "canceled") {
        let update_subscription = await Subscriptions.updateOne({ stripe_subscription_id: event_object.id }, {
            status: "cancelled"
        });
        return update_subscription;
    }
}

exports.send_upcoming_invoice_email = async (event_object) => {
    if (event_object.subscription) {

        let get_subscription_data = await Subscriptions.findOne({
            stripe_subscription_id: event_object.subscription
        });


        if (get_subscription_data) {
            let get_subscription_plan = await SubscriptionPlans.findOne({
                id: get_subscription_data.subscription_plan_id
            });

            let get_plan_added_by = await Users.findOne({ id: get_subscription_plan.addedBy });
            let get_subscriber = await Users.findOne({ id: get_subscription_data.user_id });
            // let email_payload_to_admin = {
            //     email: get_plan_added_by.email,
            //     subscription_id: get_subscription_data.id,
            //     user_id: get_plan_added_by.id,
            //     subscribed_by: get_subscription_data.user_id,
            //     amount_due: event_object.amount_due
            // }

            let email_payload_to_user = {
                email: get_subscriber.email,
                subscription_id: get_subscription_data.id,
                user_id: get_subscriber.id,
                subscribed_by: get_subscriber.id,
                amount_due: event_object.amount_due / 100,
                period_end: event_object.period_end,
            }
            return {
                user_payload: email_payload_to_user
            }
            // await Emails.OnboardingEmails.subscriptiohn_transaction_email(email_payload_to_admin);
            await Emails.OnboardingEmails.upcomming_invoice_email(email_payload_to_user);
        }
        return false;
    }
    return false;
}

exports.remove_coupon_from_subscription = async (subscription_id) => {
    let get_subscription = await Subscriptions.findOne({ id: subscription_id });
    if (get_subscription && get_subscription.coupon_id) {
        let update_coupon_status = await Coupons.updateOne({
            id: get_subscription.coupon_id
        }, {
            status: "used"
        });

        let update_stripe_subscription = await Subscriptions.updateOne({ id: subscription_id }, {
            coupon_id: null
        });

        return update_stripe_subscription;
    }

}
