chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    createRequest(request)
        .then(sendResponse)
        .catch(e => console.error(e))
    return true
})

function createRequest(request) {
    if (request.type == 'fetchData') {
        return fetchData(request.videoId)
    } else {
        return Promise.reject(new Error("Unknown request type: " + request.type))
    }
}

/**
 * Fetches the data about video.
 * @param {string} videoId 
 * @returns {Promise} {
        video: {
            duration
        },
        comments: [{
            authorName,
            authorAvatar,
            text
        }]
    }
 */
function fetchData(videoId) {
    return Promise.all([googleapis.youtube.fetchComments(videoId), googleapis.youtube.fetchVideo(videoId)]).then(results => {
        const commentItems = results[0]
        const videoItem = results[1]
        const videoDuration = parseDuration(videoItem.contentDetails.duration)

        const comments = []
        for (const item of commentItems) {
            const cs = item.snippet.topLevelComment.snippet
            comments.push(newComment(cs.authorDisplayName, cs.authorProfileImageUrl, cs.textOriginal))
        }
        return {
            video: {
                duration: videoDuration
            },
            comments
        }
    })
}

function parseDuration(duration) {
    const matches = duration.match(/[0-9]+[HMS]/g)
    let seconds = 0
    matches.forEach(part => {
        const unit = part.charAt(part.length - 1)
        const amount = parseInt(part.slice(0, -1))
        switch (unit) {
            case 'H':
                seconds += amount * 60 * 60
                break
            case 'M':
                seconds += amount * 60
                break
            case 'S':
                seconds += amount
                break
            default:
                // noop
        }
    })
    return seconds
}

function newComment(authorName, authorAvatar, text) {
    return {
        authorName,
        authorAvatar,
        text
    }
}