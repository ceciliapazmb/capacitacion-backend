const https = require("https");

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0xjrL285ZyqXuZyl0OffROKWbp-ZVOqaolyDJ9cTLc22NQLTT0d9waWKMLVMNdOI/exec";

function fetchGoogle(url) {
  return new Promise((resolve, reject) => {
    const makeRequest = (url) => {
      https.get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          makeRequest(res.headers.location);
          return;
        }
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch(e) { reject(e); }
        });
      }).on("error", reject);
    };
    makeRequest(url);
  });
}

function postGoogle(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    };
    const makeRequest = (url) => {
      const urlObj = new URL(url);
      const reqOptions = {
        ...options,
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
      };
      const req = https.request(reqOptions, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          makeRequest(res.headers.location);
          return;
        }
        let resData = "";
        res.on("data", chunk => resData += chunk);
        res.on("end", () => {
          try { resolve(JSON.parse(resData)); }
          catch(e) { reject(e); }
        });
      });
      req.on("error", reject);
      req.write(data);
      req.end();
    };
    makeRequest(url);
  });
}

const server = require("http").createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/cupos") {
    try {
      const data = await fetchGoogle(SCRIPT_URL + "?action=getAll");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, msg: "Error al obtener cupos" }));
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/inscribir") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const payload = JSON.parse(body);
        const data = await postGoogle(SCRIPT_URL, {
          action: "inscribir",
          nombre: payload.nombre,
          sesion: payload.sesion
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, msg: "Error al inscribir" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Servidor corriendo en puerto " + PORT));
