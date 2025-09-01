import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MusicProvider } from "./components/music";

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
        <MusicProvider>{children}</MusicProvider>
      </body>
    </html>
  );
}
