googleapis = typeof googleapis === 'undefined' ? {} : googleapis;
googleapis.youtube = {};

(function() {
    googleapis.youtube.fetchComments = function(videoId) {
        const part = 'snippet'
        const fields = 'items(snippet(topLevelComment(snippet)))'
        const order = 'relevance'
        const maxResults = 100
        return fetchData(`https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=${part}&fields=${fields}&order=${order}&maxResults=${maxResults}`)
            .then(data => data.items)
    }
    
    googleapis.youtube.fetchVideo = function(videoId) {
        const part = 'contentDetails'
        const fields = 'items(contentDetails(duration))'
        return fetchData(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=${part}&fields=${fields}`)
            .then(data => data.items[0])
    }

    function getAuthInfo() {
        const apiKeyIndex = Math.floor(Math.random() * API_KEYS.length)
        const apiKey = API_KEYS[apiKeyIndex]
        return Promise.resolve({type: 'key', data: apiKey})
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
})()
