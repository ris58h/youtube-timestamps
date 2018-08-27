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

    test('Video without preview', 'https://www.youtube.com/watch?v=J_3rb81Url4', [
        { text: "50% of the comment section: OML SHE SAID MY NAME\nOther 50%: She didn't say my name >:O\n\n\n36:32 ;^)" },
        { text: "Jaiden- 51:32\n\nGibbi- Jaiden, goodnight Jaiden\n\nMe- OMG SHE SAID MY NAME!\n\n(My real name is Jaiden not Edna -_- That's just my characters name)" },
        { text: "52:12\nWhat do you hear?Yanny or Laurel?" },
        /*{ text: "1:03:33 Ouch!" },*/{ text: "1:03:33 Jeezzzz" }, //TODO collision
        { text: "1:03:33 Jeezzzz" },
        { text: "1:50:09 whoever put their name as Uvuvwevwevwe Onyetenyevwe Ugwemuhwem Osas is an absolute legend!!" },
        { text: "1:50:13 thank you for saying my name" },
        { text: "Who else skipped until your name was called and my name is Will/William and I am very well, hope you are feeling the same way🙃🙂 1:52:47" },
    ])

    test('Video with preview', 'https://www.youtube.com/watch?v=vUcX6wBPqCQ', [
        { text: "So effortlessly catched 2:29" },
        { text: "5:13 Daaaang! Dissing your wife XD" },
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
                    const text = await page.$eval('.__youtube-timestamps__preview__text', e => e.textContent)
                    expect(text).to.equal(expected.text)
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

    after(async () => {
        browser.close()
    })
})