const Joi = require('joi');
const Validate = require('./Validate').validate;

exports.register = async (req, res, next) => {

    const schema = Joi.object({
        firstName: Joi.string().optional().min(3).max(50).allow(""),
        lastName: Joi.string().optional().allow("").max(50),
        fullName: Joi.string().optional().allow("").min(3).max(50),
        brand_name: Joi.string().optional().allow("").min(3).max(50),
        email: Joi.string().required(),
        password: Joi.string().optional(),
        role: Joi.string().optional().valid("brand", "affiliate", "admin", "customer"),
        countryCode: Joi.string().optional().allow(""),
        dialCode: Joi.string().optional().allow(""),
        address: Joi.string().optional().allow(""),
        country: Joi.string().optional().allow(""),
        state: Joi.string().optional().allow(""),
        city: Joi.string().optional().allow(""),
        pincode: Joi.string().optional().allow("").max(12),
        parter_manager_id: Joi.string().optional().allow(null),
        account_executive_id: Joi.string().optional().allow(null),
        refferedBy: Joi.string().optional().valid('active', 'deactive'),
        status: Joi.string().optional().valid('active', 'deactive'),
        labels: Joi.string().optional().allow(""),
        currency: Joi.string().optional().allow(""),
        allow_notification: Joi.boolean().optional(),
        is_enable_mediacost: Joi.boolean().optional(),
        createdByBrand: Joi.string().optional().allow(null),
        affiliate_group: Joi.string().optional().allow(null),
        isSetPasswordManually: Joi.boolean().optional(),
        campaign_unique_id: Joi.string().optional().allow(""),
        payment_method: Joi.string().optional(),
        device_token: Joi.string().optional().allow(""),
        referral_code: Joi.string().optional().allow(""),

    });
    return await Validate(schema, req, res);

}

