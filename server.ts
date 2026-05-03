import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Helper to get Catapult Base URL (defaulting to Openfield US region)
  const getCatapultBaseUrl = (regionOverride?: string) => {
    const region = regionOverride || process.env.CATAPULT_REGION || 'us';
    // Variation 1: Regional subdomain (most common for Openfield Cloud)
    if (region === 'global') return `https://api.catapultsports.com/api/v1`;
    return `https://${region}.openfield.catapultsports.com/api/v1`;
  };

  // API Routes for Catapult Integration
  app.get("/api/catapult/test", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Catapult Proxy is running",
      region: process.env.CATAPULT_REGION || 'default (us)',
      baseUrl: getCatapultBaseUrl()
    });
  });

  // Proxy for activities
  app.get("/api/catapult/activities", async (req, res) => {
    const token = process.env.CATAPULT_API_TOKEN;
    if (!token) {
      return res.status(500).json({ error: "CATAPULT_API_TOKEN not configured in secrets" });
    }

    // List of possible Cloud regions for OpenField
    const baseUrls = [
      "https://api.catapultsports.com/api/v1",         // Global / Newer accounts
      "https://us.openfield.catapultsports.com/api/v1", // US (Common for LATAM)
      "https://eu.openfield.catapultsports.com/api/v1", // Europe
      "https://au.openfield.catapultsports.com/api/v1", // Asia Pacific / Australia
      "https://us-east-1.openfield.catapultsports.com/api/v1" // Specific US region
    ];

    const authMethods = [
      (t: string) => ({ 'Authorization': `Bearer ${t}` }),
      (t: string) => ({ 'X-API-Key': t }),
      (t: string) => ({ 'Access-Token': t })
    ];

    let lastError = null;

    for (const baseUrl of baseUrls) {
      const url = `${baseUrl}/activities`;
      for (const getHeaders of authMethods) {
        try {
          console.log(`Probando Catapult: ${url} con método auth...`);
          const response = await axios.get(url, {
            headers: {
              ...getHeaders(token),
              'Accept': 'application/json'
            },
            params: req.query,
            timeout: 5000
          });

          // Verificamos que sea JSON real
          const contentType = String(response.headers['content-type'] || '');
          if (response.status === 200 && contentType.includes('application/json')) {
            console.log(`¡Conectado exitosamente! URL: ${url}`);
            return res.json(response.data);
          }
        } catch (error: any) {
          lastError = error.response?.data || error.message;
        }
      }
    }

    res.status(401).json({ 
      error: "No se pudo autenticar con Catapult.",
      details: "Se probaron múltiples regiones y métodos. Por favor verifica que el Token en Secrets sea el 'API Token' generado en OpenField Cloud (Settings -> User -> API Tokens)."
    });
  });

  const tryFetchGeneric = async (url: string, params: any = {}) => {
    const token = process.env.CATAPULT_API_TOKEN;
    if (!token) throw new Error("CATAPULT_API_TOKEN not configured");

    const attempts = [
      { headers: { 'Authorization': `Bearer ${token}` } },
      { headers: { 'X-API-Key': token } }
    ];

    for (const config of attempts) {
      try {
        const res = await axios.get(url, {
          headers: { ...config.headers, 'Accept': 'application/json' },
          params,
          timeout: 8000
        });
        const contentType = String(res.headers['content-type'] || '');
        if (contentType.includes('text/html')) continue;
        return res;
      } catch (e) {
        continue;
      }
    }
    throw new Error(`Failed to fetch from ${url} with available auth methods`);
  };

  // Proxy for specific activity data
  app.get("/api/catapult/activities/:id", async (req, res) => {
    const { id } = req.params;
    const baseUrls = [
      `https://api.catapultsports.com/api/v1`,
      `https://us.openfield.catapultsports.com/api/v1`,
      `https://eu.openfield.catapultsports.com/api/v1`,
      `https://au.openfield.catapultsports.com/api/v1`,
    ];

    for (const baseUrl of baseUrls) {
      try {
        const response = await tryFetchGeneric(`${baseUrl}/activities/${id}`);
        return res.json(response.data);
      } catch (e) {}
    }
    res.status(404).json({ error: "Activity not found in any region" });
  });

  // Proxy for activity stats
  app.get("/api/catapult/activities/:id/stats", async (req, res) => {
    const { id } = req.params;
    const baseUrls = [
      `https://api.catapultsports.com/api/v1`,
      `https://us.openfield.catapultsports.com/api/v1`,
      `https://eu.openfield.catapultsports.com/api/v1`,
      `https://au.openfield.catapultsports.com/api/v1`,
    ];

    for (const baseUrl of baseUrls) {
      try {
        const response = await tryFetchGeneric(`${baseUrl}/activities/${id}/stats`);
        return res.json(response.data);
      } catch (e) {}
    }
    res.status(404).json({ error: "Stats not found in any region" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
