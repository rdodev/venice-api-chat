class YouTubeURLParser {
    /**
     * Validate if the given URL is a legitimate YouTube URL
     * @param {string} url - The URL to validate
     * @returns {boolean} - Whether the URL is a valid YouTube URL
     */
    static isValidYouTubeURL(url) {
        // Regular expressions to match various YouTube URL formats
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=)([^&\s]+)/,
            /^(https?:\/\/)?(www\.)?(youtube\.com\/embed\/)([^&\s]+)/,
            /^(https?:\/\/)?(www\.)?(youtu\.be\/)([^&\s]+)/
        ];

        return patterns.some(pattern => pattern.test(url));
    }

    /**
     * Extract video ID from a YouTube URL
     * @param {string} url - The YouTube URL
     * @returns {string|null} - Extracted video ID or null if invalid
     */
    static extractVideoId(url) {
        // Trim and remove any whitespace
        url = url.trim();

        // Regex patterns for different YouTube URL formats
        const patterns = [
            // Standard watch URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\s]+)/,
            
            // Shortened URL: https://youtu.be/dQw4w9WgXcQ
            /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\s]+)/,
            
            // Embed URL: https://www.youtube.com/embed/dQw4w9WgXcQ
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\s]+)/,
            
            // Handle potential additional parameters
            /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?.*v=([^&\s]+)/
        ];

        // Try each pattern
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }
}

// Example usage function
async function processYouTubeURL(url) {
    // Validate the URL
    if (!YouTubeURLParser.isValidYouTubeURL(url)) {
        console.error('Invalid YouTube URL');
        return null;
    }

    // Extract video ID
    const videoId = YouTubeURLParser.extractVideoId(url);

    if (!videoId) {
        console.error('Could not extract video ID');
        return null;
    }

    console.log('Extracted Video ID:', videoId);
    return videoId;
}


module.exports = { YouTubeURLParser };