exports.addUser = async (req, res, next) => {
    const schema = Joi.object({
        firstName: Joi.string().optional().min(3).max(50).allow(""),
        lastName: Joi.string().optional().allow("").max(50),
        fullName: Joi.string().optional().allow("").min(3).max(50),
        email: Joi.string().required(),
        password: Joi.string().optional(),
        languages: Joi.string().optional(),
        bio: Joi.string().optional().allow(""),
        description: Joi.string().optional().allow(""),
        website: Joi.string().optional().allow(""),
        about_content: Joi.string().optional().allow(""),
        countryCode: Joi.string().optional().allow(""),
        dialCode: Joi.string().optional().allow(""),
        mobileNo: Joi.string().optional().allow("").min(5).max(12),
        image: Joi.string().optional().allow(""),
        role: Joi.string().required().valid('brand', 'affiliate', 'team', 'customer', 'users', 'affiliate', 'operator', 'analyzer', 'publisher'),
        category_id: Joi.string().optional().allow(null),
        gender: Joi.string().optional(),
        address: Joi.string().optional().allow(""),
        country: Joi.string().optional().allow(""),
        state: Joi.string().optional().allow(""),
        city: Joi.string().optional().allow(""),
        pincode: Joi.string().optional().allow("").max(12),
        social_media_platforms: Joi.array().optional().items(
            Joi.string().optional().allow("").valid("youtube", "tiktok", "twitter", "instagram", "linkedin",)
        ),

        instagram_username: Joi.string().optional().allow(""),
        instagram_profile_link: Joi.string().optional().allow(""),

        youtube_username: Joi.string().optional().allow(""),
        youtube_profile_link: Joi.string().optional().allow(""),

        twitter_username: Joi.string().optional().allow(""),
        twitter_profile_link: Joi.string().optional().allow(""),

        linkedin_username: Joi.string().optional().allow(""),
        linkedin_profile_link: Joi.string().optional().allow(""),

        tags: Joi.array().optional().items(
            Joi.string().optional()
        ),

        lat: Joi.string().optional(),
        lng: Joi.string().optional(),

        permissions: Joi.object({
            affiliate_disabled: Joi.boolean().optional(),
            affiliate_read: Joi.boolean().optional(),
            affiliate_write: Joi.boolean().optional(),

            brand_disabled: Joi.boolean().optional(),
            brand_read: Joi.boolean().optional(),
            brand_write: Joi.boolean().optional(),

            is_admin_access: Joi.boolean().optional(),
        }),
        isTrusted: Joi.boolean().optional(),
        countryCode: Joi.string().optional().allow(""),
        dialCode: Joi.string().optional().allow(""),
        address: Joi.string().optional().allow(""),
        parter_manager_id: Joi.string().optional().allow(null),
        account_executive_id: Joi.string().optional().allow(null),
        refferedBy: Joi.string().optional().valid('active', 'deactive'),
        status: Joi.string().optional().valid('active', 'deactive'),
        labels: Joi.string().optional().allow(""),
        currency: Joi.string().optional().allow(""),
        allow_notification: Joi.boolean().optional(),
        is_enable_mediacost: Joi.boolean().optional(),
        createdByBrand: Joi.string().optional().allow(null),
        affiliate_group: Joi.string().optional().allow(null),
        isSetPasswordManually: Joi.boolean().optional(),
        reffering_affiliate: Joi.string().optional(),
        affiliate_code: Joi.string().optional(),
        reffer_domain: Joi.string().optional(),

        //Extra keys for affiliate
        address2: Joi.string().optional().allow(""),
        auto_invoice: Joi.boolean().optional(),
        is_hide_invoice: Joi.boolean().optional(),
        billing_frequency: Joi.string().optional(),
        payment_method: Joi.string().optional(),
        tax_detail: Joi.string().optional().allow(""),
        default_invoice_setting: Joi.string().optional(),
        title: Joi.string().optional(),
        time_zone: Joi.string().optional(),
        instant_messaging: Joi.string().optional(),
        language: Joi.string().optional(),
        work_phone: Joi.string().optional().allow("").min(5),
        isSendActivationEmail: Joi.boolean().optional(),
        isSetPasswordManually: Joi.boolean().optional(),
        affiliate_group: Joi.string().optional().allow(null),
        refferedBy: Joi.string().optional().valid('active', 'deactive'),
        cellDialCode: Joi.string().optional().allow(""),

        parter_manager_id: Joi.string().optional().allow(null),
        account_executive_id: Joi.string().optional().allow(null),
        status: Joi.string().optional().valid('active', 'deactive'),
        allow_notification: Joi.boolean().optional(),
        is_enable_mediacost: Joi.boolean().optional(),
        device_token: Joi.string().optional().allow(""),
        //Bank details
        // accountholder_name: Joi.string().optional(),
        // routing_number: Joi.string().optional().min(9),
        // account_number: Joi.string().optional(),
        // ssn_number: Joi.string().optional().min(9),

        // dob: Joi.object({
        //     day: Joi.number().optional(),
        //     month: Joi.number().optional(),
        //     year: Joi.number().optional(),
        // }).optional(),

        front_image: Joi.string().optional(),
        back_image: Joi.string().optional(),
        // company_name: Joi.string().required(),


        federal_text_classification: Joi.string().optional().valid("individual", "s_corporation", "c_corporation", "patnership", "limited_liability",),
        social_security_number: Joi.string().optional(),
        tax_classification: Joi.string().optional(),
        tax_name: Joi.string().optional(),
        is_us_citizen: Joi.boolean().optional(),
        trade_name: Joi.string().optional().allow(""),
        ein: Joi.string().optional().allow(""),
        consent_agreed: Joi.boolean().optional(),
        signature: Joi.string().optional().allow(""),
        signature_date: Joi.date().optional().allow(""),

    });
    return await Validate(schema, req, res);

}

