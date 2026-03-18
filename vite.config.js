import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				name: "LudoBattle",
				short_name: "LudoBattle",
				description: "1v1 Real Money Ludo Battles",
				theme_color: "#0D0D0D",
				background_color: "#0D0D0D",
				display: "standalone",
				icons: [
					{
						src: "/icon-192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/icon-512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
		}),
	],
	server: {
		open: true,
	},
});
