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
console.log('Current working directory:', process.cwd());
console.log('Path separator:', path.sep);

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
