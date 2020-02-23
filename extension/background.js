const INVALID_TIMES = []

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    //TODO If an extension's background page simply fetches and relays any URL of a content script's choice (effectively acting as an open proxy), then similar security problems occur.  That is, a compromised renderer process can hijack the content script and ask the background page to fetch and relay sensitive URLs of the attacker's choosing.  Instead, background pages should only fetch data from URLs the extension author intends, which is ideally a small set of URLs which does not put the user's sensitive data at risk.
    if (request.type == 'fetchData') {
        fetchData(request.url).then(function (data) {
            sendResponse(data)
        })
        return true
    }
})

function fetchData(url) {
    const apiKeyIndex = validApiKeyIndex()
    if (apiKeyIndex < 0) {
        return Promise.reject()
    }
    const apiKey = API_KEYS[apiKeyIndex]
    return new Promise(function(resolve, reject) {
        fetch(url + `&key=${apiKey}`)
            .then(function (response) {
                return response.json().then(function (data) {
                    if (data.error && data.error.code === 403) {
                        invalidateAipKey(apiKeyIndex)
                        //TODO retry with another key if possible
                        reject()
                    } else {
                        resolve(data)
                    }
                })
            })
    })
}

function validApiKeyIndex() {
    let indeces = []
    for (let i = 0; i < API_KEYS.length; i++) {
        indeces[i] = i
    }
    let counter = indeces.length
    while (counter > 0) {
        let index = Math.floor(Math.random() * counter)
        const apiKeyIndex = indeces[index]
        if (isValidApiKey(apiKeyIndex)) {
            return apiKeyIndex
        }
        counter--
        let temp = indeces[counter]
        indeces[counter] = indeces[index]
        indeces[index] = temp
    }
}

function isValidApiKey(index) {
    // Daily quotas reset at midnight Pacific Time (PT). 
    //TODO check that current day is different from invalidation time in Pacific Time.
    return !INVALID_TIMES[index]
}

function invalidateAipKey(index) {
    INVALID_TIMES[index] = new Date()
}
