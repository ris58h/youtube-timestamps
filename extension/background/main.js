import * as youtubei from './youtubei.js'
import * as googleapis from './googleapis.js'
import { findTimestamps, parseTimestamp } from './timestamp.js'

const MAX_TEXT_LENGTH = 128

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type == 'fetchTimeComments') {
        fetchTimeComments(request.videoId)
            .then(sendResponse)
            .catch(e => {
                console.error(e)
            })
        return true
    }
})

function fetchTimeComments(videoId) {
    return fetchComments(videoId)
        .then(comments => {
            const timeComments = []
            for (const comment of comments) {
                for (const tsContext of getTimestampContexts(comment.text)) {
                    timeComments.push(newTimeComment(comment.authorAvatar, comment.authorName, tsContext))
                }
            }
            return timeComments
        })
}

function fetchComments(videoId) {
    return fetchCommentsYoutubei(videoId)
        .catch(e => {
            console.error(e)
            return fetchCommentsGoogleapis(videoId)
        })
}

function fetchCommentsYoutubei(videoId) {
    return youtubei.fetchVideo(videoId)
        .then(videoResponse => {
            const commentsContinuation = videoResponse[3].response.contents.twoColumnWatchNextResults.results.results
                .contents[2].itemSectionRenderer
                .contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token
            //TODO: fetch 100 comments (we need to fetch multiple pages).
            return youtubei.fetchNext(commentsContinuation).then(commentsResponse => {
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
                return comments
            })
        })
}

function fetchCommentsGoogleapis(videoId) {
    return googleapis.fetchComments(videoId)
        .then(commentItems => {
            const comments = []
            for (const item of commentItems) {
                const cs = item.snippet.topLevelComment.snippet
                comments.push(newComment(cs.authorDisplayName, cs.authorProfileImageUrl, cs.textOriginal))
            }
            return comments
        })
}

function newComment(authorName, authorAvatar, text) {
    return {
        authorName,
        authorAvatar,
        text
    }
}

function newTimeComment(authorAvatar, authorName, tsContext) {
    return {
        authorAvatar,
        authorName,
        timestamp: tsContext.timestamp,
        time: tsContext.time,
        text: tsContext.text
    }
}

function getTimestampContexts(text) {
    const result = []
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line) {
            const positions = findTimestamps(line)
            for (const position of positions) {
                const timestamp = line.substring(position.from, position.to)
                const time = parseTimestamp(timestamp)
                if (time === null) {
                    continue
                }
                let contextText
                if (text.length > MAX_TEXT_LENGTH) {
                    if (timestamp === line && i + 1 < lines.length && lines[i + 1]) {
                        contextText = line + '\n' + lines[i + 1]
                    } else {
                        contextText = line
                    }
                } else {
                    contextText = text
                }
                result.push({
                    text: contextText,
                    time,
                    timestamp
                })
            }
        }
    }
    return result
}
