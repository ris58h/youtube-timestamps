import * as youtubei from './youtubei.js'
import * as googleapis from './googleapis.js'
import { findTimestamps, parseTimestamp } from './timestamp.js'

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
        const tsContexts = getTimestampContexts(comment.text)
        if (isChaptersComment(tsContexts)) {
            continue
        }
        for (const tsContext of tsContexts) {
            timeComments.push(newTimeComment(comment.authorAvatar, comment.authorName, tsContext))
        }
    }
    return timeComments
}

function isChaptersComment(tsContexts) {
    if (tsContexts.length < 3) {
        return false
    }
    if (tsContexts[0].time !== 0) {
        return false
    }
    return true
}

async function fetchComments(videoId) {
    try {
        return await youtubei.fetchComments(videoId)
    } catch (e) {
        console.error(e)
        return await googleapis.fetchComments(videoId)
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
