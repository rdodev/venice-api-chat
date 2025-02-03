const axios = require('axios');
const API_KEY = process.env.APIFY_KEY;

class YouTubeAPIClient {
    constructor() {
        this.apiBaseUrl = 'https://api.apify.com/v2/acts/invideoiq~video-transcript-scraper/run-sync-get-dataset-items?token=' + API_KEY;
    }

    /**
     * Get full transcript of video
     * @param {string} videoUrl - YouTube video URL
     */
    async getFullTranscript(vid) {
        try {
            const response = await axios.post(`${this.apiBaseUrl}`, {
                video_url: `https://www.youtube.com/watch?v=${vid}`,
                language: "en"
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get transcript: ${error.response?.data?.error || error.message}`);
        }
    }
}

module.exports = { YouTubeAPIClient };
