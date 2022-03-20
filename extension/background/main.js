import * as youtubei from './youtubei.js'
import * as googleapis from './googleapis.js'
import { findTimestamps, parseTimestamp } from './timestamp.js'

const YOUTUBEI_MAX_COMMENT_PAGES = 5
const YOUTUBEI_MAX_COMMENTS = 100

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

async function fetchTimeComments(videoId) {
    const comments = await fetchComments(videoId)
    const timeComments = []
    for (const comment of comments) {
        for (const tsContext of getTimestampContexts(comment.text)) {
            timeComments.push(newTimeComment(comment.authorAvatar, comment.authorName, tsContext))
        }
    }
    return timeComments
}

async function fetchComments(videoId) {
    try {
        return await fetchCommentsYoutubei(videoId)
    } catch (e) {
        console.error(e)
        return await fetchCommentsGoogleapis(videoId)
    }
}

async function fetchCommentsYoutubei(videoId) {
    const videoResponse = await youtubei.fetchVideo(videoId)
    let token = commentsContinuationToken(videoResponse)
    if (!token) {
        return []
    }
    const comments = []
    let prevToken
    let pageCount = 0
    while (prevToken !== token && pageCount < YOUTUBEI_MAX_COMMENT_PAGES && comments.length < YOUTUBEI_MAX_COMMENTS) {
        const commentsResponse = await youtubei.fetchNext(token)
        prevToken = token
        const items = pageCount === 0
            ? commentsResponse.onResponseReceivedEndpoints[1].reloadContinuationItemsCommand.continuationItems
            : commentsResponse.onResponseReceivedEndpoints[0].appendContinuationItemsAction.continuationItems
        if (!items) {
            break
        }
        for (const item of items) {
            if (item.commentThreadRenderer) {
                const cr = item.commentThreadRenderer.comment.commentRenderer
                const authorName = cr.authorText.simpleText
                const authorAvatar = cr.authorThumbnail.thumbnails[0].url
                const text = cr.contentText.runs
                    .map(run => run.text)
                    .join("")
                comments.push(newComment(authorName, authorAvatar, text))
            } else if (item.continuationItemRenderer) {
                token = item.continuationItemRenderer.continuationEndpoint.continuationCommand.token
            }
        }
        pageCount++
    }
    return comments
}

function commentsContinuationToken(videoResponse) {
    return videoResponse.find(e => e.response).response
        .contents.twoColumnWatchNextResults.results.results
        .contents.find(e => e.itemSectionRenderer && e.itemSectionRenderer.sectionIdentifier == 'comment-item-section').itemSectionRenderer
        .contents[0].continuationItemRenderer// When comments are disabled there is messageRenderer instead.
        ?.continuationEndpoint.continuationCommand.token
}

async function fetchCommentsGoogleapis(videoId) {
    const commentItems = await googleapis.fetchComments(videoId)
    const comments = []
    for (const item of commentItems) {
        const cs = item.snippet.topLevelComment.snippet
        comments.push(newComment(cs.authorDisplayName, cs.authorProfileImageUrl, cs.textOriginal))
    }
    return comments
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
    const positions = findTimestamps(text)
    for (const position of positions) {
        const timestamp = text.substring(position.from, position.to)
        const time = parseTimestamp(timestamp)
        if (time === null) {
            continue
        }
        result.push({
            text,
            time,
            timestamp
        })
    }
    return result
}
