## Preliminary information

- The extension can be loaded directly into Firefox from the **src** folder, I like it that way because it helps me debug.
- The reason for having a build step is to add compatibility with previous versions of Firefox.
- In the **src** folder, the **src/lib/polyfill.js** files are already precompiled.
- The **src/lib/polyfill.js** file is a compilation of several polyfills of **core-js**.
- Before running any command, make sure you have already run `npm install`.
- The **extra** folder is not part of the extension build.

## How to build **polyfill.js**

- Run the `npm run polyfill` command and the  **polyfill.js** file in the root directory will be compiled generating the  **src/lib/polyfill.js** file.

## How to build the extension
- To make the build that adds compatibility with previous versions of browsers, run the command `npm run build:local-sourcemaps`.
- The files I sent for review were built with the `npm run build` command. The difference is that the **source-maps** were outside the extension folder, with a configured Github URL. I upload the source-maps to this repository: https://github.com/FilipePS/TWP---Source-Maps
- The reason I use remote **source-maps** is to reduce the download size of the extension, but still allow users to easily debug without needing the original source code.
