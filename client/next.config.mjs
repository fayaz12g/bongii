/** @type {import('next').NextConfig} */
const nextConfig = {};

if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_BASE_URL) {
	throw new Error(
		"NEXT_PUBLIC_API_BASE_URL is required for production builds (for example, https://bongii.fly.dev)",
	);
}

export default nextConfig;
