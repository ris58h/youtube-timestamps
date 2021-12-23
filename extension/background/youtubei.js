// YouTube declines requests with wrong Origin.
// We have to remove the Origin header which is added automatically by the browser.
chrome.webRequest.onBeforeSendHeaders.addListener(
    details => {
        const newRequestHeaders = details.requestHeaders.filter(header => {
            return header.name.toLowerCase() !== "origin"
        })
        return {requestHeaders: newRequestHeaders}
    },
    {urls: ["https://www.youtube.com/*"]},
    ["blocking", "requestHeaders", chrome.webRequest.OnBeforeSendHeadersOptions.EXTRA_HEADERS].filter(Boolean)
)

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
const INNERTUBE_CLIENT_NAME = "WEB"
const INNERTUBE_CLIENT_VERSION = "2.20211129.09.00"

export async function fetchVideo(videoId) {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}&pbj=1`, {
        credentials: "omit",
        headers: {
            "X-Youtube-Client-Name": "1",
            "X-Youtube-Client-Version": INNERTUBE_CLIENT_VERSION
        }
    })
    return await response.json()
}

export async function fetchNext(continuation) {
    const body = {
        context: {
            client: {
                clientName: INNERTUBE_CLIENT_NAME,
                clientVersion: INNERTUBE_CLIENT_VERSION
            }
        },
        continuation
    }
    const response = await fetch(`https://www.youtube.com/youtubei/v1/next?key=${INNERTUBE_API_KEY}`, {
        method: "POST",
        credentials: "omit",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })
    return await response.json()
}
