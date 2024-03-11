const CreatorDb = require('./CreatorDbServices');
const ApifyServices = require('./ApifyServices');


exports.get_user = async (query, projection) => {
    let get_user = await Users.findOne({ where: query, select: projection });
    return get_user;

}

exports.get_user_notification_email = async (user_id) => {

    let get_user_notification_email = await Users.findOne({ id: user_id })

    if (get_user_notification_email.notification_email) {
        return get_user_notification_email.notification_email
    } else {
        return get_user_notification_email.email;
    }
}

exports.get_user_active_subscription = async (user_id) => {
    let get_active_subscription = await Subscriptions.findOne({
        user_id: user_id,
        status: { in: ["active"] },
        valid_upto: { ">=": new Date() }
    });
    return get_active_subscription;
}

exports.get_social_media_for_import = async (obj) => {
    let social_media_platforms = [];
    if (obj.youtube_profile_link) {
        social_media_platforms.push('youtube')
    }
    if (obj.tiktok_profile_link) {
        social_media_platforms.push('tiktok')
    }
    if (obj.twitter_profile_link) {
        social_media_platforms.push('twitter')
    }
    if (obj.facebook_profile_link) {
        social_media_platforms.push('facebook')
    }
    if (obj.instagram_profile_link) {
        social_media_platforms.push('instagram')
    }
    if (obj.pinterest_profile_link) {
        social_media_platforms.push('pinterest')
    }
    if (obj.linkedin_profile_link) {
        social_media_platforms.push('linkedin')
    }
    if (obj.snapchat_profile_link) {
        social_media_platforms.push('snapchat')
    }

    return social_media_platforms;
}

exports.reset_brand_credits = async (user_id, credits) => {
    let get_user = await Users.findOne({ id: user_id });
    let remaining_credits = Number(get_user.remaining_credits);
    let total_credits = Number(credits) + (remaining_credits >= 1 ? remaining_credits : 0);
    let update_credits = await Users.updateOne({ id: user_id }, { total_credits: total_credits, remaining_credits: total_credits });
    return update_credits;
}

exports.deduct_remaingin_credits = async (user_id) => {
    let get_user = await Users.findOne({ id: user_id });
    let remaining_credits = Number(get_user.remaining_credits) - 1;
    let update_credits = await Users.updateOne({ id: user_id }, { remaining_credits: remaining_credits });
    return update_credits;
}

