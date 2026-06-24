#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const os = require('os')

function getPluginDir () {
    switch (process.platform) {
        case 'darwin':
            return path.join(os.homedir(), 'Library', 'Application Support', 'tabby', 'plugins', 'node_modules', 'tabby-gcp-iap')
        case 'win32':
            return path.join(process.env.APPDATA, 'tabby', 'plugins', 'node_modules', 'tabby-gcp-iap')
        default:
            return path.join(os.homedir(), '.config', 'tabby', 'plugins', 'node_modules', 'tabby-gcp-iap')
    }
}

function copyDir (src, dest) {
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath)
        } else {
            fs.copyFileSync(srcPath, destPath)
        }
    }
}

const root = path.join(__dirname, '..')
const pluginDir = getPluginDir()

fs.mkdirSync(pluginDir, { recursive: true })
copyDir(path.join(root, 'dist'), path.join(pluginDir, 'dist'))
fs.copyFileSync(path.join(root, 'package.json'), path.join(pluginDir, 'package.json'))

console.log('Installed to', pluginDir)
console.log('Restart Tabby to activate the plugin.')
