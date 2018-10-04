const puppeteer = require('puppeteer')
const expect = require('chai').expect
const parseUrl = require('url').parse

describe('e2e', () => {
    let browser

    before(async () => {
        const pathToExtension = process.cwd() + '/extension'
        browser = await puppeteer.launch({
            headless: false, // Chrome Headless doesn't support extensions. https://github.com/GoogleChrome/puppeteer/issues/659
            args: [
                '--no-sandbox',
                '--disable-extensions-except=' + pathToExtension,
                '--load-extension=' + pathToExtension,
                '--mute-audio'
            ]
        })
    })

    describe('Timestamps in comments', () => test('https://www.youtube.com/watch?v=vUcX6wBPqCQ', [
        { ts: '2:29', text: "So effortlessly catched 2:29" },
        // { ts: '5:13', text: "5:13 Daaaang! Dissing your wife XD" },
    ]))

    describe('Timestamps in description', () => test('https://www.youtube.com/watch?v=KhaTy5sCdJM', [
        { ts: '01:04', text: "01:04 Design" },
        { ts: '02:41', text: "02:41 Input Devices" },
        { ts: '03:37', text: "03:37 Display" },
        { ts: '05:08', text: "05:08 Sound " },
        { ts: '06:02', text: "06:02 Performance" },
        { ts: '06:59', text: "06:59 Heat & Noise" },
        { ts: '08:49', text: "08:49 Battery" },
        // { ts: '', text: "09: Software" },
        { ts: '10:07', text: "10:07 Pros & Cons" },
        { ts: '11:09', text: "11:09 Conclusion" },
    ]))

    describe('Timestamps. Timestamps everywhere', () => {
        const description = "This is a speedrun of Tony Hawk's Underground by Fivves from Summer Games Done Quick 2016. The run starts at 15:33.\r"
        test('https://www.youtube.com/watch?v=iQ6rolvCYW4', [
            { ts: '15:33', text: description },//{ ts: '15:32', text: "15:32 . . . . . your welcome" },
            { ts: '15:33', text: description },
            { ts: '27:00', text: "27:00 Admiring the great Tony Hawk." },
            { ts: '31:07', text: "31:07 Rip headphone users" },
        ])
    })

    describe('Multiple timestamps in one comment', () => test('https://www.youtube.com/watch?v=NkSpiq5E9d8', [
        { ts: '7:01', text: "Голы:\n7:01\n8:23\n12:15\nНе благодарите." },
        { ts: '8:23', text: "Голы:\n7:01\n8:23\n12:15\nНе благодарите." },
        { ts: '10:28', text: "10:25 - 10:28 комментаторы в терцию спели, ахахахахха." },//TODO collision { ts: '10:27', text: "10:27 Ооооооооо" },
        { ts: '10:28', text: "10:25 - 10:28 комментаторы в терцию спели, ахахахахха." },//TODO collision { ts: '10:27', text: "10:27, 10 часовую версию в студию!" },
        { ts: '10:28', text: "10:25 - 10:28 комментаторы в терцию спели, ахахахахха." },//TODO collision { ts: '10:25', text: "10:25 - 10:28 комментаторы в терцию спели, ахахахахха." },
        { ts: '10:28', text: "10:25 - 10:28 комментаторы в терцию спели, ахахахахха." },
        { ts: '12:15', text: "Голы:\n7:01\n8:23\n12:15\nНе благодарите." },
    ]))

    describe('Video with 0:00 timestamp', () => test('https://www.youtube.com/watch?v=TsZZ6QKkz1s', [
        { ts: '0:00', text: "0:00 i have the same rug :P" },
        { ts: '0:49', text: "0:49 what was that called where you stepped off his board right before a curb and got back on. Also, how difficult is it" },
    ]))

    describe('Embedded video', () => test(`file://${process.cwd()}/test/embedded.html`, [
        { ts: '2:29', text: "So effortlessly catched 2:29" },
        // { ts: '5:13', text: "5:13 Daaaang! Dissing your wife XD" },
    ], page => page.frames()[1]))

    after(() => {
        browser.close()
    })

    function test(url, expectedTimeComments, frameGetter) {
        let page
        let frame

        before(async () => {
            page = await createPage(url)
            frame = frameGetter ? frameGetter(page) : page.mainFrame()

            const ad = await frame.$('.videoAdUi')
            if (ad) {
                await page.$eval('video', v => v.currentTime = 100500)
            }
            await frame.waitFor('.__youtube-timestamps__stamp')
        })

        it('timestamps', async () => {
            const ts = await frame.$$('.__youtube-timestamps__stamp')
            expect(ts.length).to.equal(expectedTimeComments.length)
            for (let i = 0; i < ts.length; i++) {
                const t = ts[i]
                const expected = expectedTimeComments[i]
                await t.hover()
                await frame.waitFor('.__youtube-timestamps__preview', { visible: true })
                const text = await frame.$eval('.__youtube-timestamps__preview__text', e => e.textContent)
                expect(text).to.equal(expected.text)
                const tsText = await frame.$eval('.__youtube-timestamps__preview__text-stamp', e => e.textContent)
                expect(tsText).contain(expected.ts)
            }
        })

        after(async () => {
            await page.close()
        })
    }

    async function createPage(url) {
        const page = await browser.newPage()
        await page.setRequestInterception(true)
        page.on('request', request => {
            if (isImageUrl(request.url()) || isFontUrl(request.url())) {
                request.abort()
            } else {
                request.continue()
            }
        })
        await page.goto(url)
        return page
    }

    function isImageUrl(url) {
        const pathname = parseUrl(url).pathname
        if (!pathname) {
            return false
        }
        return pathname.endsWith('.png')
            || pathname.endsWith('.jpg')
            || pathname.endsWith('.jpeg')
            || pathname.endsWith('.gif')
            || pathname.endsWith('.svg')
    }

    function isFontUrl(url) {
        const pathname = parseUrl(url).pathname
        if (!pathname) {
            return false
        }
        return pathname.endsWith('.woff')
            || pathname.endsWith('.woff2')
    }
})