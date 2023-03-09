const fs = require("fs");
const browserify = require("browserify");
const babelify = require("babelify");
const Concat = require("concat-with-sourcemaps");

const concat = new Concat(true, "all.js", "\n");

concat.add(
  "translationCache.js",
  fs.readFileSync("./src/background/translationCache.js", "utf8")
);

concat.add(
  "translationService.js",
  fs.readFileSync("./src/background/translationService.js", "utf8")
);

concat.add(
  "textToSpeech.js",
  fs.readFileSync("./src/background/textToSpeech.js", "utf8")
);

var mime = "application/json";
var encoding = "base64";
var data = Buffer.from(concat.sourceMap).toString(encoding);
var uri =
  "\n//# sourceMappingURL=" +
  "data:" +
  mime +
  ";charset=utf-8;" +
  encoding +
  "," +
  data;

fs.writeFileSync("all.js", concat.content, "utf8");
fs.writeFileSync("all.js.map", concat.sourceMap, "utf8");

//*
browserify({ debug: true })
  .transform(babelify)
  .require("./all.js", { entry: true })
  .bundle()
  .on("error", function (err) {
    console.log("Error: " + err.message);
  })
  .pipe(fs.createWriteStream("all.min.js"));
//*/

/*
{
  const data = fs.readFileSync("all.min.js", "utf8");
  const search =
    "//# sourceMappingURL=data:application/json;charset=utf-8;base64,";
  const index = data.indexOf(search);

  fs.writeFileSync(
    "all.min.js",
    data.substring(0, index) + "//# sourceMappingURL=all.min.js.map",
    "utf8"
  );

  fs.writeFileSync(
    "all.min.js.map",
    Buffer.from(data.substring(index + search.length), "base64").toString(),
    "utf8"
  );
}
//*/
