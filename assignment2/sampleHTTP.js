
const http = require("http");

// HTML page for the /timePage route
const htmlString = `
<!DOCTYPE html>
<html>
<body>
<h1>Clock</h1>
<button id="getTimeBtn">Get the Time</button>
<p id="time"></p>
<script>
document.getElementById('getTimeBtn').addEventListener('click', async () => {
  const res = await fetch('/time');
  const timeObj = await res.json();
  console.log(timeObj);
  const timeP = document.getElementById('time');
  timeP.textContent = timeObj.time;
});
</script>
</body>
</html>
`;

// Create the HTTP server
const server = http.createServer((req, res) => {
  // Task 2: GET /time
  if (req.method === "GET" && req.url === "/time") {
    res.writeHead(200, { "Content-Type": "application/json" });

    res.end(
      JSON.stringify({
        time: new Date().toString(),
      }),
    );

  // Task 2: GET /timePage
  } else if (req.method === "GET" && req.url === "/timePage") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(htmlString);

  // Task 3: POST /echo
  } else if (req.method === "POST" && req.url === "/echo") {
    let body = "";

    // Collect incoming data chunks
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const parsedBody = JSON.parse(body);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            weReceived: parsedBody,
          })
        );
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            message: "Invalid JSON.",
          })
        );
      }
    });

    // Process the complete request body
    req.on("end", () => {
      const parsedBody = JSON.parse(body);

      res.writeHead(200, { "Content-Type": "application/json" });

      res.end(
        JSON.stringify({
          weReceived: parsedBody,
        }),
      );
    });

  // Optional Task 6: Handle unknown routes
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });

    res.end(
      JSON.stringify({
        message: "That route is not available.",
      }),
    );
  }
});

// Start the server on port 8000
server.listen(8000, () => {
  console.log("Server is running on http://localhost:8000");
});
