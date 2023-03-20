const fs = require("fs");
const path = require("path");
const extractZip = require("extract-zip");

const zipFile = path.join(
  __dirname,
  "./Translate Web Pages (translations).zip"
);
const resultDir = path.join(__dirname, "./result");

if (fs.existsSync(resultDir)) {
  fs.rmSync(resultDir, { recursive: true });
}

if (fs.existsSync(zipFile)) {
  extractZip(
    zipFile,
    {
      dir: resultDir,
    },
    (err) => {
      console.error(err);
    }
  ).then(() => {
    const langNames = fs.readdirSync(resultDir);
    for (const lang of langNames) {
      const langFolder = path.join(resultDir, lang);
      const files = fs.readdirSync(langFolder);
      for (const file of files) {
        if (file !== "messages.json") {
          fs.rmSync(path.join(langFolder, file));
        }
      }
      if (lang.indexOf("-") !== -1) {
        fs.renameSync(langFolder, path.join(resultDir, lang.replace("-", "_")));
      }
      if (
        langNames.filter((l) => l.startsWith(lang.split("-")[0] + "-"))
          .length === 1
      ) {
        fs.renameSync(
          path.join(resultDir, lang.replace("-", "_")),
          path.join(resultDir, lang.split("-")[0])
        );
      }
    }
  });
}
