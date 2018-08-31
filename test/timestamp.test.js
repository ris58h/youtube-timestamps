const ts = require('../extension/timestamp')
const assert = require('assert').strict

describe('timestamp', () => {
    describe('extractTimestamps', () => {
        it('no timestamp', () => {
            assert.deepEqual(ts.extractTimestamps('some text'), [])
        })

        it('just timestamp', () => {
            assert.deepEqual(ts.extractTimestamps('0:14'), ['0:14'])
            assert.deepEqual(ts.extractTimestamps('13:14'), ['13:14'])
            assert.deepEqual(ts.extractTimestamps('2:13:14'), ['2:13:14'])
            assert.deepEqual(ts.extractTimestamps('12:13:14'), ['12:13:14'])
        })

        it('multiple timestamps', () => {
            assert.deepEqual(ts.extractTimestamps('0:14 13:14 2:13:14 12:13:14'), ['0:14', '13:14', '2:13:14', '12:13:14'])
        })

        it('multiple timestamps with text around', () => {
            assert.deepEqual(ts.extractTimestamps('text0:14text13:14text2:13:14text12:13:14text'), ['0:14', '13:14', '2:13:14', '12:13:14'])
            assert.deepEqual(ts.extractTimestamps('-0:14-13:14-2:13:14-12:13:14-'), ['0:14', '13:14', '2:13:14', '12:13:14'])
        })

        it.skip('invalid timestamps', () => {
            assert.deepEqual(ts.extractTimestamps('111:12:13'), [])
            assert.deepEqual(ts.extractTimestamps('11:60:13'), [])
            assert.deepEqual(ts.extractTimestamps('11:12:60'), [])
        })
    })

    describe('parseTimestamp', () => {
        it('', () => {
            assert.equal(ts.parseTimestamp('0:00'), 0)
            assert.equal(ts.parseTimestamp('0:01'), 1)
            assert.equal(ts.parseTimestamp('1:00'), 60)
            assert.equal(ts.parseTimestamp('10:00'), 10 * 60)
            assert.equal(ts.parseTimestamp('1:10:00'), 60 * 60 + 10 * 60)
            assert.equal(ts.parseTimestamp('11:10:00'), 11 * 60 * 60 + 10 * 60)
        })
    })
})
