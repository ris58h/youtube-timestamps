const PREVIEW_BORDER_SIZE = 2
const PREVIEW_MARGIN = 8

main()

onLocationHrefChange(() => {
    removeBar()
    removeContextMenu()
    main()
})

document.addEventListener('click', e => {
    const stamp = e.target.closest('.__youtube-timestamps__stamp')
    if (stamp) {
        // TODO
    } else {
        hideContextMenu()
    }
}, true)

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
    const bar = getOrCreateBar()
    const videoDuration = getVideo().duration
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
            showPreview(tc)
        })
        stamp.addEventListener('mouseleave', () => {
            hidePreview()
        })
        stamp.addEventListener('wheel', withWheelThrottle((deltaY) => {
            const preview = getOrCreatePreview()
            if (preview) {
                preview.scrollBy(0, deltaY)
            }
        }))
        stamp.addEventListener('contextmenu', e => {
            e.preventDefault()
            e.stopPropagation()
            showContextMenu(tc, e.pageX, e.pageY)
        })
    }
}

function getOrCreateBar() {
    let bar = document.querySelector('.__youtube-timestamps__bar')
    if (!bar) {
        let container = document.querySelector('#movie_player .ytp-timed-markers-container')
        if (!container) {
            container = document.querySelector('#movie_player .ytp-progress-list')
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

function getTooltip() {
    return document.querySelector('#movie_player .ytp-tooltip')
}

function showPreview(timeComment) {
    const tooltip = getTooltip()
    const preview = getOrCreatePreview()
    preview.style.display = ''
    preview.querySelector('.__youtube-timestamps__preview__avatar').src = timeComment.authorAvatar
    preview.querySelector('.__youtube-timestamps__preview__name').textContent = timeComment.authorName
    const textNode = preview.querySelector('.__youtube-timestamps__preview__text')
    textNode.innerHTML = ''
    textNode.appendChild(highlightTextFragment(timeComment.text, timeComment.timestamp))

    const tooltipBgWidth = tooltip.querySelector('.ytp-tooltip-bg').style.width
    const previewWidth = tooltipBgWidth.endsWith('px') ? parseFloat(tooltipBgWidth) : 160
    preview.style.width = (previewWidth + 2*PREVIEW_BORDER_SIZE) + 'px'

    const halfPreviewWidth = previewWidth / 2
    const playerRect = document.querySelector('#movie_player .ytp-progress-bar').getBoundingClientRect()
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
    preview.style.left = (previewLeft - PREVIEW_BORDER_SIZE) + 'px'

    const textAboveVideoPreview = tooltip.querySelector('.ytp-tooltip-edu')
    if (textAboveVideoPreview) {
        preview.style.bottom = (10 + textAboveVideoPreview.clientHeight) + 'px'
    }

    const tooltipTop = tooltip.style.top
    if (tooltipTop.endsWith('px')) {
        let previewHeight = parseFloat(tooltipTop) - 2*PREVIEW_MARGIN
        if (textAboveVideoPreview) {
            previewHeight -= textAboveVideoPreview.clientHeight
        }
        if (previewHeight > 0) {
            preview.style.maxHeight = previewHeight + 'px'
        }
    }

    const highlightedTextFragment = preview.querySelector('.__youtube-timestamps__preview__text-stamp')
    highlightedTextFragment.scrollIntoView({block: 'nearest'})
}

function getOrCreatePreview() {
    const tooltip = getTooltip()
    let preview = tooltip.querySelector('.__youtube-timestamps__preview')
    if (!preview) {
        preview = document.createElement('div')
        preview.classList.add('__youtube-timestamps__preview')
        const previewWrapper = document.createElement('div')
        previewWrapper.classList.add('__youtube-timestamps__preview-wrapper')
        previewWrapper.appendChild(preview)
        tooltip.insertAdjacentElement('afterbegin', previewWrapper)

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
    return preview
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
    const preview = document.querySelector('.__youtube-timestamps__preview')
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

function showContextMenu(timeComment, x, y) {
    const contextMenu = getOrCreateContextMenu()
    contextMenu.style.display = ''
    adjustContextMenuSizeAndPosition(contextMenu, x, y)
}

function adjustContextMenuSizeAndPosition(contextMenu, x, y) {
    const menuHeight = contextMenu.querySelector('.ytp-panel-menu').clientHeight
    contextMenu.style.height = menuHeight + 'px'
    contextMenu.style.top = (y - menuHeight) + 'px'
    contextMenu.style.left = x + 'px'
}

function getOrCreateContextMenu() {
    let contextMenu = document.body.querySelector('#__youtube-timestamps__context-menu')
    if (!contextMenu) {
        contextMenu = document.createElement('div')
        contextMenu.id = '__youtube-timestamps__context-menu'
        contextMenu.classList.add('ytp-popup')
        document.body.appendChild(contextMenu)

        const panelElement = document.createElement('div')
        panelElement.classList.add('ytp-panel')
        contextMenu.appendChild(panelElement)

        const menuElement = document.createElement('div')
        menuElement.classList.add('ytp-panel-menu')
        panelElement.appendChild(menuElement)

        menuElement.appendChild(menuItemElement("Reply"))
        menuElement.appendChild(menuItemElement("Like"))
        menuElement.appendChild(menuItemElement("Dislike"))
        menuElement.appendChild(menuItemElement("Report"))
    }
    return contextMenu
}

function menuItemElement(label) {
    const itemElement = document.createElement('div')
    itemElement.classList.add('ytp-menuitem')
    itemElement.addEventListener('click', e => {
        alert(label)//TODO
    })

    const iconElement = document.createElement('div')
    iconElement.classList.add('ytp-menuitem-icon')
    itemElement.appendChild(iconElement)

    const labelElement = document.createElement('div')
    labelElement.classList.add('ytp-menuitem-label')
    labelElement.textContent = label
    itemElement.appendChild(labelElement)

    return itemElement
}

function hideContextMenu() {
    const contextMenu = document.querySelector('#__youtube-timestamps__context-menu')
    if (contextMenu) {
        contextMenu.style.display = 'none'
    }
}

function removeContextMenu() {
    const contextMenu = document.querySelector('#__youtube-timestamps__context-menu')
    if (contextMenu) {
        contextMenu.remove()
    }
}
