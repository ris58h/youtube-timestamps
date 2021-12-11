youtubei = typeof youtubei === 'undefined' ? {} : youtubei;

(function() {
    const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
    const INNERTUBE_CLIENT_NAME = "WEB"
    const INNERTUBE_CLIENT_VERSION = "2.20211129.09.00"

    youtubei.fetchVideo = function(videoId) {
        return fetch(`https://www.youtube.com/watch?v=${videoId}&pbj=1`, {
            credentials: 'omit',
            headers: {
                "X-Youtube-Client-Name": "1",
                "X-Youtube-Client-Version": INNERTUBE_CLIENT_VERSION
            }
        }).then(response => response.json())
    }

    //TODO: It doesn't work! Always returns 403 from background page. Works well from YT page. May be a problem with Cookies?
    youtubei.fetchNext = function(continuation) {
        const body = {
            context: {
                client: {
                    clientName: INNERTUBE_CLIENT_NAME,
                    clientVersion: INNERTUBE_CLIENT_VERSION
                }
            },
            continuation
        }
        return fetch(`https://www.youtube.com/youtubei/v1/next?key=${INNERTUBE_API_KEY}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        })
    }
})()
