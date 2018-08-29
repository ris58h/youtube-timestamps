if (window.location.pathname == '/watch') {
    const videoId = parseParams(window.location.href)['v']
    const commentFields = 'items(snippet(topLevelComment(snippet)))'
    fetch(`https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=snippet&fields=${commentFields}&order=relevance&key=${API_KEY}`)
        .then(function (response) {
            response.json().then(function (data) {
                const timeComments = []
                for (const item of data.items) {
                    const commentSnippet = item.snippet.topLevelComment.snippet
                    const timestamps = extractTimestamps(commentSnippet.textOriginal)
                    for (const ts of timestamps) {
                        const time = parseTimestamp(ts)
                        if (time) {
                            timeComments.push({
                                authorAvatar: commentSnippet.authorProfileImageUrl,
                                authorName: commentSnippet.authorDisplayName,
                                ts,
                                time,
                                text: commentSnippet.textOriginal
                            })
                        }
                    }
                }
                if (timeComments.length > 0) {
                    timeComments.sort((a, b) => a.time - b.time)
                    const videoFields = 'items(contentDetails(duration))'
                    fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&fields=${videoFields}&key=${API_KEY}`)
                        .then(function (response) {
                            response.json().then(function (data) {
                                const videoDuration = parseDuration(data.items[0].contentDetails.duration)
                                showTimeComments(timeComments, videoDuration)
                            })
                        })
                }
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
    textNode.appendChild(highlightTextFragment(timeComment.text, timeComment.ts))
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

function extractTimestamps(text) {
    return (text.match(/(^|\s)((\d?\d:)?\d\d|\d):\d\d/g) || []).map(s => s.trim())
}

function parseTimestamp(ts) {
    const parts = ts.split(':').reverse()
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