exports.editProfile = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        firstName: Joi.string().optional().min(3).max(50).allow(""),
        lastName: Joi.string().optional().allow("").max(50),
        fullName: Joi.string().optional().allow("").min(3).max(50),
        email: Joi.string().optional(),
        affiliate_type: Joi.string().optional().valid("individual", "business"),
        password: Joi.string().optional(),
        description: Joi.string().optional().allow(""),
        website: Joi.string().optional().allow(""),
        bio: Joi.string().optional().allow(""),
        about_content: Joi.string().optional().allow(""),
        countryCode: Joi.string().optional().allow(""),
        dialCode: Joi.string().optional().allow(""),
        mobileNo: Joi.string().optional().allow("").min(5).max(12),
        image: Joi.string().optional().allow(""),
        gender: Joi.string().optional().allow(null),
        address: Joi.string().optional().allow(""),
        country: Joi.string().optional().allow(""),
        state: Joi.string().optional().allow(""),
        city: Joi.string().optional().allow(""),
        pincode: Joi.string().optional().allow("").max(12),
        updated_password: Joi.string().optional(),
        social_media_platforms: Joi.array().optional().items(
            Joi.string().optional().allow("").valid("youtube", "tiktok", "twitter", "instagram", "linkedin",)
        ),

        instagram_username: Joi.string().optional().allow(""),
        instagram_profile_link: Joi.string().optional().allow(""),

        youtube_username: Joi.string().optional().allow(""),
        youtube_profile_link: Joi.string().optional().allow(""),

        twitter_username: Joi.string().optional().allow(""),
        twitter_profile_link: Joi.string().optional().allow(""),

        linkedin_username: Joi.string().optional().allow(""),
        linkedin_profile_link: Joi.string().optional().allow(""),

        tags: Joi.array().optional().items(
            Joi.string().optional()
        ),

        lat: Joi.string().optional(),
        lng: Joi.string().optional(),

        company_name: Joi.string().optional().allow(""),
        company_email: Joi.string().optional().allow(""),
        company_address: Joi.string().optional().allow(""),
        company_country_code: Joi.string().optional().allow(""),
        company_dial_code: Joi.string().optional().allow(""),
        company_mobile_no: Joi.string().optional().allow("").min(5).max(12),
        budget_from: Joi.number().optional().min(0),


        //Extra keys for affiliate
        address2: Joi.string().optional().allow(""),
        auto_invoice: Joi.boolean().optional(),
        is_hide_invoice: Joi.boolean().optional(),
        billing_frequency: Joi.string().optional(),
        payment_method: Joi.string().optional(),
        tax_detail: Joi.string().optional().allow(""),
        default_invoice_setting: Joi.string().optional(),
        title: Joi.string().optional(),
        time_zone: Joi.string().optional(),
        instant_messaging: Joi.string().optional(),
        language: Joi.string().optional(),
        work_phone: Joi.string().optional().allow("").min(5),
        isSendActivationEmail: Joi.boolean().optional(),
        isSetPasswordManually: Joi.boolean().optional(),
        affiliate_group: Joi.string().optional().allow(null),
        refferedBy: Joi.string().optional().valid('active', 'deactive'),
        cellDialCode: Joi.string().optional().allow(""),

        parter_manager_id: Joi.string().optional().allow(null),
        account_executive_id: Joi.string().optional().allow(null),
        status: Joi.string().optional().valid('active', 'deactive'),
        labels: Joi.string().optional(),
        allow_notification: Joi.boolean().optional(),
        is_enable_mediacost: Joi.boolean().optional(),

        permissions: Joi.object({
            id: Joi.string().required(),
            affiliate_disabled: Joi.boolean().optional(),
            affiliate_read: Joi.boolean().optional(),
            affiliate_write: Joi.boolean().optional(),

            brand_disabled: Joi.boolean().optional(),
            brand_read: Joi.boolean().optional(),
            brand_write: Joi.boolean().optional(),

            is_admin_access: Joi.boolean().optional(),
        }),
        isTrusted: Joi.boolean().optional(),
        category_id: Joi.string().optional().allow(null),
        step: Joi.number().optional().min(1).max(4),
        profile_status: Joi.string().optional().valid('pending', 'completed'),

        accountholder_name: Joi.string().optional(),
        routing_number: Joi.string().optional().min(9),
        account_number: Joi.string().optional(),
        // first_name: Joi.string().optional(),
        // last_name: Joi.string().optional(),
        // mobile: Joi.string().optional(),
        ssn_number: Joi.string().optional().min(9),

        // dob: Joi.object({
        //     day: Joi.number().optional(),
        //     month: Joi.number().optional(),
        //     year: Joi.number().optional(),
        // }).optional(),

        // address: Joi.object({
        //     line1: Joi.string().optional(),
        //     city: Joi.string().optional(),
        //     state: Joi.string().optional(),
        //     postal_code: Joi.string().optional()
        // }).optional(),

        // frontdoc: Joi.string().optional(),
        // backdoc: Joi.string().optional(),
        company_name: Joi.string().optional(),
        federal_text_classification: Joi.string().optional().valid("individual", "s_corporation", "c_corporation", "patnership", "limited_liability",),
        social_security_number: Joi.string().optional(),
        tax_classification: Joi.string().optional(),
        tax_name: Joi.string().optional(),
        is_us_citizen: Joi.boolean().optional(),
        trade_name: Joi.string().optional().allow(""),
        ein: Joi.string().optional().allow(""),
        consent_agreed: Joi.boolean().optional(),
        signature: Joi.string().optional().allow(""),
        signature_date: Joi.date().optional().allow(""),
    });
    return await Validate(schema, req, res);

}

exports.verifyUserEmail = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        verificationCode: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}
exports.resendOtp = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}

