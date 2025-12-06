import pkg from './package.json' with {type: 'json'};
import mapWorkspaces from '@npmcli/map-workspaces';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';

export default /** @type import('electron-builder').Configuration */
({
  directories: {
    output: 'dist',
    buildResources: 'buildResources',
  },
  generateUpdatesFilesForAllChannels: true,
  win: {
    target: 'nsis',
  },
  /**
   * It is recommended to avoid using non-standard characters such as spaces in artifact names,
   * as they can unpredictably change during deployment, making them impossible to locate and download for update.
   */
  artifactName: '${productName}-${version}-${os}-${arch}.${ext}',
  files: [
    'LICENSE*',
    pkg.main,
    // '!node_modules/@xyz/**',
    ...await getListOfFilesFromEachWorkspace(),
    // {
    //   "from": "packages/main/dist",
    //   "to": "node_modules/@xyz/main/dist",
    // },
    // {
    //   "from": "packages/main/package.json",
    //   "to": "node_modules/@xyz/main/package.json",
    // },
    // {
    //   "from": "packages/preload/dist",
    //   "to": "node_modules/@xyz/preload/dist",
    // },
    
    // {
    //   from: 'node_modules/@xyz/renderer/dist/',
    //   to: 'node_modules/@xyz/renderer/dist'
    // },
    // {
    //   "from": "node_modules/.bin",
    //   "to": "node_modules/.bin"
    // }
  ],
  // extraFiles: [
  //   {
  //     "from": "packages/main/package.json",
  //     "to": "node_modules/@xyz/main/package.json",
  //   },
  // ],
  onNodeModuleFile : (file) => {
    console.log('onNodeModuleFile:', file);
  }
});

/**
 * By default, electron-builder copies each package into the output compilation entirety,
 * including the source code, tests, configuration, assets, and any other files.
 *
 * So you may get compiled xyz structure like this:
 * ```
 * xyz/
 * ├── node_modules/
 * │   └── workspace-packages/
 * │       ├── package-a/
 * │       │   ├── src/            # Garbage. May be safely removed
 * │       │   ├── dist/
 * │       │   │   └── index.js    # Runtime code
 * │       │   ├── vite.config.js  # Garbage
 * │       │   ├── .env            # some sensitive config
 * │       │   └── package.json
 * │       ├── package-b/
 * │       ├── package-c/
 * │       └── package-d/
 * ├── packages/
 * │   └── entry-point.js
 * └── package.json
 * ```
 *
 * To prevent this, we read the “files”
 * property from each package's package.json
 * and add all files that do not match the patterns to the exclusion list.
 *
 * This way,
 * each package independently determines which files will be included in the final compilation and which will not.
 *
 * So if `package-a` in its `package.json` describes
 * ```json
 * {
 *   "name": "package-a",
 *   "files": [
 *     "dist/**\/"
 *   ]
 * }
 * ```
 *
 * Then in the compilation only those files and `package.json` will be included:
 * ```
 * xyz/
 * ├── node_modules/
 * │   └── workspace-packages/
 * │       ├── package-a/
 * │       │   ├── dist/
 * │       │   │   └── index.js    # Runtime code
 * │       │   └── package.json
 * │       ├── package-b/
 * │       ├── package-c/
 * │       └── package-d/
 * ├── packages/
 * │   └── entry-point.js
 * └── package.json
 * ```
 */
async function getListOfFilesFromEachWorkspace() {

  /**
   * @type {Map<string, string>}
   */
  const workspaces = await mapWorkspaces({
    cwd: process.cwd(),
    pkg,
  });

  const allFilesToInclude = [];

  for (const [name, path] of workspaces) {
    // console.log(`Processing workspace package: ${name} at ${path}`);
    // const pkgPath = join(path, 'package.json');
    // const {default: workspacePkg} = await import(pathToFileURL(pkgPath), {with: {type: 'json'}});

    // let patterns = workspacePkg.files || ['dist/**', 'package.json'];
    // // patterns = patterns.map(p => fs.realpathSync(path.join(__dirname, 'node_modules', name, p)));
    // patterns = patterns.map((p) =>
    //   // join('node_modules', name, p).replace(/\\/g, '/'),
    //   join(path, p),
    // );
    // toPatterns = patterns.map(p => p);

    // console.log(`Files patterns for workspace package ${name}:`, patterns);

    // for (const pattern of patterns) {
    //   customFIles = {
    //     from: pattern,
    //     to: join('node_modules', name, toPatterns[patterns.indexOf(pattern)]).replace(/\\/g, '/'),
    //   };
    //   allFilesToInclude.push(JSON.stringify(customFIles));
    //   // console.log(`Adding pattern for workspace package ${name}:`, customFIles);
    // }


    // allFilesToInclude.push(...patterns);



    console.log(`Processing workspace: ${name} at ${path}`);

    const pkgPath = join(path, 'package.json');
    console.log(`Looking for package.json at: ${pkgPath}`);
    try {
      const { default: workspacePkg } = await import(pathToFileURL(pkgPath), {
        with: { type: 'json' },
      });

      console.log(`Found package.json for ${name}:`, workspacePkg);

      let patterns = workspacePkg.files || ['dist/**', 'package.json'];
      console.log(`Files patterns for ${name}:`, patterns);

      patterns = patterns.map((p) =>
        join('node_modules', name, p).replace(/\\/g, '/'),
      );
      allFilesToInclude.push(...patterns);

      console.log(`Added patterns for ${name}:`, patterns);
    } catch (error) {
      console.error(`Error processing ${name}:`, error.message);
    }
  }

  console.log('Including workspace files patterns:', allFilesToInclude);

  return allFilesToInclude;
}
