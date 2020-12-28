function getAuthInfo() {
    const apiKeyIndex = Math.floor(Math.random() * API_KEYS.length)
    const apiKey = API_KEYS[apiKeyIndex]
    return Promise.resolve({type: 'key', data: apiKey})
}
