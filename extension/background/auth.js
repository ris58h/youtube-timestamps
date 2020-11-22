const INVALID_TIMES = []

function getApiKey() {
    const apiKeyIndex = validApiKeyIndex()
    if (apiKeyIndex == null || apiKeyIndex < 0) {
        return Promise.reject()
    }
    const apiKey = API_KEYS[apiKeyIndex]
    return Promise.resolve(apiKey)
}

function invalidateApiKey(apiKey) {
    for (let i = 0; i < API_KEYS.length; i++) {
        if (API_KEYS[i] === apiKey) {
            invalidateApiKeyIndex(i)
            return
        }
    }
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
        if (isValidApiKeyIndex(apiKeyIndex)) {
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

function isValidApiKeyIndex(index) {
    // Daily quotas reset at midnight Pacific Time (PT). 
    //TODO check that current day is different from invalidation time in Pacific Time.
    return !INVALID_TIMES[index]
}

function invalidateApiKeyIndex(index) {
    INVALID_TIMES[index] = new Date()
}
