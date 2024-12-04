const moment = require('moment');
const { constants } = require('../../config/constants');
// const ObjectId = require('mongodb').ObjectId;
// connect.new ObjectId = core.BSON.new ObjectId;
// connect.new ObjectId = core.BSON.new ObjectId;

exports.addOffsetTime = (date, offset) => {
    if (offset < 0) {
        let newOffset = Math.abs(offset)
        date.setMinutes(newOffset)
    } else {
        date.setMinutes(offset)
    }
    return date;
}

exports.getTimeOffSet = async () => {
    let currentDate = new Date();
    const offset = currentDate.getTimezoneOffset();
    return offset;
}

exports.getDate = async (stringDate) => {  // stringDate formate must be in yyyy:mm:dd, Example : 2022-3-4
    let date = new Date(stringDate);
    const offset = await this.getTimeOffSet();
    date = await this.addOffsetTime(date, offset);
    return date;
}

exports.getStartDate = async (stringDate) => {  // stringDate formate must be in yyyy:mm:dd, Example : 2022-3-4
    let date = new Date(stringDate);
    const offset = await this.getTimeOffSet();
    date = await this.addOffsetTime(date, offset);
    date.setUTCHours(0, 0, 0, 0)
    return date;
}

exports.getEndDate = async (stringDate) => {  // stringDate formate must be in yyyy:mm:dd, Example : 2022-3-4
    let date = new Date(stringDate);
    const offset = await this.getTimeOffSet();
    date = await this.addOffsetTime(date, offset);
    date.setUTCHours(23, 59, 59, 999)
    return date;
}

exports.get_admin = async () => {
    let get_admin = await Users.findOne({
        role: "admin"
    });

    return get_admin;
}

exports.title_case = (string) => {
    string = string.toLowerCase()
    string = string.split(' ');
    for (let i in string) {
        string[i] = string[i].charAt(0).toUpperCase() + string[i].slice(1);
    }

    return string.join(' ');
}


exports.string_to_date_format = async (string_date) => {
    // string_date format should be "YYYY-MM-DD" to get correct date;
    let new_date = moment(string_date, constants.BUTTONS.FROM_STRING_TO_DATE_FORMATE).format(constants.BUTTONS.DATE_FORMATE);
    return new_date;
}

exports.get_current_year = async () => {
    let get_year = await moment().year();
    return get_year;
}

exports.get_current_month = async () => {
    let get_month = await moment().month();
    return get_month;
}

exports.get_current_date_seperate_data = async () => {
    let get_year = await moment().year();
    let get_month = await moment().month();
    let get_day = await moment().day();

    return {
        year: get_year,
        month: get_month,
        day: get_day
    };
}

exports.remove_html_tags = (string) => {
    if (!string)
        return "";
    else
        string = string.toString();
    return string.replace(/(<([^>]+)>)/ig, '');
}


exports.remove_double_quotes = (string) => {
    if (!string)
        return "";
    else
        string = string.toString();
    return string.replace(/['"]+/g, '');
}

exports.humanize = (str) => {
    var i, frags = str.split('_');
    for (i = 0; i < frags.length; i++) {
        frags[i] = frags[i].charAt(0).toUpperCase() + frags[i].slice(1);
    }
    return frags.join(' ');
}


exports.get_date_seperate_data = async (date) => {      // should be in utc format
    let get_year = await moment(date).utc().year();
    let get_month = await moment(date).utc().month();
    let get_day = await moment(date).utc().day();
    let get_hours = await moment(date).utc().hours();
    let get_minutes = await moment(date).utc().minutes();
    let get_seconds = await moment(date).utc().seconds();

    return {
        year: get_year,
        month: get_month,
        day: get_day,
        hours: get_hours,
        minutes: get_minutes,
        seconds: get_seconds
    };
}

exports.get_hour_and_minutes = async (start_date, end_date) => {
    start_date = moment(start_date);
    end_date = moment(end_date);
    let duration = moment.duration(end_date.diff(start_date));
    let exact_hours = duration.asHours();
    let exact_minutes = duration.asMinutes();
    let minutes = moment.utc(moment(end_date, "HH:mm:ss").diff(moment(start_date, "HH:mm:ss"))).format("mm")
    let round_hours = end_date.diff(start_date, 'hours');
    return {
        exact_hours: exact_hours,
        round_hours: round_hours,
        minutes: minutes,
        exact_minutes: exact_minutes,
    }
}

exports.remove_special_char_exept_underscores = (string) => {
    string = string.replace(/[^a-zA-Z0-9_. -]/g, "");
    return string;
}

exports.get_unique_from_arr_of_str = async (arr) => {
    let unique_arr = arr.filter((value, index, array) => {
        return array.indexOf(value) === index;
    });

    return unique_arr;
}

exports.string_to_array = async (string) => {
    if (string) {
        let string_arr = string.split(',');
        let string_arr2 = [];
        for await (let item of string_arr) {
            string_arr2.push(item);
        }
        return string_arr2;
    }

    return []
}

exports.get_first_letter_from_each_word = async (string) => {
    let new_string = "";
    string = string.replace(/\s+/g, ' ').trim()             // To Remove extra whitespaces from the string like double, triple or more whitespaces
    let string_arr = string.split(' ');

    if (string_arr && string_arr.length > 0) {
        for await (let item of string_arr) {
            new_string += item[0]
        }
    }

    return new_string
}

exports.remove_whitespace_from_string = (string) => {
    string = string.replace(/\s/g, '')
    return string;
}

exports.make_starts_with_regex = (string) => {
    return new RegExp(`^${string}`);
}

exports.make_valid_social_media_username = (name) => {
    if (typeof (name) == 'string') {
        return name.replace(/[^a-z0-9-]/g, '')
    }
    return name
}
exports.paginate = (array, count, page_no) => {
    return array.slice((page_no - 1) * count, page_no * count);
}
