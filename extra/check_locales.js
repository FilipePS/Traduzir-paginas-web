const fs = require("fs");
const path = require("path");

function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path + "/" + file).isDirectory();
  });
}

const langs = getDirectories(path.join(__dirname, "./result"));

const en_messages = require(path.join(
  __dirname,
  `./result/en/messages.json`
));
const en_keys = Object.keys(en_messages);

for (const code of langs) {
  const messages = require(path.join(
    __dirname,
    `./result/${code}/messages.json`
  ));
  const keys = Object.keys(messages);
  if (keys.length !== Object.keys(en_messages).length) {
    console.log(`Different number of keys in "${code}" compared to "en"`);
  }
  for (const en_key of en_keys) {
    if (!messages[en_key]) {
      console.log(`Key "${en_key}" not found in "en"`);
    } else {
      if (!messages[en_key].message) {
        console.log(`Key "${en_key}" is missing "message" in "${code}"`);
      }
      if (en_messages[en_key].placeholders) {
        if (!messages[en_key].placeholders) {
          console.log(`Key "${en_key}" is missing "placeholders" in "${code}"`);
        } else {
          const en_vars = Object.keys(en_messages[en_key].placeholders);
          const vars = Object.keys(messages[en_key].placeholders);
          if (vars.length !== en_vars.length) {
            console.log(
              `Different number of placeholders in "${en_key}" compared to "en"`
            );
          }
          for (const en_var of en_vars) {
            if (!messages[en_key].placeholders[en_var]) {
              console.log(
                `Placeholder "${en_var}" not found in "${en_key}" in "${code}"`
              );
            }
          }
          const placeHolderInMessage =
            messages[en_key].message.match(/\$\w+\$/g);
          if (placeHolderInMessage) {
            for (const placeHolder of en_vars) {
              if (!placeHolderInMessage.includes("$" + placeHolder + "$")) {
                console.log(
                  `Placeholder "${placeHolder}" not found in "${en_key}" in "${code}"`
                );
              }
            }
          } else {
            console.log(`No placeholder found in "${en_key}" in "${code}"`);
          }
        }
      }
    }
  }

  console.log("=====================================");
}
