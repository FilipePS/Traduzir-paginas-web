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

const chromium_folder_name = `TWP_${version}_Chromium`;
const firefox_folder_name = `TWP_${version}_Firefox`;
const firefox_selfhosted_folder_name = `TWP_${version}_Firefox_selfhosted`;

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
          firefox: "64",
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
  return gulp
    .src(["src/**/**"], {encoding: false})
    .pipe(gulp.dest(`build/${firefox_folder_name}`));
});

gulp.task("firefox-babel", () => {
  return Promise.all([
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefox_folder_name}/background/*.js`], {encoding: false})
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefox_folder_name}/background`))
        .on("end", resolve);
    }),
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefox_folder_name}/lib/*.js`], {encoding: false})
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefox_folder_name}/lib`))
        .on("end", resolve);
    }),
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefox_folder_name}/contentScript/*.js`], {encoding: false})
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefox_folder_name}/contentScript`))
        .on("end", resolve);
    }),
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefox_folder_name}/options/*.js`], {encoding: false})
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefox_folder_name}/options`))
        .on("end", resolve);
    }),
    new Promise((resolve, reject) => {
      gulp
        .src([`build/${firefox_folder_name}/popup/*.js`], {encoding: false})
        .pipe(sourcemaps.init())
        .pipe(babel(babelConfig))
        .pipe(sourcemaps.write(mappath, mapconfig))
        .on("error", reject)
        .pipe(gulp.dest(`build/${firefox_folder_name}/popup`))
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
      .src([`build/${firefox_folder_name}/maps/**/*`], {encoding: false})
      .pipe(gulp.dest("build/maps"))
      .on("error", reject)
      .on("end", resolve);
  }).then(() => {
    fs.rmSync(`build/${firefox_folder_name}/maps`, {
      recursive: true,
      force: true,
    });
  });
});

gulp.task("firefox-self-hosted", (cb) => {
  return new Promise((resolve, reject) => {
    gulp
      .src([`build/${firefox_folder_name}/**/**`], {encoding: false})
      .pipe(gulp.dest(`build/${firefox_selfhosted_folder_name}`))
      .on("error", reject)
      .on("end", resolve);
  }).then(() => {
    const manifest = JSON.parse(
      fs.readFileSync(
        `build/${firefox_selfhosted_folder_name}/manifest.json`,
        "utf8"
      )
    );
    manifest.browser_specific_settings.gecko.update_url =
      "https://raw.githubusercontent.com/FilipePS/Traduzir-paginas-web/master/dist/firefox/updates.json";
    fs.writeFileSync(
      `build/${firefox_selfhosted_folder_name}/manifest.json`,
      JSON.stringify(manifest, null, 4),
      "utf8"
    );
  });
});

gulp.task("firefox-zip", () => {
  return gulp
    .src([`build/${firefox_folder_name}/**/*`], {encoding: false})
    .pipe(zip(`TWP_${version}_Firefox.zip`))
    .pipe(gulp.dest("build"));
});

gulp.task("firefox-self-hosted-zip", () => {
  return gulp
    .src([`build/${firefox_selfhosted_folder_name}/**/*`], {encoding: false})
    .pipe(zip(`TWP_${version}_Firefox_selfhosted.zip`))
    .pipe(gulp.dest("build"));
});

gulp.task("chrome-copy-from-firefox", () => {
  return gulp
    .src([`build/${firefox_folder_name}/**/**`], {encoding: false})
    .pipe(gulp.dest(`build/${chromium_folder_name}`));
});

gulp.task("chrome-rename", (cb) => {
  fs.renameSync(
    `build/${chromium_folder_name}/manifest.json`,
    `build/${chromium_folder_name}/firefox_manifest.json`
  );
  fs.renameSync(
    `build/${chromium_folder_name}/chrome_manifest.json`,
    `build/${chromium_folder_name}/manifest.json`
  );
  cb();
});

gulp.task("chrome-zip", () => {
  return gulp
    .src([`build/${chromium_folder_name}/**/**`], {encoding: false})
    .pipe(zip(`${chromium_folder_name}.zip`))
    .pipe(gulp.dest("build"));
});

gulp.task("chrome-sign", (cb) => {
  const dialog = require("node-file-dialog");

  if (process.argv[2] === "--sign") {
    return dialog({ type: "open-file" }).then((file) => {
      return crx3([`build/${chromium_folder_name}/manifest.json`], {
        keyPath: file[0],
        crxPath: `build/${chromium_folder_name}.crx`,
      });
    });
  } else {
    cb();
  }
});

gulp.task(
  "firefox-build",
  gulp.series(
    "firefox-copy",
    "firefox-babel",
    "firefox-move-sourcemap",
    "firefox-self-hosted",
    "firefox-zip",
    "firefox-self-hosted-zip"
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
