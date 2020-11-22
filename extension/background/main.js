chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
