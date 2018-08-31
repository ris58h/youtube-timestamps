function extractTimestamps(text) {
    return (text.match(/((\d?\d:)?\d\d|\d):\d\d/g) || [])
}

function parseTimestamp(ts) {
    const parts = ts.split(':').reverse()
    const secs = parseInt(parts[0])
    if (secs > 59) {
        return null
    }
    const mins = parseInt(parts[1])
    if (mins > 59) {
        return null
    }
    const hours = parseInt(parts[2]) || 0
    return secs + (60 * mins) + (60 * 60 * hours)
}

//TODO It isn't supported in Web Extensions so we get an error in background script console.
module.exports = {
    extractTimestamps,
    parseTimestamp
}