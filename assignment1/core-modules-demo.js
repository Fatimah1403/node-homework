const os = require('os');
const path = require('path');
const fs = require('fs');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}

// OS module
console.log('Platform:', os.platform());
console.log('CPU:', os.cpus()[0].model);
console.log('Total Memory:', os.totalmem());

// Path module
const joinedPath = path.join(sampleFilesDir, 'folder', 'file.txt');
console.log('Joined path:', joinedPath);
// fs.promises API
const demoFilePath = path.join(sampleFilesDir, 'demo.txt');

async function demonstrateFsPromises() {
  try {
    await fs.promises.writeFile(
      demoFilePath,
      'Hello from fs.promises!',
      'utf8'
    );

    const content = await fs.promises.readFile(demoFilePath, 'utf8');
    console.log('fs.promises read:', content);
  } catch (err) {
    console.log('File operation failed:', err.message);
  }
}

demonstrateFsPromises();


// Streams for large files- log first 40 chars of each chunk
const largeFilePath = path.join(sampleFilesDir, 'largefile.txt');

const lines = [];
for (let i = 1; i <= 100; i++) {
  lines.push(`This is line ${i} of the large file`);
}
fs.writeFileSync(largeFilePath, lines.join('\n'), 'utf8');

const readStream = fs.createReadStream(largeFilePath, {
  encoding: 'utf8',
  highWaterMark: 1024, // Read in chunks of 1024 bytes
})

readStream.on('data', (chunk) => {
  console.log('Read chunk:', chunk.slice(0, 40));
});

readStream.on('end', () => {
  console.log('Finished reading large file with streams.');
});

readStream.on('error', (err) => {
    console.error('Stream error:', err);
});
