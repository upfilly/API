const moment = require('moment');
const Utils = require('./Utils');

exports.add_login_timeline = async (user_id) => {
    let login_timeline_payload = {
        user_id: user_id,
    };
    login_timeline_payload.login_at = new Date();
    login_timeline_payload.login_at_string = moment(new Date()).format("YYYY-MM-DD");
    let add_login_timeline = await LoginTimeline.create(login_timeline_payload).fetch();
    return add_login_timeline
}

exports.get_timeline_arr = async (user_id) => {
    let get_user_timeline = await LoginTimeline.find({
        user_id: user_id
    });
    if (get_user_timeline && get_user_timeline.length > 0) {
        let get_string_dates = get_user_timeline.map(item => item.login_at_string);
        if (get_string_dates && get_string_dates.length > 0) {
            let get_unquire_arr = await Utils.get_unique_from_arr_of_str(get_string_dates);
            return get_unquire_arr;
        }
    }
}

exports.fetch_current_streak = async (user_id) => {
    let login_arr = await this.get_timeline_arr(user_id);
    let [streak, i] = [0, 0]
    let reverse_arr = login_arr.reverse();
    // login_arr.reverse().forEach((el, i) => {
    //     if ((new Date().setUTCHours(0, 0, 0, 0) - new Date(el.date).setUTCHours(0, 0, 0, 0)) === i * 86400000){
    //         streak++
    //     } 
    // })

    for await (let item of reverse_arr) {
        if ((new Date().setUTCHours(0, 0, 0, 0) - new Date(item).setUTCHours(0, 0, 0, 0)) === i * 86400000) {
            streak++
        }
        i++;
    }
    return streak;
}



