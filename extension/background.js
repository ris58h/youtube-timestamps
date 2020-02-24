const INVALID_TIMES = []
const NUMBER_OF_PAGES_TO_FETCH = 1
const PAGE_SIZE = 100

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == 'fetchComments') {
        fetchComments(request.videoId).then(sendResponse)
        return true
    }
    if (request.type == 'fetchVideo') {
        fetchVideo(request.videoId).then(sendResponse)
        return true
    }
    if (request.type == 'fetchChannel') {
        fetchChannel(request.channelId).then(sendResponse)
        return true
    }
})

function fetchComments(videoId) {
    return new Promise(async (resolve) => {
        let items = []
        await fetchCommentsIteration(videoId, NUMBER_OF_PAGES_TO_FETCH, items).then(resolve)
    })
}

function fetchCommentsIteration(videoId, numberPageLeftFetching, items, pageToken) {
    return new Promise((resolve) => {
        const part = 'snippet'
        const fields = 'items(snippet(topLevelComment(snippet))),nextPageToken'
        const order = 'relevance'
        const maxResults = PAGE_SIZE
        
        let url = `https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=${part}&fields=${fields}&order=${order}&maxResults=${maxResults}`

        if (pageToken) {
            url = url + `&pageToken=${pageToken}`
        }

        fetchData(url)
            .then(function (data) {
                items.push(...data.items)
                --numberPageLeftFetching
                if (numberPageLeftFetching > 0 && data.nextPageToken) {
                    return resolve(fetchCommentsIteration(videoId, numberPageLeftFetching, items, data.nextPageToken))
                } else {
                    return resolve(items)
                }
            })
    })
}

function fetchVideo(videoId) {
    const part = 'snippet,contentDetails'
    const fields = 'items(snippet(description,channelId),contentDetails(duration))'
    return fetchData(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=${part}&fields=${fields}`)
        .then(function (data) {
            return data.items[0]
        })
}

function fetchChannel(channelId) {
    const part = 'snippet'
    const fields = 'items(snippet(title,thumbnails(default)))'
    return fetchData(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=${part}&fields=${fields}`)
        .then(function (data) {
            return data.items[0]
        })
}

function fetchData(url) {
    const apiKeyIndex = validApiKeyIndex()
    if (apiKeyIndex == null || apiKeyIndex < 0) {
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
    let counter = API_KEYS.length
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
    // So anyway, I started blasting
    //TODO return null and make right API key validation
    return Math.floor(Math.random() * API_KEYS.length)
}

function isValidApiKey(index) {
    // Daily quotas reset at midnight Pacific Time (PT). 
    //TODO check that current day is different from invalidation time in Pacific Time.
    return !INVALID_TIMES[index]
}

function invalidateAipKey(index) {
    INVALID_TIMES[index] = new Date()
}