exports.updating_influencer_social_media_data = async (user_id) => {
    try {
        let get_user = await Users.findOne({ id: user_id });
        if (get_user) {
            // ---------------- social media handles details -----------------//
            let update_payload = {};
            // update_payload.analytics_fetched = true;
            if (get_user.instagram_username) {
                let basicInstagram = await CreatorDb.get_instagram_data(get_user.instagram_username)
                if (basicInstagram) {
                    // get_user.basicInstagram = basicInstagram;
                    if (basicInstagram.youtubeId && !get_user.youtube_channel_id) {
                        get_user.youtube_channel_id = basicInstagram.youtubeId;
                        update_payload.youtube_channel_id = basicInstagram.youtubeId;
                    }

                    // if (basicInstagram.avatar && !get_user.image) {
                    //     let profile_url = await InstagramServices.save_instagram_avatar(basicInstagram.avatar);
                    //     if (profile_url) {
                    //         get_user.image = profile_url;
                    //         update_payload.image = profile_url;
                    //     }
                    // }
                }
            }

            if (get_user.tiktok_username) {
                let basicTikTok = await CreatorDb.get_tiktok_data(get_user.tiktok_username)
                if (basicTikTok) {
                    // get_user.basicTikTok = basicTikTok;

                    if (basicTikTok.youtubeId && !get_user.youtube_channel_id) {
                        get_user.youtube_channel_id = basicTikTok.youtubeId;
                        update_payload.youtube_channel_id = basicTikTok.youtubeId;
                    }

                    if (basicTikTok.instagramId && !get_user.instagram_username) {
                        get_user.instagram_username = basicTikTok.instagramId;
                        update_payload.instagram_username = basicTikTok.instagramId;
                    }


                    // if (basicTikTok.avatar && !get_user.image) {
                    //     let profile_url = await InstagramServices.save_instagram_avatar(basicTikTok.avatar);
                    //     if (profile_url) {
                    //         get_user.image = profile_url;
                    //         update_payload.image = profile_url;
                    //     }

                    // }
                }
            }

            if (get_user.youtube_channel_id) {
                let basicYoutube = await CreatorDb.get_youtube_data(get_user.youtube_channel_id)
                if (basicYoutube) {
                    // get_user.basicYoutube = basicYoutube;
                    if (basicYoutube.instagramId && !get_user.instagram_username) {
                        get_user.instagram_username = basicYoutube.instagramId;
                        update_payload.instagram_username = basicYoutube.instagramId;

                        //-------------- calling instagram api again to get latest data -----------//
                        if (get_user.instagram_username) {
                            let basicInstagram = await CreatorDb.get_instagram_data(get_user.instagram_username)
                            if (basicInstagram) {
                                get_user.basicInstagram = basicInstagram;
                            }

                            // if (basicInstagram.avatar && !get_user.image) {
                            //     let profile_url = await InstagramServices.save_instagram_avatar(basicInstagram.avatar);
                            //     if (profile_url) {
                            //         get_user.image = profile_url;
                            //         update_payload.image = profile_url;
                            //     }
                            // }
                        }
                        //-------------- calling instagram api again to get latest data -----------//
                    }


                    if (basicYoutube.tiktokId && !get_user.tiktok_username) {
                        get_user.tiktok_username = basicYoutube.tiktokId;
                        update_payload.tiktok_username = basicYoutube.tiktokId;

                        //-------------- calling tiktok api again to get latest data -----------//
                        if (get_user.tiktok_username) {
                            let basicTikTok = await CreatorDb.get_tiktok_data(get_user.tiktok_username)
                            if (basicTikTok) {
                                // get_user.basicTikTok = basicTikTok;
                                if (basicTikTok.instagramId && !get_user.instagram_username) {

                                    //-------------- calling instagram api again to get latest data -----------//
                                    if (get_user.instagram_username) {
                                        let basicInstagram = await CreatorDb.get_instagram_data(get_user.instagram_username)
                                        if (basicInstagram) {
                                            get_user.basicInstagram = basicInstagram;
                                        }

                                        // if (basicInstagram.avatar && !get_user.image) {
                                        //     let profile_url = await InstagramServices.save_instagram_avatar(basicInstagram.avatar);
                                        //     if (profile_url) {
                                        //         get_user.image = profile_url;
                                        //         update_payload.image = profile_url;
                                        //     }
                                        // }
                                    }
                                    //-------------- calling instagram api again to get latest data -----------//
                                }

                                // if (basicTikTok.avatar && !get_user.image) {
                                //     let profile_url = await InstagramServices.save_instagram_avatar(basicTikTok.avatar);
                                //     if (profile_url) {
                                //         get_user.image = profile_url;
                                //         update_payload.image = profile_url;
                                //     }

                                // }
                            }
                        }
                        //-------------- calling tiktok api again to get latest data -----------//

                    }

                    if (basicYoutube.links && basicYoutube.links.length > 0) {
                        for await (let item of basicYoutube.links) {
                            if (item.title == "Instagram" && !get_user.instagram_profile_link) {
                                // get_user.instagram_profile_link = item.url;
                                update_payload.instagram_profile_link = item.url;
                            }
                            if (item.title == "Twitter" && !get_user.twitter_profile_link) {
                                // get_user.twitter_profile_link = item.url;
                                update_payload.twitter_profile_link = item.url;
                            }
                            if (item.title == "Facebook" && !get_user.facebook_profile_link) {
                                // get_user.facebook_profile_link = item.url;
                                update_payload.facebook_profile_link = item.url;
                            }
                            if (item.title == "Snapchat" && !get_user.snapchat_profile_link) {
                                // get_user.snapchat_profile_link = item.url;
                                update_payload.snapchat_profile_link = item.url;
                            }
                            if (item.title == "TikTok" && !get_user.tiktok_profile_link) {
                                // get_user.tiktok_profile_link = item.url;
                                update_payload.tiktok_profile_link = item.url;
                            }
                            if (item.title == "SUBSCRIBE HERE!" && !get_user.youtube_profile_link) {
                                // get_user.youtube_profile_link = item.url;
                                update_payload.youtube_profile_link = item.url;
                            }
                        }
                    }
                }
            }

            if (Object.keys(update_payload).length > 0) {
                let update_user = await Users.updateOne({ id: get_user.id }, update_payload);
            }

            if (!get_user.image) {
                this.updating_influencer_profile_images(get_user.id);
            }
            // ---------------- social media handles details -----------------//
        }

    } catch (error) {
        console.log(error, '=============error from updating ISMD')
    }
}


exports.updating_influencer_social_media_data_with_chunks = async (user_id_array) => {
    try {

        //------------------- Fetching data from creator db --------------//
        let chunkSize = 50;
        for (let i = 0; i < user_id_array.length; i += chunkSize) {
            const chunk = user_id_array.slice(i, i + chunkSize);
            console.log(chunk)
            for await (let id of chunk) {
                await this.updating_influencer_social_media_data(id);
            }
        }
        //------------------- Fetching data from creator db --------------//
    } catch (error) {
        console.log(error, '=============error from updating ISMD')
    }
}

exports.updating_influencer_profile_images = async (user_id) => {
    try {
        let get_user = await Users.findOne({ id: user_id });
        if (get_user) {
            let update_payload = {};
            update_payload.analytics_fetched = true;
            if (!get_user.image && get_user.instagram_username) {
                let get_instagram_data = await ApifyServices.get_instagram_profile(get_user.instagram_username);
                console.log(get_instagram_data, '============get_instagram_data');
                if (get_instagram_data && get_instagram_data.length > 0) {
                    let instagram_data = get_instagram_data[0];
                    if (instagram_data.profilePicUrlHD) {
                        let profile_url = await InstagramServices.save_instagram_avatar(instagram_data.profilePicUrlHD);
                        if (profile_url) {
                            get_user.image = profile_url;
                            update_payload.image = profile_url;
                        }
                    }
                }
            }

            if (!get_user.image && get_user.tiktok_username) {
                let get_tiktok_data = await ApifyServices.get_tiktok_profile(get_user.tiktok_username);
                console.log(get_tiktok_data, '============get_tiktok_data');
                if (get_tiktok_data && get_tiktok_data.length > 0) {
                    let tiktok_data = get_tiktok_data[0];
                    if (tiktok_data.authorMeta && tiktok_data.authorMeta.avatar) {
                        let profile_url = await InstagramServices.save_instagram_avatar(tiktok_data.authorMeta.avatar);
                        if (profile_url) {
                            get_user.image = profile_url;
                            update_payload.image = profile_url;
                        }
                    }
                }
            }

            if (Object.keys(update_payload).length > 0) {
                let update_user = await Users.updateOne({ id: get_user.id }, update_payload)
            }

        }
    } catch (error) {
        console.log(error, '=============error from updating ISMD')
    }
}