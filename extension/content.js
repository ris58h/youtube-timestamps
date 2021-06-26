const MAX_TEXT_LENGTH = 128
const PREVIEW_BORDER_SIZE = 2

const navListener = function () {
    removeBar()
    main()
}
window.addEventListener('popstate', navListener)
window.addEventListener('yt-navigate-start', navListener)
// old design
//TODO 'spfdone' fires with 'popstate' (double navListener call on history back)
window.addEventListener('spfdone', navListener)

main()

function main() {
    const videoId = getVideoId()
    if (!videoId) {
        return
    }
    Promise.all([fetchComments(videoId), fetchVideo(videoId)]).then(results => {
        if (videoId !== getVideoId()) {
            return
        }

        const commentItems = results[0]
        const videoItem = results[1]
        const videoDuration = parseDuration(videoItem.contentDetails.duration)

        const commentsTcs = []
        for (const item of commentItems) {
            const cs = item.snippet.topLevelComment.snippet
            for (const tsContext of getTimestampContexts(cs.textOriginal)) {
                commentsTcs.push(newTimeComment(cs.authorProfileImageUrl, cs.authorDisplayName, tsContext))
            }
        }
        showTimeComments(commentsTcs, videoDuration)
    })
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

function getVideoId() {
    if (window.location.pathname == '/watch') {
        return parseParams(window.location.href)['v']
    } else if (window.location.pathname.startsWith('/embed/')) {
        return window.location.pathname.substring('/embed/'.length)
    } else {
        return null
    }
}

function fetchComments(videoId) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: 'fetchComments', videoId}, resolve)
    })
}

function fetchVideo(videoId) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: 'fetchVideo', videoId}, resolve)
    })
}

function showTimeComments(timeComments, videoDuration) {
    const bar = getOrCreateBar()
    if (!bar) {
        return
    }
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
}

function getOrCreateBar() {
    let bar = document.querySelector('.__youtube-timestamps__bar')
    if (!bar) {
        let container = document.querySelector('.ytp-timed-markers-container')
        if (!container) {
            container = document.querySelector('.ytp-progress-list')
        }
        if (!container) {
            return null
        }
        bar = document.createElement('div')
        bar.classList.add('__youtube-timestamps__bar')
        container.appendChild(bar)
    }
    return bar
}

function removeBar() {
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
    preview.querySelector('.__youtube-timestamps__preview__avatar').src = timeComment.authorAvatar
    preview.querySelector('.__youtube-timestamps__preview__name').textContent = timeComment.authorName
    const textNode = preview.querySelector('.__youtube-timestamps__preview__text')
    textNode.innerHTML = ''
    textNode.appendChild(highlightTextFragment(timeComment.text, timeComment.timestamp))

    const bgWidth = parent.querySelector('.ytp-tooltip-bg').style.width
    const previewWidth = bgWidth.endsWith('px') ? parseFloat(bgWidth) : 160
    const halfPreviewWidth = previewWidth / 2
    // const playerRect = document.querySelector('.ytp-progress-bar').getBoundingClientRect()
    const playerRect = document.querySelector('.ytp-progress-bar').getBoundingClientRect()
    const pivot = preview.parentElement.getBoundingClientRect().left
    const minPivot = playerRect.left + halfPreviewWidth
    const maxPivot = playerRect.right - halfPreviewWidth
    let previewLeft
    if (pivot < minPivot) {
        previewLeft = playerRect.left - pivot
    } else if (pivot > maxPivot) {
        previewLeft = -previewWidth + (playerRect.right - pivot)
    } else {
        previewLeft = -halfPreviewWidth
    }

    preview.style.width = (previewWidth + 2*PREVIEW_BORDER_SIZE) + 'px'
    preview.style.left = (previewLeft - PREVIEW_BORDER_SIZE) + 'px'
}

function highlightTextFragment(text, fragment) {
    const result = document.createDocumentFragment()
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
