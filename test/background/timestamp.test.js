const ts = require('../../extension/background/timestamp')
const assert = require('assert').strict

describe('timestamp', () => {
    describe('findTimestamps', () => {
        it('no timestamp', () => {
            assert.deepEqual(_findTimestamps('some text'), [])
        })

        it('just timestamp', () => {
            assert.deepEqual(_findTimestamps('0:14'), ['0:14'])
            assert.deepEqual(_findTimestamps('13:14'), ['13:14'])
            assert.deepEqual(_findTimestamps('2:13:14'), ['2:13:14'])
            assert.deepEqual(_findTimestamps('12:13:14'), ['12:13:14'])
            assert.deepEqual(_findTimestamps('2:4:42'), ['2:4:42'])
        })

        it('multiple timestamps', () => {
            assert.deepEqual(_findTimestamps('0:14 13:14 2:13:14 12:13:14'), ['0:14', '13:14', '2:13:14', '12:13:14'])
        })

        it('multiple timestamps with text around', () => {
            assert.deepEqual(_findTimestamps('text0:14text13:14text2:13:14text12:13:14text'), ['0:14', '13:14', '2:13:14', '12:13:14'])
            assert.deepEqual(_findTimestamps('-0:14-13:14-2:13:14-12:13:14-'), ['0:14', '13:14', '2:13:14', '12:13:14'])
        })

        it.skip('invalid timestamps', () => {
            assert.deepEqual(_findTimestamps('111:12:13'), [])
            assert.deepEqual(_findTimestamps('11:60:13'), [])
            assert.deepEqual(_findTimestamps('11:12:60'), [])
        })

        //TODO Actually positions (not substrings) should be checked.
        function _findTimestamps(text) {
            return ts.findTimestamps(text).map(p => text.substring(p.from, p.to))
        }
    })

    describe('parseTimestamp', () => {
        it('', () => {
            assert.equal(ts.parseTimestamp('0:00'), 0)
            assert.equal(ts.parseTimestamp('0:01'), 1)
            assert.equal(ts.parseTimestamp('1:00'), 60)
            assert.equal(ts.parseTimestamp('10:00'), 10 * 60)
            assert.equal(ts.parseTimestamp('1:10:00'), 60 * 60 + 10 * 60)
            assert.equal(ts.parseTimestamp('2:4:42'), 2 * 60 * 60 + 4 * 60 + 42)
            assert.equal(ts.parseTimestamp('11:10:00'), 11 * 60 * 60 + 10 * 60)
        })
    })
})
