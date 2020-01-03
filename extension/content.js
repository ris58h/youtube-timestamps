const NUMBER_OF_PAGES_TO_FETCH = 1
const PAGE_SIZE = 100
const MAX_TEXT_LENGTH = 128

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
    if (videoId) {
        Promise.all([fetchAllComments(videoId), fetchVideo(videoId)]).then(results => {
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

            const videoDescription = videoItem.snippet.description
            const videoTsContexts = getTimestampContexts(videoDescription)
            if (videoTsContexts.length > 0) {
                fetchChannel(videoItem.snippet.channelId).then(channelItem => {
                    if (videoId !== getVideoId()) {
                        return
                    }

                    const channelAvatar = channelItem.snippet.thumbnails.default.url
                    const channelTitle = channelItem.snippet.title
                    const descriptionTcs = []
                    for (const tsContext of videoTsContexts) {
                        descriptionTcs.push(newTimeComment(channelAvatar, channelTitle, tsContext))
                    }
                    showTimeComments(descriptionTcs, videoDuration)
                })
            }
        })
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

function getVideoId() {
    if (window.location.pathname == '/watch') {
        return parseParams(window.location.href)['v']
    } else if (window.location.pathname.startsWith('/embed/')) {
        return window.location.pathname.substring('/embed/'.length)
    } else {
        return null
    }
}

function fetchAllComments(videoId) {
    return new Promise(async (resolve) => {
        let items = []
        await fetchComments(videoId, NUMBER_OF_PAGES_TO_FETCH, items).then((res) => {
            return resolve(res)
        })
    })
}

function fetchComments(videoId, numberPageLeftFetching, items, pageToken) {
    return new Promise((resolve) => {
        const part = 'snippet'
        const fields = 'items(snippet(topLevelComment(snippet))),nextPageToken'
        const order = 'relevance'
        const maxResults = PAGE_SIZE
        const apiKey = getApiKey()

        let url = `https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=${part}&fields=${fields}&order=${order}&maxResults=${maxResults}&key=${apiKey}`

        if (pageToken) {
            url = url + `&pageToken=${pageToken}`
        }

        fetch(url)
        .then(function (response) {
            response.json().then(async function (data) {
                items.push(...data.items)
                --numberPageLeftFetching
                if (numberPageLeftFetching > 0 && data.nextPageToken) {
                    return resolve(fetchComments(videoId, numberPageLeftFetching, items, data.nextPageToken))
                } else {
                    return resolve(items)
                }
            })
        })
    })
}

function fetchVideo(videoId) {
    const part = 'snippet,contentDetails'
    const fields = 'items(snippet(description,channelId),contentDetails(duration))'
    const apiKey = getApiKey()
    return fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=${part}&fields=${fields}&key=${apiKey}`)
        .then(function (response) {
            return response.json().then(function (data) {
                return data.items[0]
            })
        })
}

function fetchChannel(channelId) {
    const part = 'snippet'
    const fields = 'items(snippet(title,thumbnails(default)))'
    const apiKey = getApiKey()
    return fetch(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=${part}&fields=${fields}&key=${apiKey}`)
        .then(function (response) {
            return response.json().then(function (data) {
                return data.items[0]
            })
        })
}

function showTimeComments(timeComments, videoDuration) {
    const bar = getOrCreateBar()
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
        bar = document.createElement('div')
        bar.classList.add('__youtube-timestamps__bar')
        const container = document.querySelector('.ytp-progress-list')
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
    preview.style.width = previewWidth + 'px'
    preview.style.left = previewLeft + 'px'
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
    matches.forEach(function (part) {
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

function getApiKey() {
    const randomApiKeyIndex = Math.floor(Math.random() * API_KEYS.length)
    return API_KEYS[randomApiKeyIndex]
}
