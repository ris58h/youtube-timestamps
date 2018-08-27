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

        stamp.addEventListener('mouseenter', function() {
            showPreview(tc.authorAvatar, tc.authorName, tc.text)
        })
        stamp.addEventListener('mouseleave', function () {
            hidePreview()
        })
    }
    container.appendChild(bar)
}

function showPreview(avatar, name, text) {
    const parent = document.querySelector('.ytp-tooltip.ytp-preview')
    if (!parent) {
        return
    }
    let preview = parent.querySelector('.__youtube-timestamps__preview')
    if (!preview) {
        preview = document.createElement('div')
        preview.classList.add('__youtube-timestamps__preview')
        parent.insertAdjacentElement('afterbegin', preview)

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
    preview.querySelector('.__youtube-timestamps__preview__avatar').src = avatar
    preview.querySelector('.__youtube-timestamps__preview__name').textContent = name
    preview.querySelector('.__youtube-timestamps__preview__text').textContent = text
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

function extractTime(text) {
    const ts = text.match(/(^|\s)(((\d?\d):)?((\d\d))|\d):(\d\d)/)
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
