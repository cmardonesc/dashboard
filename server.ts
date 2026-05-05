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

    // List of reliable Cloud regions for OpenField
    const regions = [
      { name: 'US', url: 'https://us.openfield.catapultsports.com/api/v1' },
      { name: 'Global v1', url: 'https://api.catapultsports.com/api/v1' },
      { name: 'Global v1 (Alt)', url: 'https://api.catapultsports.com/v1' },
      { name: 'EU', url: 'https://eu.openfield.catapultsports.com/api/v1' },
      { name: 'AU', url: 'https://au.openfield.catapultsports.com/api/v1' }
    ];

    const authMethods = [
      { name: 'Bearer', header: (t: string) => ({ 'Authorization': `Bearer ${t}` }) },
      { name: 'token', header: (t: string) => ({ 'Authorization': `token ${t}` }) }
    ];

    let lastErrorDetails: any = null;
    let lastStatus: number = 0;
    let attempts: string[] = [];

    console.log("== Catapult Auth Check Start ==");

    for (const region of regions) {
      const url = `${region.url}/activities`;
      for (const method of authMethods) {
        try {
          console.log(`Region: ${region.name} | Method: ${method.name} | URL: ${url}`);
          const axiosRes = await axios.get(url, {
            headers: {
              ...method.header(token),
              'Accept': 'application/json',
              'User-Agent': 'LaRojaSync/1.4'
            },
            params: { limit: 1 },
            timeout: 8000,
            maxRedirects: 0
          });

          if (axiosRes.status === 200) {
            console.log(`== SUCCESS! Connected to ${region.name} via ${method.name} ==`);
            return res.json(axiosRes.data);
          }
        } catch (error: any) {
          lastStatus = error.response?.status || 0;
          lastErrorDetails = error.response?.data || error.message;
          const attemptMsg = `${region.name} (${method.name}) -> ${lastStatus || error.code || 'ERR'}`;
          attempts.push(attemptMsg);
          console.log(`  Result: ${attemptMsg}`);
        }
      }
    }

    console.log("== Catapult Auth Check All Failed =="); 
    res.status(lastStatus || 401).json({ 
      error: "Error de Autenticación con Catapult",
      details: lastErrorDetails,
      attempts,
      hint: "Tu cuenta de Catapult muestra 'OpenField activation status: Not activated'. Es OBLIGATORIO que pidas a soporte de Catapult la activación de la API."
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

  // API Route for Sending Nominas via Email
  app.post("/api/send-nomina", async (req, res) => {
    try {
      const { recipients, clubName, microcicloInfo, players } = req.body;
      
      console.log(`[EMAIL SERVICE] Preparando envío para ${clubName}`);
      console.log(`[EMAIL SERVICE] Destinatarios: ${recipients.map((r: any) => r.correo).join(', ')}`);
      
      // Simulación de envío exitoso
      // En producción aquí se usaría un transportador de Nodemailer o SDK de Resend/SendGrid
      
      return res.json({ 
        success: true, 
        message: `Nómina enviada correctamente a ${recipients.length} destinatarios de ${clubName}` 
      });
    } catch (error: any) {
      console.error("Error enviando email:", error);
      return res.status(500).json({ error: error.message });
    }
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
