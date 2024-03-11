const credentials = require('../../config/local');
const { ApifyClient } = require('apify-client');
const axios = require('axios');
const { google } = require('googleapis');

// Initialize the ApifyClient with API token
const client = new ApifyClient({
    token: credentials.APIFY_KEY//'apify_api_fSbMJLfSW8wWq0WktPyazO5QCzOxcj0780oH',
});

exports.get_instagram_profile = async (usernames) => {
    const input = {
        "usernames": [usernames]
    };
    const run = await client.actor("apify/instagram-profile-scraper").call(input)
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    // console.log(items, '========items')
    // console.log(JSON.stringify(items), '========items222222')
    return items;
}

exports.get_twitter_profile = async (usernames) => {
    const input = {
        "handle": [
            "ankul_abhishek"
        ],
        "mode": "replies",
        "tweetsDesired": 100,
        "repliesDepth": 1,
        "searchMode": "live",
        "profilesDesired": 10,
        "relativeToDate": "",
        "relativeFromDate": "",
        "proxyConfig": {
            "useApifyProxy": true
        },
        "customData": {},
        "handlePageTimeoutSecs": 500,
        "maxRequestRetries": 6,
        "maxIdleTimeoutSecs": 60
    };

    const run = await client.actor("quacker/twitter-scraper").call(input)
    const items = await client.dataset(run.defaultDatasetId).listItems();

    console.log(items, '========items')
    console.log(JSON.stringify(items), '========items222222')

}


exports.get_youtube_profile = async (options) => {
    console.log('======ented =====');
    // let { data } = await axios.get(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet%2CcontentDetails%2Cstatistics&id=UC_x5XG1OV2P6uZZ5FSM9Ttw&key=AIzaSyAa8yy0GdcGPHdtD083HiGGx_S0vMPScDM`,
    // { headers: { Authorization: `Bearer ya29.a0AWY7CklW2s1PoVyYL7peJacHBUs6fn6URxsJEZlaL6OLFP7zLr6Pnam-J6VXKvBcfaIxPdL8ViGCo53Jl0W8gcdqfNE7N6fkh2orMnolDM-1M2QeU78H1wX3pEW30b1qF_k9DnUmPVyXwEiPK0qU9uYTnPmHqnS4FwaCgYKAR4SARMSFQG1tDrpXME4g70IzF0NWbZTMI-ypw0169` } }
    // );

    // console.log(data, '========data')
    // console.log(JSON.stringify(data), '========data222222')
    // return data;

    const youtube = google.youtube({
        version: 'v3',
        auth: "AIzaSyB6ru0tzRIQyyW7H2rdTwowRdNu2McaqBs"
    });

    const { data } = await youtube.channels.list({
        part: 'snippet,contentDetails,statistics',
        id: "UCq-Fj5jknLsUf-MWSy4_brA"
    });
    console.log(data);
    console.log(data.items[0].statistics);

    //   const channel = response.data.items[0];
    //   console.log('Channel Title:', channel.snippet.title);
    //   console.log('Subscriber Count:', channel.statistics.subscriberCount);
    //   console.log('View Count:', channel.statistics.viewCount);

}

exports.get_snapchat_profile = async (usernames) => {
    const input = {
        "username": [
            "sheetal_rag2112"
        ]
    };

    const run = await client.actor("argusapi/snapchat-profile-scraper").call(input)
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(items, '========items')
    console.log(JSON.stringify(items), '========items222222')

}

exports.get_pinterest_profile = async (usernames) => {
    const input = {
        "startUrls": [
            "https://in.pinterest.com/rajni27498/"
        ],
        "maxItems": 20,
        "endPage": 1,
        "extendOutputFunction": ($) => { return {} },
        "customMapFunction": (object) => { return { ...object } },
        "proxy": {
            "useApifyProxy": true
        }
    };
    const run = await client.actor("epctex/pinterest-scraper").call(input)
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(items, '========items')
    console.log(JSON.stringify(items), '========items222222')

}


exports.get_tiktok_profile = async (usernames) => {
    // console.log('========items')

    const input = {
        "profiles": [
            usernames
        ],
        resultsPerPage: 1,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
    };
    const run = await client.actor("clockworks/tiktok-profile-scraper").call(input)
    const items = await client.dataset(run.defaultDatasetId).listItems();

    // console.log(items[0], '========items')
    // console.log(JSON.stringify(items), '========items222222')

}

// not working
exports.get_facebook_profile = async (usernames) => {
    console.log('========items')

    const input = {
        "fbUrls": [
            {
                "url": "https://www.facebook.com/people/Ankul-Abhishek/pfbid02PRjymM4q3otS5be7f7XNxB2RAUeujrQaSKy42bXZadbB33pjGGJWRQZPc3Fic3n1l/"
            }
        ],
        "proxy": {
            "useApifyProxy": true,
            "apifyProxyGroups": [
                "RESIDENTIAL"
            ]
        }
    };
    const run = await client.actor("apify/facebook-url-to-id").call(input)
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(items, '========items')
    console.log(JSON.stringify(items), '========items222222')

}

// working
exports.get_youtube_profile2 = async (usernames) => {
    console.log('========items')

    const input = {
        "downloadSubtitles": false,
        "preferAutoGeneratedSubtitles": false,
        "proxyConfiguration": {
            "useApifyProxy": true
        },
        "saveSubsToKVS": false,
        "simplifiedInformation": false,
        "startUrls": [
            {
                "url": "https://www.youtube.com/@timelofiandchill"
            }
        ],
        "verboseLog": false,
        maxResults: 1
    }

    const run = await client.actor("bernardo/youtube-scraper").call(input)
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    console.log(items, '========items')
    console.log(JSON.stringify(items), '========items222222')

}
