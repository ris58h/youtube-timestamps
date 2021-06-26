chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    createRequest(request)
        .then(sendResponse)
        .catch(e => console.error(e))
    return true
})

function createRequest(request) {
    if (request.type == 'fetchComments') {
        return fetchComments(request.videoId)
    } else if (request.type == 'fetchVideo') {
        return fetchVideo(request.videoId)
    } else {
        return Promise.reject(new Error("Unknown request type: " + request.type))
    }
}
