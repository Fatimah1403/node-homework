# Node.js Fundamentals

## What is Node.js?
Node js is a runtime environment that allows javascript to run outside of browser , that is it run omn computer or a server.
It is built on Chrome's V8 engine and uses event driven, non-blocking I/O model, which makes it well-suited for building fast, scalable server-side application

## How does Node.js differ from running JavaScript in the browser?
In the browser, Javascript interacts with the DOM, handles user events and has access to browser APIS like `window`, `document` and `localStorage`.
Node.js has noneof those , instead it gives acess to file system, network, operating system, and a server capabilities. Node also provides global objects like 
`process`, `__dirname`, and `__filename` that do not exist in the browser.

## What is the V8 engine, and how does Node use it?
V8 is the JavaScript engine developed by Google and used inside Chrome. It compiles JavaScript directly to machine code, which makes it very fast. Node.js uses V8 under the hood to execute JavaScript on the server — the same engine that runs JS in the browser, but without the browser around it.
.

## What are some key use cases for Node.js?
- Building RESTful APIs and backend servers
- Real-time applications (chat apps, collaborative tools) using WebSockets
- Command-line tools and scripts
- Streaming data (video, audio, file uploads)
- Microservices architectures

## Explain the difference between CommonJS and ES Modules. Give a code example of each.
**CommonJS** is the original Node.js module system. It uses `require()` to import and `module.exports` to export. It loads modules synchronously.


**CommonJS (default in Node.js):**
```js
// Answer here..
// commonJS - math.js
function add(a, b) {
    return a + b;
}

module.export = { add };

// commonJSn- api.js
const { add } = require('./math);
console.log(add(2, 3));  // 5
```

**ES Modules (supported in modern Node.js):**
```js
// Answer here..
**ES Modules** is the modern JavaScript standard (also used in browsers). It uses `import` and `export`. In Node.js, you either use `.mjs` files or set `"type": "module"` in `package.json`.

// ES Modules — math.js
export function add(a, b) {
  return a + b;
}

// ES Modules — app.js
import { add } from './math.js';
console.log(add(2, 3)); // 5

``` 
The key difference: CommonJS is synchronous and uses `require/module.exports`; ES Modules are asynchronous and use `import/export`. CommonJS is still common in Node.js projects, but ES Modules is the modern standard going forward.