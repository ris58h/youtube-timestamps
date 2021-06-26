function fetchComments(videoId) {
    const part = 'snippet'
    const fields = 'items(snippet(topLevelComment(snippet)))'
    const order = 'relevance'
    const maxResults = 100
    return fetchData(`https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=${part}&fields=${fields}&order=${order}&maxResults=${maxResults}`)
        .then(data => data.items)

}

function fetchVideo(videoId) {
    const part = 'contentDetails'
    const fields = 'items(contentDetails(duration))'
    return fetchData(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=${part}&fields=${fields}`)
        .then(data => data.items[0])
}

function fetchData(url) {
    return getAuthInfo()
        .then(info => {
            if (info.type == 'key') {
                return fetch(url + `&key=${info.data}`)
            } else if (info.type == 'token') {
                return fetch(url, {
                    headers: {
                        'Authorization': 'Bearer ' + info.data
                    }
                })
            } else {
                throw new Error("Unknown auth type: " + info.type)
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error.message)
            } else {
                return data
            }
        })
}
