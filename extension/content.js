const navListener = function () {
    removeTimeComments()
    main()
}
window.addEventListener('popstate', navListener)
window.addEventListener('yt-navigate-start', navListener)
// old design
//TODO 'spfdone' fires with 'popstate' (double navListener call on history back)
window.addEventListener('spfdone', navListener)

main()

const MAX_TEXT_LENGTH = 128

function main() {
    const videoId = getVideoId()
    if (videoId) {
        fetchComments(videoId, items => {
            const commentSnippets = items.map(item => item.snippet.topLevelComment.snippet)
            const timeComments = getTimeComments(commentSnippets)
            if (timeComments.length > 0) {
                timeComments.sort((a, b) => a.time - b.time)
                fetchVideo(videoId, video => {
                    const videoDuration = parseDuration(video.contentDetails.duration)
                    const videoIdAfterRequest = getVideoId()
                    if (videoId === videoIdAfterRequest) {
                        showTimeComments(timeComments, videoDuration)
                    }
                })
            }
        })
    }
}

function getTimeComments(commentSnippets) {
    const timeComments = []
    for (const commentSnippet of commentSnippets) {
        const timestamps = getTimestampContexts(commentSnippet.textOriginal)
        for (const ts of timestamps) {
            timeComments.push({
                authorAvatar: commentSnippet.authorProfileImageUrl,
                authorName: commentSnippet.authorDisplayName,
                timestamp: ts.timestamp,
                time: ts.time,
                text: commentSnippet.textOriginal.length > MAX_TEXT_LENGTH ? ts.line : commentSnippet.textOriginal
            })
        }
    }
    return timeComments
}

function getTimestampContexts(text) {
    const result = []
    const lines = text.split('\n')
    for (const line of lines) {
        const positions = findTimestamps(line)
        for (const position of positions) {
            const timestamp = line.substring(position.from, position.to)
            const time = parseTimestamp(timestamp)
            if (!time) {
                continue
            }
            result.push({
                line,
                time,
                timestamp
            })
        }
    }
    return result
}

function getVideoId() {
    if (window.location.pathname == '/watch') {
        return parseParams(window.location.href)['v']
    } else if (window.location.pathname.startsWith('/embed/')) {
        return window.location.pathname.substring('/embed/'.length)
    } else {
        return null
    }
}

function fetchComments(videoId, callback) {
    const commentFields = 'items(snippet(topLevelComment(snippet)))'
    fetch(`https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=snippet&fields=${commentFields}&order=relevance&key=${API_KEY}`)
        .then(function (response) {
            response.json().then(function (data) {
                callback(data.items)
            })
        })
}

function fetchVideo(videoId, callback) {
    const videoFields = 'items(contentDetails(duration))'
    fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&fields=${videoFields}&key=${API_KEY}`)
        .then(function (response) {
            response.json().then(function (data) {
                callback(data.items[0])
            })
        })
}

function showTimeComments(timeComments, videoDuration) {
    const container = document.querySelector('.ytp-progress-list')
    const bar = document.createElement('div')
    bar.classList.add('__youtube-timestamps__bar')
    for (const tc of timeComments) {
        if (tc.time > videoDuration) {
            continue
        }
        const stamp = document.createElement('div')
        stamp.classList.add('__youtube-timestamps__stamp')
        const offset = tc.time / videoDuration * 100
        stamp.style.left = `calc(${offset}% - 2px)`
        bar.appendChild(stamp)

        stamp.addEventListener('mouseenter', function () {
            showPreview(tc)
        })
        stamp.addEventListener('mouseleave', function () {
            hidePreview()
        })
    }
    container.appendChild(bar)
}

function removeTimeComments() {
    const bar = document.querySelector('.__youtube-timestamps__bar')
    if (bar) {
        bar.remove()
    }
}

function showPreview(timeComment) {
    const parent = document.querySelector('.ytp-tooltip')
    if (!parent) {
        return
    }
    let preview = parent.querySelector('.__youtube-timestamps__preview')
    if (!preview) {
        preview = document.createElement('div')
        preview.classList.add('__youtube-timestamps__preview')
        const previewWrapper = document.createElement('div')
        previewWrapper.classList.add('__youtube-timestamps__preview-wrapper')
        previewWrapper.appendChild(preview)
        parent.insertAdjacentElement('afterbegin', previewWrapper)

        const authorElement = document.createElement('div')
        authorElement.classList.add('__youtube-timestamps__preview__author')
        preview.appendChild(authorElement)

        const avatarElement = document.createElement('img')
        avatarElement.classList.add('__youtube-timestamps__preview__avatar')
        authorElement.appendChild(avatarElement)

        const nameElement = document.createElement('span')
        nameElement.classList.add('__youtube-timestamps__preview__name')
        authorElement.appendChild(nameElement)

        const textElement = document.createElement('div')
        textElement.classList.add('__youtube-timestamps__preview__text')
        preview.appendChild(textElement)
    }
    preview.style.display = ''
    preview.style.width = parent.querySelector('.ytp-tooltip-bg').style.width
    preview.querySelector('.__youtube-timestamps__preview__avatar').src = timeComment.authorAvatar
    preview.querySelector('.__youtube-timestamps__preview__name').textContent = timeComment.authorName
    const textNode = preview.querySelector('.__youtube-timestamps__preview__text')
    textNode.innerHTML = ''
    textNode.appendChild(highlightTextFragment(timeComment.text, timeComment.timestamp))
}

function highlightTextFragment(text, fragment) {
    var result = document.createDocumentFragment();
    const parts = text.split(fragment)
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        if (part) {
            result.appendChild(document.createTextNode(part))
        }
        if (i < parts.length - 1) {
            const fragmentNode = document.createElement('span')
            fragmentNode.classList.add('__youtube-timestamps__preview__text-stamp')
            fragmentNode.textContent = fragment
            result.appendChild(fragmentNode)
        }
    }
    return result
}

function hidePreview() {
    let preview = document.querySelector('.__youtube-timestamps__preview')
    if (preview) {
        preview.style.display = 'none'
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

function parseDuration(duration) {
    const matches = duration.match(/[0-9]+[HMS]/g);
    let seconds = 0;
    matches.forEach(function (part) {
        const unit = part.charAt(part.length - 1);
        const amount = parseInt(part.slice(0, -1));
        switch (unit) {
            case 'H':
                seconds += amount * 60 * 60;
                break;
            case 'M':
                seconds += amount * 60;
                break;
            case 'S':
                seconds += amount;
                break;
            default:
            // noop
        }
    });
    return seconds;
}
