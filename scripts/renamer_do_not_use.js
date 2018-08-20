
const trgFolder = './virgin_noto/';

const fs = require('fs');



fs.readdir(trgFolder, (err, fileNames) => {
  fileNames.forEach(fileName => {

    if (fileName.indexOf('emoji_') === 0) {

      const newFileName = fileName.replace('emoji_', '').replace(/u/g, '').replace(/_/g, '-');

      fs.renameSync(`${trgFolder}/${fileName}`, `${trgFolder}/${newFileName}`);
      // console.log(newFileName)
    }

    // fs.renameSync
  });
})




