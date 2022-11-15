import fs from 'fs'
import archiver from 'archiver'

fs.rmSync("./dist", {recursive: true, force: true})
fs.mkdirSync("./dist")

const name = process.env.npm_package_name
const version = readJsonSync("./extension/manifest.json").version
const output = fs.createWriteStream(`./dist/${name}-${version}.zip`)
const archive = archiver("zip")
archive.pipe(output)
archive.glob("**/*", { cwd: "./extension" })
archive.on("error", err => { throw err })
archive.finalize()

function readJsonSync(path) {
    const content = fs.readFileSync(path, "utf8")
    return JSON.parse(content)
}
