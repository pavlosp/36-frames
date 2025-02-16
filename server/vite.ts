import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";
import { logger } from "./logger";

const viteLogger = createLogger();

export async function setupVite(app: Express, server: Server) {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    // ---------------- DEVELOPMENT MODE ----------------
    logger.info("Initializing Vite dev middleware...");


  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*name", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/entry-client.tsx"`, `src="/src/entry-client.tsx?v=${nanoid()}"`)
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  } else {
    // ---------------- PRODUCTION MODE (SSR) ----------------
    logger.info("Initializing production SSR...");

    const distDir = path.resolve(__dirname, "..", "dist");
    const clientDir = path.join(distDir, "client");
    const serverDir = path.join(distDir, "server");

    // Load your SSR bundle, exporting a `render(url)` function
    let render: (url: string) => Promise<string> | string;
    try {
      const serverEntryPath = path.join(serverDir, "entry-server.js");
      ({ render } = await import(serverEntryPath));
      logger.info("SSR bundle loaded successfully");
    } catch (error) {
      logger.error("Could not load SSR bundle", { error });
      throw new Error(
        "Could not load SSR bundle. Make sure you have a valid server build."
      );
    }

    // Serve static files (JS, CSS, images) from client build
    app.use(
      "/assets",
      express.static(path.join(clientDir, "assets"), {
        index: false,
      })
    );

    // Catch-all handler for SSR
    app.use("*name", async (req, res, next) => {
      try {
        const url = req.originalUrl;

        // Pre-built index.html (contains <!--app-html--> placeholder)
        const indexFile = path.join(clientDir, "index.html");
        let template = await fs.promises.readFile(indexFile, "utf-8");

        // Render the app with your SSR function
        const appHtml = await render(url);

        // Inject the SSR-generated HTML into the template
        const html = template.replace("<!--app-html-->", appHtml);

        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (err) {
        next(err);
      }
    });
  }

}

