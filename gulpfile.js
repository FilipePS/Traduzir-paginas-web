const gulp = require("gulp");
const zip = require("gulp-zip");
const fs = require("fs");
const babel = require("gulp-babel");
const sourcemaps = require("gulp-sourcemaps");

gulp.task("clean", (cb) => {
  fs.rmSync("dist", { recursive: true, force: true });
  cb();
});

gulp.task("firefox-copy", () => {
  return gulp.src(["src/**/**"]).pipe(gulp.dest("dist/firefox"));
});

gulp.task("firefox-babel", () => {
  return gulp
    .src(["dist/firefox/background/*.js"])
    .pipe(sourcemaps.init())
    .pipe(
      babel({
        presets: ["@babel/preset-env"],
      })
    )
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("dist/firefox/background"));
});

gulp.task("firefox-zip", () => {
  return gulp
    .src(["dist/firefox/**/*"])
    .pipe(zip("firefox.zip"))
    .pipe(gulp.dest("dist"));
});

gulp.task("chrome-copy", () => {
  return gulp.src(["src/**/**"]).pipe(gulp.dest("dist/chrome"));
});

gulp.task("chrome-rename", (cb) => {
  fs.renameSync(
    "dist/chrome/manifest.json",
    "dist/chrome/firefox_manifest.json"
  );
  fs.renameSync(
    "dist/chrome/chrome_manifest.json",
    "dist/chrome/manifest.json"
  );
  cb();
});

gulp.task("chrome-babel", () => {
  return gulp
    .src(["dist/chrome/background/*.js"])
    .pipe(sourcemaps.init())
    .pipe(
      babel({
        presets: ["@babel/preset-env"],
      })
    )
    .pipe(sourcemaps.write())
    .pipe(gulp.dest("dist/chrome/background"));
});

gulp.task("chrome-zip", () => {
  return gulp
    .src(["dist/chrome/**/**"])
    .pipe(zip("chrome.zip"))
    .pipe(gulp.dest("dist"));
});

gulp.task(
  "firefox-build",
  gulp.series("firefox-copy", "firefox-babel", "firefox-zip")
);
gulp.task(
  "chrome-build",
  gulp.series("chrome-copy", "chrome-rename", "chrome-babel", "chrome-zip")
);

gulp.task("default", gulp.series("clean", "firefox-build", "chrome-build"));
