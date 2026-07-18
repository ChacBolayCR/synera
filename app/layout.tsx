import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SYNERA | Business Operations Platform", description: "Plataforma administrativa y analítica para comercios." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
