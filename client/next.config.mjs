/** @type {import('next').NextConfig} */
const nextConfig = {
	distDir: process.env.NEXT_DIST_DIR || ".next",
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "*.googleusercontent.com" },
			{ protocol: "https", hostname: "firebasestorage.googleapis.com" },
			{ protocol: "http", hostname: "127.0.0.1", port: "44199" },
		],
	},
};

if (process.env.NODE_ENV === "production") {
	const requiredVariables = [
		"NEXT_PUBLIC_API_BASE_URL",
		"NEXT_PUBLIC_FIREBASE_API_KEY",
		"NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
		"NEXT_PUBLIC_FIREBASE_PROJECT_ID",
		"NEXT_PUBLIC_FIREBASE_APP_ID",
	];
	const missingVariables = requiredVariables.filter((name) => !process.env[name]);
	if (missingVariables.length > 0) {
		throw new Error(`Missing production environment variables: ${missingVariables.join(", ")}`);
	}
	if (process.env.NEXT_PUBLIC_ENABLE_AVATAR_UPLOAD === "true"
		&& !process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) {
		throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required when avatar uploads are enabled");
	}
}

export default nextConfig;
