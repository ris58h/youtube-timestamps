chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    createRequest(request)
        .then(sendResponse)
        .catch(e => {
            console.error(e)
        })
    return true
})

function createRequest(request) {
    if (request.type == 'fetchData') {
        return fetchData(request.videoId)
    } else {
        return Promise.reject(new Error("Unknown request type: " + request.type))
    }
}

function fetchData(videoId) {
    return Promise.all([fetchVideo(videoId), fetchComments(videoId)]).then(results => {
        return {
            video: results[0],
            comments: results[1]
        }
    })
}

function fetchVideo(videoId) {
    return youtubei.fetchVideo(videoId)
        .then(data => {
            const videoDurationString = data[2].playerResponse.videoDetails.lengthSeconds
            const videoDuration = parseInt(videoDurationString)
            return newVideo(videoDuration)
        })
        .catch(() => {
            return googleapis.youtube.fetchVideo(videoId).then(videoItem => {
                const videoDuration = parseDuration(videoItem.contentDetails.duration)
                return newVideo(videoDuration)
            })
        })
}

function fetchComments(videoId) {
    return googleapis.youtube.fetchComments(videoId).then(commentItems => {
        const comments = []
        for (const item of commentItems) {
            const cs = item.snippet.topLevelComment.snippet
            comments.push(newComment(cs.authorDisplayName, cs.authorProfileImageUrl, cs.textOriginal))
        }
        return comments
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

function newVideo(duration) {
    return {
        duration
    }
}

function newComment(authorName, authorAvatar, text) {
    return {
        authorName,
        authorAvatar,
        text
    }
}