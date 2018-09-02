function findTimestamps(text) {
    const result = []
    const timestampPattern = /((\d?\d:)?\d\d|\d):\d\d/g
    let match
    while ((match = timestampPattern.exec(text))) {
        result.push({
            from: match.index,
            to: timestampPattern.lastIndex
        })
    }
    return result
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

// Modules aren't supported in Web Extensions.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        findTimestamps,
        parseTimestamp
    }
}
