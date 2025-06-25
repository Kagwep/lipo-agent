import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import viteCompression from "vite-plugin-compression";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const envDir = path.resolve(__dirname, "..");
    const env = loadEnv(mode, envDir, "");
    return {
        plugins: [
            react(),
            viteCompression({
                algorithm: "brotliCompress",
                ext: ".br",
                threshold: 1024,
            }),
        ],
        clearScreen: false,
        envDir,
        define: {
            "import.meta.env.VITE_SERVER_PORT": JSON.stringify(
                env.SERVER_PORT || "3000"
            ),
            "import.meta.env.VITE_SERVER_URL": JSON.stringify(
                env.SERVER_URL || "http://swell-agent-production.up.railway.app/"
            ),
            "import.meta.env.VITE_SERVER_BASE_URL": JSON.stringify(
                env.SERVER_BASE_URL
            )
        },
        build: {
            outDir: "dist",
            minify: true,
            cssMinify: true,
            sourcemap: false,
            cssCodeSplit: true,
        },
        resolve: {
            alias: {
                "@": "/src",
            },
        },
        server:{
            host:'0.0.0.0',
            port:5173,
            allowedHosts: [
                'swell-agent-production.up.railway.app',
                'localhost',
                '.up.railway.app' // Allows all Railway subdomains
                ],
            proxy: {
                '/api': {
                  target: 'http://swell-agent-production.up.railway.app',  // Your Droplet IP
                  changeOrigin: true,
                  rewrite: (path) => path.replace(/^\/api/, '')
                }
              }
        }
    };
});
