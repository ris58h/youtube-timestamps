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
    return fetchDataYoutubei(videoId)
        .then(data => {
            if (data.comments) {
                return data
            }
            return fetchCommentsGoogleapis(videoId).then(comments => {
                return {
                    video: data.video,
                    comments
                }
            })
        })
        .catch(e => {
            console.error(e)
            return fetchDataGoogleapis(videoId)
        })
}

function fetchDataYoutubei(videoId) {
    return youtubei.fetchVideo(videoId).then(videoResponse => {
        const videoDurationString = videoResponse[2].playerResponse.videoDetails.lengthSeconds
        const videoDuration = parseInt(videoDurationString)
        const video = newVideo(videoDuration)

        let commentsContinuation
        try {
            commentsContinuation = videoResponse[3].response.contents.twoColumnWatchNextResults.results.results
            .contents[2].itemSectionRenderer
            .contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token
        } catch (e) {
            console.error(e)
            return {
                video
            }
        }

        //TODO: fetch 100 comments (we need to fetch multiple pages).
        return youtubei.fetchNext(commentsContinuation)
            .then(commentsResponse => {
                const items = commentsResponse.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand.continuationItems

                const comments = []
                for (const item of items) {
                    if (item.commentThreadRenderer) {
                        const cr = item.commentThreadRenderer.comment.commentRenderer
                        const authorName = cr.authorText.simpleText
                        const authorAvatar = cr.authorThumbnail.thumbnails[0].url
                        const text = cr.contentText.runs
                            .map(run => run.text)
                            .join("")
                        comments.push(newComment(authorName, authorAvatar, text))
                    }
                }

                return {
                    video,
                    comments
                }
            })
            .catch(e => {
                console.error(e)
                return {
                    video
                }
            })
    })
}

function fetchDataGoogleapis(videoId) {
    return Promise.all([fetchVideoGoogleapis(videoId), fetchCommentsGoogleapis(videoId)]).then(results => {
        return {
            video: results[0],
            comments: results[1]
        }
    })
}

function fetchVideoGoogleapis(videoId) {
    return googleapis.youtube.fetchVideo(videoId).then(videoItem => {
        const videoDuration = parseDuration(videoItem.contentDetails.duration)
        return newVideo(videoDuration)
    })
}

function fetchCommentsGoogleapis(videoId) {
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
