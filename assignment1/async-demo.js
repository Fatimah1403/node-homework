const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'sample-files', 'sample.txt');
const fileContent = 'Hello, async world!';

// Write a sample file for demonstration
fs.writeFileSync(filePath, fileContent, 'utf8')

// 1. Callback style
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.log('Callback error:', err.message);
    return;
  }
  console.log('Callback:', data);})


  // Callback hell example (test and leave it in comments):
  // fs.readFile(filePath, 'utf8', (err, data) => {
    //   fs.writeFile('out1.txt', data, (err) => {
    //     fs.readFile('out1.txt', 'utf8', (err, data2) => {
    //       fs.writeFile('out2.txt', data2, (err) => {
    //         This keeps going deeper and deeper — hard to read and maintain
    //         This is "callback hell" or the "pyramid of doom"
    //       });
    //     });
    //   });
    // });


  // 2. Promise style
  function readFilePromise(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    })
  }
  readFilePromise(filePath)
    .then((data) => {
      console.log('Promise:', data);
    })
    .catch((err) => {
      console.log('Promise error:', err.message);
    });

    // 3. Async/Await style
    async function readFileAsync(filePath) {
      try {
        const data = await readFilePromise(filePath);
        console.log('Async/Await:', data);
      } catch (err) {
        console.log('Async/Await error:', err.message);
      }
    }
    readFileAsync(filePath);
