import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
    const port = parseInt(process.env.SMTP_PORT || '465');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("[MAIL] SMTP_USER or SMTP_PASS not configured.");
      return null;
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
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

  // TEST CONNECTION
  app.get("/api/catapult/test", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Catapult Proxy is running",
      endpoint: "bakestatus (CloudBaker API)"
    });
  });

  // ✅ ACTIVITIES ENDPOINT - bakestatus con filtros flexibles
  app.get("/api/catapult/activities", async (req, res) => {
    const token = process.env.CATAPULT_API_TOKEN?.trim();
    if (!token) {
      return res.status(500).json({ 
        success: false,
        error: "CATAPULT_API_TOKEN not configured" 
      });
    }

    console.log("\n========================================");
    console.log("📡 CATAPULT BAKESTATUS REQUEST");
    console.log("========================================");
    console.log(`Token length: ${token.length}`);
    console.log(`Query params:`, JSON.stringify(req.query));

    try {
      // Calcular rango de fechas (default: 30 días hacia atrás)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (30 * 24 * 60 * 60 * 1000));

      // Permitir override desde query params
      let finalStartTime = startTime;
      let finalEndTime = endTime;

      // Intentar múltiples nombres de parámetros para flexibilidad
      const startParam = req.query.start_time_after 
        || req.query.startTime 
        || req.query.StartTime
        || req.query.from
        || req.query.since;

      const endParam = req.query.end_time_before 
        || req.query.endTime 
        || req.query.EndTime
        || req.query.to
        || req.query.until;

      if (startParam) {
        const parsed = new Date(String(startParam));
        if (!isNaN(parsed.getTime())) {
          finalStartTime = parsed;
          console.log(`📅 Custom start time from params: ${finalStartTime.toISOString()}`);
        }
      }

      if (endParam) {
        const parsed = new Date(String(endParam));
        if (!isNaN(parsed.getTime())) {
          finalEndTime = parsed;
          console.log(`📅 Custom end time from params: ${finalEndTime.toISOString()}`);
        }
      }

      console.log(`📊 Time range: ${finalStartTime.toISOString()} → ${finalEndTime.toISOString()}`);

      // CONSTRUIR URLS POSIBLES
      const baseUrl = 'https://of-prod-uw1-cloudbaker-api.openfield.catapultsports.com';
      
      // Intentamos primero el endpoint de actividades estándar
      const endpoints = ['/api/activity', '/api/activity/bakestatus'];
      let activities: any[] = [];
      let successEndpoint = '';

      for (const endpoint of endpoints) {
        try {
          const url = `${baseUrl}${endpoint}`;
          console.log(`🔗 Attempting: ${url}`);
          
          const params: any = {
            StartTime: finalStartTime.toISOString(),
            EndTime: finalEndTime.toISOString()
          };

          // Para bakestatus a veces no se necesitan params o son distintos
          const axiosRes = await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'User-Agent': 'LaRojaSync/2.0'
            },
            params,
            timeout: 10000
          });

          let data = axiosRes.data;
          let currentActivities = [];

          if (Array.isArray(data)) {
            currentActivities = data;
          } else if (data.data && Array.isArray(data.data)) {
            currentActivities = data.data;
          } else if (data.activities && Array.isArray(data.activities)) {
            currentActivities = data.activities;
          } else if (data.results && Array.isArray(data.results)) {
            currentActivities = data.results;
          }

          if (currentActivities.length > 0) {
            activities = currentActivities;
            successEndpoint = url;
            console.log(`✅ Success with: ${endpoint} (${activities.length} items)`);
            break; 
          }
        } catch (e: any) {
          console.log(`❌ Failed: ${endpoint} - ${e.message}`);
        }
      }

      console.log(`📈 Final total activities: ${activities.length}`);
      
      if (activities.length > 0) {
        console.log(`📋 Raw Sample Activity (first 1000 chars):`, JSON.stringify(activities[0]).substring(0, 1000));
        console.log(`📋 Sample activity keys:`, Object.keys(activities[0]));
        
        const sampleId = activities[0].id || activities[0].Identifier || activities[0].activity_id || activities[0].ExternalId;
        const sampleName = activities[0].name || activities[0].Name || activities[0].SessionName || activities[0].IdentifierName;
        const sampleStatus = activities[0].bakestatus || activities[0].Bakestatus || activities[0].status || activities[0].Status;
        
        console.log(`📋 Sample ID: ${sampleId}, Name: ${sampleName}, Status: ${sampleStatus}`);
      }

      console.log("========================================\n");

      return res.json({
        success: true,
        activities,
        metadata: {
          source: 'CloudBaker API',
          endpoint: successEndpoint,
          totalCount: activities.length,
          timeRange: {
            start: finalStartTime.toISOString(),
            end: finalEndTime.toISOString()
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.log(`\n❌ ERROR`);
      console.log(`Status: ${error.response?.status}`);
      console.log(`Message: ${error.message}`);
      
      const errorData = error.response?.data;
      if (errorData) {
        console.log(`Response:`, JSON.stringify(errorData).substring(0, 500));
      }
      console.log("========================================\n");

      return res.status(error.response?.status || 500).json({
        success: false,
        error: "Error fetching from bakestatus endpoint",
        details: {
          status: error.response?.status,
          message: error.message,
          data: errorData
        },
        hint: "Verifica que el token sea válido. Si sigue fallando, contacta a Catapult Support."
      });
    }
  });

  // ACTIVITY DETAIL
  app.get("/api/catapult/activities/:id", async (req, res) => {
    const { id } = req.params;
    const token = process.env.CATAPULT_API_TOKEN?.trim();
    
    if (!token) {
      return res.status(500).json({ error: "Token not configured" });
    }

    try {
      console.log(`\n🔍 Fetching activity detail: ${id}`);
      
      const url = `https://of-prod-uw1-cloudbaker-api.openfield.catapultsports.com/api/activity/${id}`;
      
      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });

      console.log(`✅ Activity detail fetched successfully`);
      return res.json(response.data);
    } catch (e: any) {
      console.log(`❌ Activity detail fetch failed: ${e.message}`);
      res.status(404).json({ 
        success: false,
        error: "Activity not found" 
      });
    }
  });

  // ACTIVITY STATS
  app.get("/api/catapult/activities/:id/stats", async (req, res) => {
    const { id } = req.params;
    const token = process.env.CATAPULT_API_TOKEN?.trim();
    
    if (!token) {
      return res.status(500).json({ error: "Token not configured" });
    }

    try {
      console.log(`\n📊 [CATAPULT] Fetching stats for ID: ${id}`);
      
      const baseUrl = 'https://of-prod-uw1-cloudbaker-api.openfield.catapultsports.com';
      const url = `${baseUrl}/api/activity/${id}/stats`;
      
      console.log(`🔗 Requesting URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log(`✅ [CATAPULT] Stats fetched successfully for ${id}`);
      return res.json(response.data);
    } catch (e: any) {
      console.log(`❌ [CATAPULT] Stats fetch failed for ${id}`);
      console.log(`   Message: ${e.message}`);
      if (e.response) {
        console.log(`   Status: ${e.response.status}`);
        console.log(`   Data:`, JSON.stringify(e.response.data));
      }
      
      res.status(e.response?.status || 404).json({ 
        success: false,
        error: e.response?.data?.error || "Stats not found",
        details: e.response?.data
      });
    }
  });

  // SEND NOMINA EMAIL
  app.post("/api/send-nomina", async (req, res) => {
    try {
      const { recipients, clubName, microcicloInfo, players, attachment } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: "No recipients provided" });
      }

      console.log(`\n📧 [EMAIL] Sending nomina to ${recipients.length} recipients for ${clubName}`);
      
      const mailTransporter = getTransporter();
      if (!mailTransporter) {
        return res.status(503).json({ error: "Email service not configured" });
      }

      const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
      const fromName = process.env.SMTP_FROM_NAME || "La Roja Performance";

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
                  <p>Por intermendio de la presente, se comunica oficialmente la citación de los siguientes jugadores:</p>
                  <ul style="background-color: #f8fafc; padding: 20px 40px; border-radius: 8px; list-style-type: none;">
                    ${playerListHtml}
                  </ul>
                  <p>Para participar en el <b>${microcicloInfo.type}</b> desde ${microcicloInfo.start_date} hasta ${microcicloInfo.end_date} en ${microcicloInfo.city}.</p>
                  <p>Se adjunta la citación oficial en PDF.</p>
                </div>
                <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0;">
                  <p>© 2026 CMSPORTECH.COM | La Roja Performance</p>
                </div>
              </div>
            `
          };

          if (attachment && attachment.content) {
            mailOptions.attachments = [{
              filename: attachment.filename || 'Citacion.pdf',
              content: attachment.content,
              encoding: 'base64'
            }];
          }

          const info = await mailTransporter.sendMail(mailOptions);
          console.log(`   ✅ Sent to ${recipient.correo}`);
          return info;
        } catch (sendError: any) {
          console.error(`   ❌ Failed to ${recipient.correo}: ${sendError.message}`);
          throw sendError;
        }
      });

      await Promise.all(sendPromises);
      
      console.log(`✅ All emails sent successfully\n`);
      return res.json({ 
        success: true, 
        message: `Sent to ${recipients.length} recipients` 
      });
    } catch (error: any) {
      console.error("[EMAIL] Error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // VITE MIDDLEWARE
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
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ Catapult Proxy ready`);
    console.log(`📡 Endpoint: CloudBaker API (bakestatus)`);
    console.log(`🔑 Token: ${process.env.CATAPULT_API_TOKEN ? '✅ Configured' : '❌ Missing'}\n`);
  });
}

startServer();