import { API_KEYS } from "./googleapis-keys.js"

export async function fetchComments(videoId) {
    const part = 'snippet'
    const fields = 'items(snippet(topLevelComment(snippet)))'
    const order = 'relevance'
    const maxResults = 100
    const data = await fetchData(`https://www.googleapis.com/youtube/v3/commentThreads?videoId=${videoId}&part=${part}&fields=${fields}&order=${order}&maxResults=${maxResults}`)

    return data.items.map(item => {
        const cs = item.snippet.topLevelComment.snippet
        return {
            authorName: cs.authorDisplayName,
            authorAvatar: cs.authorProfileImageUrl,
            text: cs.textOriginal
        }
    })
}

function apiKey() {
    const apiKeyIndex = Math.floor(Math.random() * API_KEYS.length)
    return API_KEYS[apiKeyIndex]
}

async function fetchData(url) {
    return fetch(url + `&key=${apiKey()}`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error.message)
            } else {
                return data
            }
        })
}
