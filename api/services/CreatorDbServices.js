const credentials = require('../../config/local');
const axios = require('axios');

const config = {
    headers: {
        apiId: credentials.CREATOR_DB_API_KEY,
    }
};

exports.get_instagram_data = async (instagramId) => {
    try {
        // instagramId = "virat.kohli";
        const url = `https://dev.creatordb.app/v2/instagramHistory?instagramId=${instagramId}`;
        let { data } = await axios.get(url, config);
        if (data && data.data) {
            if (data.data.basicInstagram) {
                let basicInstagram = data.data.basicInstagram;
                delete basicInstagram.relatedUsers;
                // return this.users.sort(this.triDec).slice(0, 3);
                basicInstagram.recentPosts = basicInstagram.recentPosts.slice(0, 2)             // showing only top 5 posts
                basicInstagram.recentReels = basicInstagram.recentReels.slice(0, 2)             // showing only top 5 reals
                return basicInstagram;
            }
            return false
        }

        return false;
    } catch (error) {
        return false;
    }
}


exports.get_tiktok_data = async (tiktokId) => {
    try {
        // tiktokId = "lorengray";
        const url = `
        https://dev.creatordb.app/v2/tiktokHistory?tiktokId=${tiktokId}`;

        let { data } = await axios.get(url, config);
        if (data && data.data) {
            if (data.data.basicTikTok) {
                let basicTikTok = data.data.basicTikTok;
                delete basicTikTok.relatedUsers;
                // return this.users.sort(this.triDec).slice(0, 3);
                basicTikTok.recentVideos = basicTikTok.recentVideos.slice(0, 2)             // showing only top 5 posts          // showing only top 5 reals
                return basicTikTok;
            }
            return false
        }

        return false;

    } catch (error) {
        return false;
    }
}


exports.get_youtube_data = async (youtubeId) => {
    try {
        // youtubeId = "lorengray";
        const url = `https://dev.creatordb.app/v2/youtubeDetail?youtubeId=${youtubeId}`;

        let { data } = await axios.get(url, config);
        if (data && data.data) {
            if (data.data.basicYoutube) {
                let basicYoutube = data.data.basicYoutube;
                delete basicYoutube.relatedUsers;
                basicYoutube.recentVideos = basicYoutube.recentVideos.slice(0, 2)             // showing only top 5 posts          // showing only top 5 reals
                basicYoutube.detailYoutube = data.data.detailYoutube;
                return basicYoutube;
            }
            return false
        }

        return false;
    } catch (error) {
        return false;
    }
}