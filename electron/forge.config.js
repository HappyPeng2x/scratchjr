
const path = require('path');
const os = require('os');

let iconFile;
const platform = os.platform();

if (platform === 'darwin') {
    iconFile = path.resolve(__dirname, 'src/icons/mac/icon.icns');
} else if (platform === 'win32') {
    iconFile = path.resolve(__dirname, 'src/icons/win/icon.ico');
}

module.exports = {
    packagerConfig: {
        appCopyright: 'Copyright (c) 2016, MIT',
        icon: iconFile,
    },
    rebuildConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'ScratchJr',
                iconUrl: path.resolve(__dirname, 'src/icons/win/icon.ico'),
                setupIcon: path.resolve(__dirname, 'src/icons/win/icon.ico'),
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
        },
        {
            name: '@electron-forge/maker-deb',
            config: {},
        },
    ],
    hooks: {
        generateAssets: async () => {
            const { build } = require('esbuild');
            const fs = require('fs');

            // Copy shared static assets from editions/free/src/ into the web root
            const editionsDir = path.resolve(__dirname, '../editions/free/src');
            const appDir = path.resolve(__dirname, 'src/app');
            const dirs = ['css', 'assets', 'svglibrary', 'sounds', 'localizations', 'inapp', 'samples'];
            const files = ['media.json', 'settings.json', 'pop.mp3'];

            for (const dir of dirs) {
                fs.cpSync(path.join(editionsDir, dir), path.join(appDir, dir), {recursive: true});
            }
            for (const file of files) {
                const src = path.join(editionsDir, file);
                if (fs.existsSync(src)) {
                    fs.copyFileSync(src, path.join(appDir, file));
                }
            }
            console.log('assets: copied from editions/free/src/'); // eslint-disable-line no-console

            // esbuild plugin: redirect any import of the main repo's src/tablet/* to
            // electron/src/tablet/* so the Electron-specific platform layer is used.
            const mainTabletDir = path.resolve(__dirname, '../src/tablet');
            const electronTabletDir = path.resolve(__dirname, 'src/tablet');
            const tabletRedirectPlugin = {
                name: 'electron-tablet-redirect',
                setup (buildInstance) {
                    buildInstance.onResolve({filter: /tablet\//}, (args) => {
                        const resolved = path.resolve(args.resolveDir, args.path);
                        const resolvedJs = resolved.endsWith('.js') ? resolved : resolved + '.js';
                        if (resolvedJs.startsWith(mainTabletDir + '/')) {
                            const basename = path.basename(resolvedJs);
                            return {path: path.join(electronTabletDir, basename)};
                        }
                    });
                },
            };

            // Bundle the JS renderer
            await build({
                entryPoints: ['./src/appEntry.js'],
                bundle: true,
                outfile: './src/app/appEntry.bundle.js',
                platform: 'browser',
                target: ['chrome130'],
                sourcemap: true,
                plugins: [tabletRedirectPlugin],
            });
            console.log('esbuild: renderer bundle generated'); // eslint-disable-line no-console
        },
    },
};
