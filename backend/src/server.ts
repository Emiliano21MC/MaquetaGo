import {initializeDatabase} from './services/schemaService';
import { paymentRoutes } from './routes/payments';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { ZodError } from "zod";
import { env } from "./config/env";
import { pool } from "./config/db";
import { auth, HttpError } from "./http";
import { authRoutes } from "./routes/auth";
import { catalogRoutes } from "./routes/catalog";
import { tripRoutes } from "./routes/trips";
import { mapsRoutes } from './routes/maps';
export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
    origin: env.corsOrigins,
}));
app.use(express.json({ limit: "5mb" }));
app.use("/api", rateLimit({
    windowMs: 60000,
    limit: 150,
    standardHeaders: "draft-8",
    legacyHeaders: false,
}));
app.get("/api/health", async (_req, res) => {
    await pool.query("SELECT 1");
    res.json({
        ok: true,
        paymentMode: env.paymentMode,
        otpDelivery: env.otpDelivery,
    });
});
app.use("/api/auth", rateLimit({ windowMs: 60000, limit: 15, legacyHeaders: false }), authRoutes);
app.use("/api/payments", auth, paymentRoutes);
app.use("/api/maps", auth, mapsRoutes);
app.use("/api", auth, catalogRoutes);
app.use("/api/trips", auth, tripRoutes);
app.use((_req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
        res
            .status(400)
            .json({ error: error.issues[0]?.message || "Datos inválidos." });
        return;
    }
    if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message });
        return;
    }
    const code = (error as {
        code?: string;
    })?.code;
    if (code === "ECONNREFUSED" ||
        code === "ER_BAD_DB_ERROR" ||
        code === "ER_ACCESS_DENIED_ERROR") {
        res.status(503).json({ error: "La base de datos no está disponible." });
        return;
    }
    if (code === "ER_DUP_ENTRY") {
        res.status(409).json({ error: "La operación ya fue registrada." });
        return;
    }
    console.error("API error:", error instanceof Error ? error.message : "unknown");
    res.status(500).json({ error: "No pudimos completar la operación." });
});
async function startServer(){
    if(env.dbInitOnStart)await initializeDatabase();
    await pool.query("SELECT 1");
    const server = app.listen(env.port, env.host, () => console.log(`MaquetaGo API en puerto ${env.port}`));
    const close = () => server.close(() => {
        void pool.end().then(() => process.exit(0));
    });
    process.on("SIGTERM", close);
    process.on("SIGINT", close);
}

if(require.main===module)void startServer().catch(async error=>{console.error("No se pudo iniciar la API:",error.code||"",error.message);await pool.end();process.exitCode=1;});
