const fs = require('fs-extra')
var archiver = require('archiver')

{(async function() {
    await fs.remove("./dist")
    await fs.ensureDir("./dist")

    const version = (await fs.readJson("./extension/manifest.json")).version
    const output = fs.createWriteStream(`./dist/youtube-timestamps-${version}.zip`)
    const archive = archiver("zip")
    archive.pipe(output)
    archive.glob("**/*", { cwd: "./extension" })
    archive.on("error", err => { throw err })
    archive.finalize()
})()}
