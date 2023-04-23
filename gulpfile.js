const fs = require("fs");
const process = require("process");

const gulp = require("gulp");
const zip = require("gulp-zip");
const babel = require("gulp-babel");
const sourcemaps = require("gulp-sourcemaps");

const crx3 = require("crx3");

const remoteSourceMaps =
  process.argv[2] === "--local-sourcemaps" ? false : true;
const version = JSON.parse(
  fs.readFileSync("src/manifest.json", "utf8")
).version;

const chrome_folder_name = `TWP.${version}.Chrome`;
const firefoxfolder_name = `TWP.${version}.Firefox`;

const mappath = `../maps/${version}`;
const mapconfig = remoteSourceMaps
  ? {
      sourceMappingURLPrefix:
        "https://raw.githubusercontent.com/FilipePS/TWP---Source-Maps/main",
    }
  : null;

const babelConfig = {
  presets: [
    [
      "@babel/preset-env",
      {
        targets: {
          firefox: "63",
          chrome: "70",
        },
        // corejs: 3,
        // useBuiltIns: "usage",
      },
    ],
  ],
  plugins: [
    // ["@babel/plugin-transform-runtime"],
    // ["@babel/plugin-syntax-dynamic-import"],
  ],
};

gulp.task("clean", (cb) => {
  fs.rmSync("build", { recursive: true, force: true });
  cb();
});

gulp.task("firefox-copy", () => {
  return gulp.src(["src/**/**"]).pipe(gulp.dest(`build/${firefoxfolder_name}`));
});

gulp.task("firefox-babel", () => {
  return Promise.all([
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefoxfolder_name}/background/*.js`])
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefoxfolder_name}/background`))
        .on("end", resolve);
    }),
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefoxfolder_name}/lib/*.js`])
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefoxfolder_name}/lib`))
        .on("end", resolve);
    }),
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefoxfolder_name}/contentScript/*.js`])
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefoxfolder_name}/contentScript`))
        .on("end", resolve);
    }),
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefoxfolder_name}/options/*.js`])
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefoxfolder_name}/options`))
        .on("end", resolve);
    }),
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefoxfolder_name}/popup/*.js`])
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefoxfolder_name}/popup`))
        .on("end", resolve);
    }),
  ]);
});

gulp.task("firefox-move-sourcemap", (cb) => {
  if (!remoteSourceMaps) {
    return cb();
  }
  return new Promise((resolve, reject) => {
    gulp
      .src([`build/${firefoxfolder_name}/maps/**/*`])
      .pipe(gulp.dest("build/maps"))
      .on("error", reject)
      .on("end", resolve);
  }).then(() => {
    fs.rmSync(`build/${firefoxfolder_name}/maps`, {
      recursive: true,
      force: true,
    });
  });
});

gulp.task("firefox-zip", () => {
  return gulp
    .src([`build/${firefoxfolder_name}/**/*`])
    .pipe(zip(`TWP.${version}.Firefox.zip`))
    .pipe(gulp.dest("build"));
});

gulp.task("chrome-copy-from-firefox", () => {
  return gulp
    .src([`build/${firefoxfolder_name}/**/**`])
    .pipe(gulp.dest(`build/${chrome_folder_name}`));
});

gulp.task("chrome-rename", (cb) => {
  fs.renameSync(
    `build/${chrome_folder_name}/manifest.json`,
    `build/${chrome_folder_name}/firefox_manifest.json`
  );
  fs.renameSync(
    `build/${chrome_folder_name}/chrome_manifest.json`,
    `build/${chrome_folder_name}/manifest.json`
  );
  cb();
});

gulp.task("chrome-zip", () => {
  return gulp
    .src([`build/${chrome_folder_name}/**/**`])
    .pipe(zip(`TWP.${version}.Chrome.zip`))
    .pipe(gulp.dest("build"));
});

gulp.task("chrome-sign", (cb) => {
  return crx3([`build/TWP.${version}.Chrome/manifest.json`], {
    keyPath: "buld/Traduzir-paginas-web.pem",
    crxPath: `build/TWP.${version}.Chrome.crx`,
  })
    .then(() => console.log("done"))
    .catch(console.error);
});

gulp.task(
  "firefox-build",
  gulp.series(
    "firefox-copy",
    "firefox-babel",
    "firefox-move-sourcemap",
    "firefox-zip"
  )
);
gulp.task(
  "chrome-build",
  gulp.series(
    "chrome-copy-from-firefox",
    "chrome-rename",
    "chrome-zip",
    "chrome-sign"
  )
);

gulp.task("default", gulp.series("clean", "firefox-build", "chrome-build"));
