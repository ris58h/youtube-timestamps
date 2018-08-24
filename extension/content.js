const YOUTUBE_TIMESTAMP_REGEX = /(^|\s)(((\d?\d):)?((\d\d))|\d):(\d\d)/

if (window.location.pathname == '/watch') {
    // const video = document.querySelector("video")
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
    for (const tc of timeComments) {
        console.log(tc)
    }
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
    const mins = parseInt(parts[1])
    const hours = parseInt(parts[2]) || 0;
    return secs + (60 * mins) + (60 * 24 * hours)
}
