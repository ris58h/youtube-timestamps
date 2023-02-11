const PREVIEW_BORDER_SIZE = 2
const PREVIEW_MARGIN = 8

const PREVIEW_TIME = 4

main()

onLocationHrefChange(() => {
    removeBar()
    main()
})

function main() {
    const videoId = getVideoId()
    if (!videoId) {
        return
    }
    fetchTimeComments(videoId)
        .then(timeComments => {
            if (videoId !== getVideoId()) {
                return
            }
            addTimeComments(timeComments)
        })
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

function getVideo() {
    return document.querySelector('#movie_player video')
}

function fetchTimeComments(videoId) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({type: 'fetchTimeComments', videoId}, resolve)
    })
}

function addTimeComments(timeComments) {
    const video = getVideo()

    const bar = getOrCreateBar()
    if (!bar) {
        return
    }
    const videoDuration = video.duration
    if (!videoDuration) {
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
        stamp.addEventListener('mouseenter', () => {
            showTooltipPreview(tc)
        })
        stamp.addEventListener('mousemove', () => {
            getTooltipPreview().style.left = getTooltip().style.left
        })
        stamp.addEventListener('mouseleave', () => {
            hideTooltipPreview()
        })
        stamp.addEventListener('wheel', withWheelThrottle((deltaY) => {
            const preview = getTooltipPreview()
            if (preview) {
                preview.scrollBy(0, deltaY)
            }
        }))
    }

    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime
        const currentTimeComment = timeComments
            .find(tc => tc.time > currentTime - PREVIEW_TIME/2 && tc.time < currentTime + PREVIEW_TIME/2)
        if (currentTimeComment) {
            showLivePreview(currentTimeComment)
        } else {
            hideLivePreview()
        }
    })
}

function getOrCreateBar() {
    let bar = document.querySelector('.__youtube-timestamps__bar')
    if (!bar) {
        let container = document.querySelector('#movie_player .ytp-timed-markers-container')
        if (!container) {
            container = document.querySelector('#movie_player .ytp-progress-list')
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

function getPlayer() {
    return document.querySelector('#movie_player')
}

function getTooltip() {
    return document.querySelector('#movie_player .ytp-tooltip')
}

function showTooltipPreview(timeComment) {
    let preview = getOrCreateTooltipPreview()
    if (!preview) {
        return
    }
    fillPreview(preview, timeComment)
    adjustTooltipPreviewSizeAndPosition(preview)
    showPreview(preview)
    scrollPreviewToCurrentTimestamp(preview)
}

function adjustTooltipPreviewSizeAndPosition(preview) {
    const tooltip = getTooltip()

    const tooltipBgWidth = tooltip.querySelector('.ytp-tooltip-bg').style.width
    const previewWidth = tooltipBgWidth.endsWith('px') ? parseFloat(tooltipBgWidth) : 160
    preview.style.width = (previewWidth + 2*PREVIEW_BORDER_SIZE) + 'px'

    preview.style.left = tooltip.style.left

    const textAboveVideoPreview = tooltip.querySelector('.ytp-tooltip-edu')

    const playerHeight = getPlayer().getBoundingClientRect().height
    let bottomGap = 10
    if (bottomGap) {
        bottomGap += textAboveVideoPreview.clientHeight
    }
    preview.style.bottom = `calc(${playerHeight}px - ${tooltip.style.top} + ${bottomGap}px)`

    let previewMaxHeight = parseFloat(tooltip.style.top) - 2*PREVIEW_MARGIN
    if (textAboveVideoPreview) {
        previewMaxHeight -= textAboveVideoPreview.clientHeight
    }
    preview.style.maxHeight = previewMaxHeight + 'px'
}

function getTooltipPreview() {
    return document.querySelector('#__youtube-timestamps__tooltip-preview')
}

function getOrCreateTooltipPreview() {
    let preview = getTooltipPreview()
    if (!preview) {
        preview = createPreview('__youtube-timestamps__tooltip-preview')
        getPlayer().appendChild(preview)
    }
    return preview
}

function hideTooltipPreview() {
    let preview = getTooltipPreview()
    if (preview) {
        hidePreview(preview)
    }
}

function showLivePreview(timeComment) {
    let preview = getOrCreateLivePreview()
    if (!preview) {
        return
    }
    fillPreview(preview, timeComment)
    //TODO adjust preview size and position
    showPreview(preview)
    scrollPreviewToCurrentTimestamp(preview)
}

function getLivePreview() {
    return document.querySelector('#__youtube-timestamps__live-preview')
}

function getOrCreateLivePreview() {
    let preview = getLivePreview()
    if (!preview) {
        preview = createPreview('__youtube-timestamps__live-preview')
        getPlayer().appendChild(preview)
    }
    return preview
}

function hideLivePreview() {
    let preview = document.querySelector('#__youtube-timestamps__live-preview')
    if (preview) {
        hidePreview(preview)
    }
}

function createPreview(id) {
    const preview = document.createElement('div')
    preview.id = id
    preview.classList.add('__youtube-timestamps__preview')

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

    return preview
}

function fillPreview(preview, timeComment) {
    preview.querySelector('.__youtube-timestamps__preview__avatar').src = timeComment.authorAvatar
    preview.querySelector('.__youtube-timestamps__preview__name').textContent = timeComment.authorName
    const textNode = preview.querySelector('.__youtube-timestamps__preview__text')
    textNode.innerHTML = ''
    textNode.appendChild(highlightTextFragment(timeComment.text, timeComment.timestamp))
}

function showPreview(preview) {
    preview.style.display = ''
}

function hidePreview(preview) {
    preview.style.display = 'none'
}

function scrollPreviewToCurrentTimestamp(preview) {
    const highlightedTextFragment = preview.querySelector('.__youtube-timestamps__preview__text-stamp')
    highlightedTextFragment.scrollIntoView({block: 'nearest'})
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

function withWheelThrottle(callback) {
    let deltaYAcc = 0
    let afRequested = false
    return (e) => {
        e.preventDefault()

        deltaYAcc += e.deltaY

        if (afRequested) {
            return
        }
        afRequested = true

        window.requestAnimationFrame(() => {
            callback(deltaYAcc)

            deltaYAcc = 0
            afRequested = false
        })
    }
}

function onLocationHrefChange(callback) {
    let currentHref = document.location.href
    const observer = new MutationObserver(() => {
        if (currentHref != document.location.href) {
            currentHref = document.location.href
            callback()
        }
    })
    observer.observe(document.querySelector("body"), {childList: true, subtree: true})
}
