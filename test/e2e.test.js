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

    test('Video without preview', 'https://www.youtube.com/watch?v=tBiPumGnVT4', [
        { ts: '1:20', text: 'check out 1:20 his face though XD'},
        { ts: '3:14', text: 'test 3:14'},
        { ts: '3:49', text: 'Click this ====> 3:49 for the best part of the video'},
        { ts: '3:51', text: 'check 3:51'},
    ])

    test('Video with preview', 'https://www.youtube.com/watch?v=vUcX6wBPqCQ', [
        { ts: '2:29', text: "So effortlessly catched 2:29" },
        { ts: '5:13', text: "5:13 Daaaang! Dissing your wife XD" },
    ])

    test('Multiple timestamps in one comment', 'https://www.youtube.com/watch?v=NkSpiq5E9d8', [
        { ts: '7:01', text: "Голы:\n7:01\n8:23\n12:15\nНе благодарите." },
        { ts: '8:23', text: "Голы:\n7:01\n8:23\n12:15\nНе благодарите." },
        { ts: '10:28', text: "10:25 - 10:28 комментаторы в терцию спели, ахахахахха." },//TODO collision { ts: '10:25', text: "10:25 - 10:28 комментаторы в терцию спели, ахахахахха." },
        { ts: '10:28', text: "10:25 - 10:28 комментаторы в терцию спели, ахахахахха." },
        { ts: '12:15', text: "Голы:\n7:01\n8:23\n12:15\nНе благодарите." },
    ])

    test('Embedded video', `file://${process.cwd()}/test/embedded.html`, [
        { ts: '2:29', text: "So effortlessly catched 2:29" },
        { ts: '5:13', text: "5:13 Daaaang! Dissing your wife XD" },
    ], page => page.frames()[1])

    after(() => {
        browser.close()
    })

    function test(name, url, expectedTimeComments, frameGetter) {
        describe(name, () => {
            let page
            let frame

            before(async () => {
                page = await createPage(url)
                frame = frameGetter ? frameGetter(page) : page.mainFrame()

                const ad = await frame.$('.videoAdUi')
                if (ad) {
                    await frame.waitFor('.videoAdUiSkipButton', { visible: true })
                    await frame.click('.videoAdUiSkipButton')
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