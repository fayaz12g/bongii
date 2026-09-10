import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MusicProvider } from "./components/music";
import { BackgroundProvider } from "./components/context";
import { AuthProvider } from "./components/authContext";
import ReadinessStatus from "./components/readinessStatus";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Bongii",
  description: "Yippee",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <MusicProvider>
            <BackgroundProvider>
              <ReadinessStatus />
              {children}
            </BackgroundProvider>
          </MusicProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
