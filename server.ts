import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization for Nodemailer transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("[MAIL] SMTP_USER or SMTP_PASS not configured. Emails will not be sent.");
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: { user, pass },
    });
  }
  return transporter;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
      const { recipients, clubName, microcicloInfo, players, attachment } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron destinatarios válidos." });
      }

      console.log(`[EMAIL SERVICE] Preparando envío para ${clubName} a ${recipients.length} destinatarios`);
      
      const mailTransporter = getTransporter();
      if (!mailTransporter) {
        return res.status(503).json({ 
          error: "Servicio de correo no configurado. Por favor configure SMTP_USER y SMTP_PASS en las variables de entorno." 
        });
      }

      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
      const fromName = process.env.SMTP_FROM_NAME || "La Roja Performance";

      // Enviar correos a cada destinatario
      const sendPromises = recipients.map(async (recipient: any) => {
        try {
          const playerListHtml = players
            .map((p: any) => `<li><b>${p.name}</b> (${p.position})</li>`)
            .join("");

          const mailOptions: any = {
            from: `"${fromName}" <${fromEmail}>`,
            to: recipient.correo,
            subject: `Convocatoria Selección Nacional - ${clubName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #0b1220; padding: 30px; text-align: center; color: white;">
                  <h1 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">CITACIÓN OFICIAL</h1>
                  <p style="color: #CF1B2B; margin: 5px 0 0; font-size: 10px; font-weight: 900; letter-spacing: 0.2em;">LA ROJA PERFORMANCE HUB</p>
                </div>
                <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
                  <p>Estimado(a) <b>${recipient.nombres || recipient.presidente || 'Encargado'}</b>,</p>
                  <p>Por intermendio de la presente, se comunica oficialmente la citación de los siguientes jugadores de sus registros:</p>
                  <ul style="background-color: #f8fafc; padding: 20px 40px; border-radius: 8px; list-style-type: none;">
                    ${playerListHtml}
                  </ul>
                  <p>Para participar en el <b>${microcicloInfo.type}</b> que se llevará a cabo desde el <b>${microcicloInfo.start_date}</b> hasta el <b>${microcicloInfo.end_date}</b> en la ciudad de ${microcicloInfo.city}.</p>
                  <p>Se adjunta la carta formal de citación en formato PDF.</p>
                  <p style="margin-top: 30px; font-size: 13px;">Favor confirmar recepción y disponibilidad de los atletas.</p>
                  <p style="margin-top: 20px; font-size: 11px; color: #64748b;">Este es un envío automático desde La Roja Performance Hub.</p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0;">
                  <p>© 2026 CMSPORTECH.COM | Centro de Inteligencia Deportiva</p>
                </div>
              </div>
            `
          };

          if (attachment && attachment.content) {
            mailOptions.attachments = [
              {
                filename: attachment.filename || 'Citacion.pdf',
                content: attachment.content,
                encoding: 'base64'
              }
            ];
          }

          console.log(`[MAIL] Intentando enviar a: ${recipient.correo}`);
          const info = await mailTransporter.sendMail(mailOptions);
          console.log(`[MAIL] Enviado con éxito a ${recipient.correo}:`, info.messageId);
          return info;
        } catch (sendError: any) {
          console.error(`[MAIL] Error enviando a ${recipient.correo}:`, sendError);
          throw new Error(`Error al enviar a ${recipient.correo}: ${sendError.message}`);
        }
      });

      await Promise.all(sendPromises);
      
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
