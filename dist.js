import fsExtraPkg from 'fs-extra'
const { remove, ensureDir, readJson, createWriteStream } = fsExtraPkg
import archiver from 'archiver'

{(async function() {
    await remove("./dist")
    await ensureDir("./dist")

    const name = process.env.npm_package_name
    const version = (await readJson("./extension/manifest.json")).version
    const output = createWriteStream(`./dist/${name}-${version}.zip`)
    const archive = archiver("zip")
    archive.pipe(output)
    archive.glob("**/*", { cwd: "./extension" })
    archive.on("error", err => { throw err })
    archive.finalize()
})()}
