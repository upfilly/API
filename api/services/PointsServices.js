const moment = require('moment');
const Utils = require('./Utils');
const FCM = require('./FcmServices');

exports.get_point = async (key) => {
    let get_points = await Points.findOne({ where: { isTemplate: true }, select: [key] });
    return get_points[key];
}

exports.create_points = async (payload) => {
    let add_points = await Points.create(payload).fetch();
    return add_points;
}

exports.add_subscription_points = async (user_id) => {
    let get_subscription_points = await this.get_point("subscription");
    let get_user_points = await Points.findOne({ user_id: user_id, isTemplate: false });
    if (get_user_points) {
        if (get_user_points.subscription <= 0) {
            let update_points = await Points.updateOne({ id: get_user_points.id }, { subscription: get_subscription_points });
            return update_points;
        }
    } else {
        let add_points = await this.create_points({
            user_id: user_id,
            subscription: get_subscription_points > 0 ? get_subscription_points : 0
        });
        return add_points;
    }

    return false;
}

exports.add_user_points = async (user_id, point_key) => {
    let get_points = await this.get_point(point_key);
    let get_user_points = await Points.findOne({ user_id: user_id, isTemplate: false });
    if (get_user_points) {
        let update_payload = {};
        update_payload[point_key] = get_user_points[point_key] > 0 ? get_user_points[point_key] : 0 + Number(get_points);
        update_payload[point_key] = (get_user_points[point_key] > 0 ? get_user_points[point_key] : 0) + Number(get_points);
        update_payload.total = (Number(get_user_points.total) > 0 ? Number(get_user_points.total) : 0) + Number(get_points);
        update_payload.remaining = (Number(get_user_points.remaining) > 0 ? Number(get_user_points.remaining) : 0) + Number(get_points);
        let update_points = await Points.updateOne({ id: get_user_points.id }, update_payload);

        if (update_points) {
            //-------------------- Send Notification If Points Above 100 ------------------//
            if (update_points.remaining >= 100) {
                let get_brand = await Users.findOne({ id: update_points.user_id });

                let notification_payload = {};
                notification_payload.send_to = get_brand.id;
                notification_payload.title = `Points | Reached 100+ | ${await Utils.title_case(get_brand.fullName)}`;
                notification_payload.message = `Your points reached ${update_points.remaining}, You can redeem now.`;
                notification_payload.type = "points"
                notification_payload.addedBy = get_brand.id;
                notification_payload.points_id = update_points.id;
                let create_notification = await Notifications.create(notification_payload).fetch();
                if (create_notification && get_brand.device_token) {
                    let fcm_payload = {
                        device_token: get_brand.device_token,
                        title: create_notification.title,
                        message: create_notification.message,
                    }

                    await FCM.send_fcm_push_notification(fcm_payload)
                }
            }

            //-------------------- Send Notification If Points Above 100 ------------------//
        }
        return update_points;
    }

    let create_payload = {};
    create_payload.user_id = user_id;
    create_payload[point_key] = get_points;
    create_payload.total = get_points;
    create_payload.remaining = get_points;
    let add_points = await Points.create(create_payload).fetch();
    return add_points;
}

exports.get_sum_of_all_points = async (user_id, isTemplate) => {
    let get_user_points = await Points.findOne({ user_id: user_id, isTemplate: isTemplate });
    let total = 0;
    if (get_user_points) {
        let values = Object.values(get_user_points);
        if (values && values.length > 0) {
            for await (let value of values) {
                if (typeof (value) == "number") {
                    total += value
                }
            }
        }
    }
    return total;
}

exports.calculate_login_streak_points = (streak) => {
    // Streaks: 1 point for logging in, 
    // if they login everyday in a row for 3 days, they get 10 points, 
    // if they login everyday in a row for 5 days, 20 points
    // and for 10 days in a row 40 points. 
    // If they miss a day when logging it resets to 1 point a day.

    if (streak > 10) {       // Reset streak if greater then 10 days
        streak = Number(String(streak).slice(-1));
    }

    let points = 0;
    if (streak == 0 || streak == 1) {
        points = 1;
    } else if (streak == 3) {
        points = 10;
    } else if (streak == 5) {
        points = 20;
    } else if (streak == 10) {
        points = 40;
    }

    return points;
}

exports.update_login_streak_points = async (user_id, streak) => {
    let get_points = this.calculate_login_streak_points(streak);
    let get_user_points = await Points.findOne({ user_id: user_id, isTemplate: false });
    if (get_user_points) {
        let update_payload = {};
        update_payload.last_login_streak_at_string = moment(new Date()).format("YYYY-MM-DD");
        if (get_user_points.last_login_streak_at_string != update_payload.last_login_streak_at_string) {
            // update_payload.login_streak = get_user_points.login_streak > 0 ? get_user_points.login_streak : 0 + get_points;
            update_payload.login_streak = (Number(get_user_points.login_streak) > 0 ? Number(get_user_points.login_streak) : 0) + Number(get_points);
            update_payload.total = (Number(get_user_points.total) > 0 ? Number(get_user_points.total) : 0) + Number(get_points);
            update_payload.remaining = (Number(get_user_points.remaining) > 0 ? Number(get_user_points.remaining) : 0) + Number(get_points);
            // console.log(update_payload.total, '=============== update_payload.total1111', get_points);

            let update_points = await Points.updateOne({ id: get_user_points.id }, update_payload);
            if (update_points) {
                //-------------------- Send Notification If Points Above 100 ------------------//
                if (update_points.remaining >= 100) {
                    let get_brand = await Users.findOne({ id: update_points.user_id });

                    let notification_payload = {};
                    notification_payload.send_to = get_brand.id;
                    notification_payload.title = `Points | Reached 100+ | ${await Utils.title_case(get_brand.fullName)}`;
                    notification_payload.message = `Your points reached ${update_points.remaining}, You can redeem now.`;
                    notification_payload.type = "points"
                    notification_payload.addedBy = get_brand.id;
                    notification_payload.points_id = update_points.id;
                    let create_notification = await Notifications.create(notification_payload).fetch();
                    if (create_notification && get_brand.device_token) {
                        let fcm_payload = {
                            device_token: get_brand.device_token,
                            title: create_notification.title,
                            message: create_notification.message,
                        }

                        await FCM.send_fcm_push_notification(fcm_payload)
                    }
                }

                //-------------------- Send Notification If Points Above 100 ------------------//
            }
            return update_points;
        }
        return false;
    } else {
        let create_payload = {};
        create_payload.user_id = user_id;
        create_payload.login_streak = Number(get_points);
        create_payload.total = Number(get_points);
        create_payload.remaining = Number(get_points);
        create_payload.last_login_streak_at_string = moment(new Date()).format("YYYY-MM-DD");
        // console.log(create_payload.total, '=============== create_payload.total1111', get_points);

        let add_points = await Points.create(create_payload).fetch();
        return add_points;
    }
}