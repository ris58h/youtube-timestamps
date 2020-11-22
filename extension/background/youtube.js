function fetchComments(videoId) {
    const part = 'snippet'
    const fields = 'items(snippet(topLevelComment(snippet)))'
    const order = 'relevance'
    const maxResults = 100
    return fetchData(`https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=${part}&fields=${fields}&order=${order}&maxResults=${maxResults}`)
        .then(data => data.items)

}

function fetchVideo(videoId) {
    const part = 'snippet,contentDetails'
    const fields = 'items(snippet(description,channelId),contentDetails(duration))'
    return fetchData(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=${part}&fields=${fields}`)
        .then(data => data.items[0])
}

function fetchChannel(channelId) {
    const part = 'snippet'
    const fields = 'items(snippet(title,thumbnails(default)))'
    return fetchData(`https://www.googleapis.com/youtube/v3/channels?id=${channelId}&part=${part}&fields=${fields}`)
        .then(data => data.items[0])
}

function fetchData(url) {
    return getApiKey()
        .then(apiKey => fetch(url + `&key=${apiKey}`))
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                if (data.error.code === 403) {
                    invalidateApiKeyIndex(apiKeyIndex)
                    //TODO retry with another key if possible
                }
                return Promise.reject()
            } else {
                return data
            }
        })
}