// exports.editUser = async (req, res, next) => {
//     const schema = Joi.object({
//         id: Joi.string().required(),
//         firstName: Joi.string().optional().min(3).max(50).allow(""),
//         lastName: Joi.string().optional().allow("").max(50),
//         fullName: Joi.string().optional().allow("").min(3).max(50),
//         email: Joi.string().optional(),
//         password: Joi.string().optional(),
//         description: Joi.string().optional().allow(""),
//         website: Joi.string().optional().allow(""),
//         bio: Joi.string().optional().allow(""),
//         about_content: Joi.string().optional().allow(""),
//         countryCode: Joi.string().optional().allow(""),
//         dialCode: Joi.string().optional().allow(""),
//         mobileNo: Joi.string().optional().allow("").min(5).max(12),
//         image: Joi.string().optional().allow(""),
//         gender: Joi.string().optional().allow(null),
//         address: Joi.string().optional().allow(""),
//         country: Joi.string().optional().allow(""),
//         state: Joi.string().optional().allow(""),
//         city: Joi.string().optional().allow(""),
//         pincode: Joi.string().optional().allow("").max(12),
//         social_media_platforms: Joi.array().optional().items(
//             Joi.string().optional().allow("").valid("youtube", "tiktok", "twitter", "instagram", "linkedin",)
//         ),

//         instagram_username: Joi.string().optional().allow(""),
//         instagram_profile_link: Joi.string().optional().allow(""),

//         tiktok_username: Joi.string().optional().allow(""),
//         tiktok_profile_link: Joi.string().optional().allow(""),

//         youtube_username: Joi.string().optional().allow(""),
//         youtube_profile_link: Joi.string().optional().allow(""),

//         twitter_username: Joi.string().optional().allow(""),
//         twitter_profile_link: Joi.string().optional().allow(""),

//         linkedin_username: Joi.string().optional().allow(""),
//         linkedin_profile_link: Joi.string().optional().allow(""),

//         niches: Joi.array().optional().items(
//             Joi.string().optional()
//         ),
//         tags: Joi.array().optional().items(
//             Joi.string().optional()
//         ),

//         lat: Joi.string().optional(),
//         lng: Joi.string().optional(),
//         isFeatured: Joi.boolean().optional(),
//         permissions: Joi.object({
//             id: Joi.string().required(),
//             influencer_disabled: Joi.boolean().optional(),
//             influencer_read: Joi.boolean().optional(),
//             influencer_write: Joi.boolean().optional(),

//             brand_disabled: Joi.boolean().optional(),
//             brand_read: Joi.boolean().optional(),
//             brand_write: Joi.boolean().optional(),

//             is_admin_access: Joi.boolean().optional(),
//         }),
//     });
//     return await Validate(schema, req, res);

// }


exports.changePassword = async (req, res, next) => {
    const schema = Joi.object({
        newPassword: Joi.string().required(),
        confirmPassword: Joi.string().optional(),
        currentPassword: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}

exports.resetPassword = async (req, res, next) => {
    const schema = Joi.object({
        code: Joi.string().required(),
        newPassword: Joi.string().required(),
        confirmPassword: Joi.string().optional(),
    });
    return await Validate(schema, req, res);
}

exports.forgotPassword = async (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().required(),
        // newPassword: Joi.string().required(),
    });
    return await Validate(schema, req, res);
}

exports.userAutoLogin = async (req, res, next) => {
    const schema = Joi.object({
        id: Joi.string().required(),
        device_token: Joi.string().optional().allow(""),
    });
    return await Validate(schema, req, res);
}

exports.updateBasicDetails = async (req, res, next) => {

    const schema = Joi.object({
        id: Joi.string().required(),
        dialCode: Joi.string().optional().allow(""),
        mobileNo: Joi.string().optional().allow("").min(5).max(12),
        image: Joi.string().optional().allow(""),
        logo: Joi.string().optional().allow(""),
        banner_image: Joi.string().optional().allow(""),
    });
    return await Validate(schema, req, res);

}

exports.userSignin = async (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().required(),
        device_token: Joi.string().optional().allow(""),
        remember: Joi.any().optional(),
    });
    return await Validate(schema, req, res);
}

exports.adminSignin = async (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().required(),
        device_token: Joi.string().optional().allow(""),
        remember: Joi.any().optional(),
    });
    return await Validate(schema, req, res);
}

exports.userSocialLogin = async (req, res, next) => {
    const schema = Joi.object({
        role: Joi.string().required().valid("brand", "affiliate", "customer"),
        email: Joi.string().optional().allow(""),
        facebook_auth_id: Joi.string().optional().allow(""),
        google_auth_id: Joi.string().optional().allow(""),
        firstName: Joi.string().optional().min(3).max(50).allow(""),
        lastName: Joi.string().optional().allow("").max(50),
        fullName: Joi.string().optional().allow("").min(3).max(50),
        gender: Joi.string().optional(),
        device_token: Joi.string().optional().allow(""),
    });
    return await Validate(schema, req, res);
}
