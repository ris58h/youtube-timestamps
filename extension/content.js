const YOUTUBE_TIMESTAMP_REGEX = /(^|\s)(((\d?\d):)?((\d\d))|\d):(\d\d)/

if (window.location.pathname == '/watch') {
    const videoId = parseParams(window.location.href)['v']
    const fields = 'items(snippet(topLevelComment(snippet)))'
    fetch(`https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=snippet&fields=${fields}&order=relevance&key=${API_KEY}`)
        .then(function (response) {
            response.json().then(function(data) {
                const timeComments = []
                for (const item of data.items) {
                    const commentSnippet = item.snippet.topLevelComment.snippet
                    const time = extractTime(commentSnippet.textOriginal)
                    if (time) {
                        timeComments.push({
                            authorAvatar: commentSnippet.authorProfileImageUrl,
                            authorName: commentSnippet.authorDisplayName,
                            time: time,
                            text: commentSnippet.textOriginal
                        })
                    }
                }
                processTimeComments(timeComments)
            })
        })
}

function processTimeComments(timeComments) {
    const video = document.querySelector("video")
    const container = document.querySelector('.ytp-progress-list')
    const bar = document.createElement('div')
    bar.classList.add('__youtube-timestamps__bar')
    for (const tc of timeComments) {
        if (tc.time > video.duration) {
            continue
        }
        const stamp = document.createElement('div')
        stamp.classList.add('__youtube-timestamps__stamp')
        stamp.style.left = (tc.time / video.duration * 100) + "%"
        bar.appendChild(stamp)
    }
    container.appendChild(bar)
}

function parseParams(href) {
    const noHash = href.split('#')[0]
    const paramString = noHash.split('?')[1]
    const params = {}
    if (paramString) {
        const paramsArray = paramString.split('&')
        for (const kv of paramsArray) {
            const tmparr = kv.split('=')
            params[tmparr[0]] = tmparr[1]
        }
    }
    return params
}

function extractTime(text) {
    const ts = text.match(YOUTUBE_TIMESTAMP_REGEX)
    if (!ts || !ts[0]) {
        return null
    }
    const parts = ts[0].split(':').reverse()
    const secs = parseInt(parts[0])
    if (secs > 59) {
        return null
    }
    const mins = parseInt(parts[1])
    if (mins > 59) {
        return null
    }
    const hours = parseInt(parts[2]) || 0
    return secs + (60 * mins) + (60 * 60 * hours)
}
