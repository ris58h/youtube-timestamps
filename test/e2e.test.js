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

    const thatLongComment = "too lazy to look at the description? for timestamps? NO WORRY! im here!!\n\n2:06 A Names (and ! name)\n14:15 B Names\n19:12 C Names\n27:56 D Names\n33:58 E Names\n39:32 F Names\n42:08 G Names\n45:05 H Names\n48:14 I Names\n50:53 J Names\n1:01:00 K Names\n1:08:15 L Names\n1:13:41 M Names\n1:21:45 N Names\n1:24:15 O Names\n1:25:58 P Names\n1:29:36 Q Names\n1:30:00 R Names\n1:35:54 S Names\n1:43:55 T Names\n1:49:33 U Names\n1:50:25 V Names\n1:51:57 W Names\n1:53:22 X Names\n1:53:41 Y Names\n1:56:55 THANK YOU!"
    test('Video without preview', 'https://www.youtube.com/watch?v=J_3rb81Url4', [
        { ts: '2:06', text: thatLongComment},
        { ts: '14:15', text: thatLongComment},
        { ts: '19:12', text: thatLongComment},
        { ts: '27:56', text: thatLongComment},
        { ts: '33:58', text: thatLongComment},
        { ts: '36:32', text: "50% of the comment section: OML SHE SAID MY NAME\nOther 50%: She didn't say my name >:O\n\n\n36:32 ;^)" },
        { ts: '39:32', text: thatLongComment},
        { ts: '42:08', text: thatLongComment},
        { ts: '45:05', text: thatLongComment},
        { ts: '48:14', text: thatLongComment},
        { ts: '50:53', text: thatLongComment},
        { ts: '52:12', text: "52:12\nWhat do you hear?Yanny or Laurel?" },
        { ts: '1:01:00', text: thatLongComment},
        /*{ ts: '1:03:33', text: "1:03:33 Ouch!" },*/{ ts: '1:03:33', text: "1:03:33 Jeezzzz" }, //TODO collision
        { ts: '1:03:33', text: "1:03:33 Jeezzzz" },
        { ts: '1:08:15', text: thatLongComment},
        { ts: '1:13:41', text: thatLongComment},
        { ts: '1:21:45', text: thatLongComment},
        { ts: '1:24:15', text: thatLongComment},
        { ts: '1:25:58', text: thatLongComment},
        { ts: '1:29:36', text: thatLongComment},
        { ts: '1:30:00', text: thatLongComment},
        { ts: '1:35:54', text: thatLongComment},
        { ts: '1:43:55', text: thatLongComment},
        { ts: '1:49:33', text: thatLongComment},
        { ts: '1:50:13', text: "1:50:13 thank you for saying my name" },
        { ts: '1:50:25', text: thatLongComment},
        { ts: '1:51:57', text: thatLongComment},
        { ts: '1:52:47', text: "Who else skipped until your name was called and my name is Will/William and I am very well, hope you are feeling the same way🙃🙂 1:52:47" },
        { ts: '1:53:22', text: thatLongComment},
        { ts: '1:53:41', text: thatLongComment},
        { ts: '1:56:55', text: thatLongComment},
    ])

    test('Video with preview', 'https://www.youtube.com/watch?v=vUcX6wBPqCQ', [
        { ts: '2:29', text: "So effortlessly catched 2:29" },
        { ts: '5:13', text: "5:13 Daaaang! Dissing your wife XD" },
    ])

    after(() => {
        browser.close()
    })

    function test(name, url, expectedTimeComments) {
        describe(name, () => {
            let page

            before(async () => {
                page = await createPage(url)

                const ad = await page.$('.videoAdUi')
                if (ad) {
                    await page.waitFor('.videoAdUiSkipButton', { visible: true })
                    await page.click('.videoAdUiSkipButton')
                }
                await page.waitFor('.__youtube-timestamps__stamp')
            })

            it('timestamps', async () => {
                const ts = await page.$$('.__youtube-timestamps__stamp')
                expect(ts.length).to.equal(expectedTimeComments.length)
                for (let i = 0; i < ts.length; i++) {
                    const t = ts[i]
                    const expected = expectedTimeComments[i]
                    const box = await t.boundingBox()
                    await page.mouse.move(box.x, box.y)
                    await page.waitFor('.__youtube-timestamps__preview', { visible: true })
                    const text = await page.$eval('.__youtube-timestamps__preview__text', e => e.textContent)
                    expect(text).to.equal(expected.text)
                    const tsText = await page.$eval('.__youtube-timestamps__preview__text-stamp', e => e.textContent)
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