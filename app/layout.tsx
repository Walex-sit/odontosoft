import type { Metadata } from "next";
import { Poppins, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { ThemeProvider } from "./components/ThemeProvider";
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OdontoSoft — Gestão Odontológica Premium",
  description: "A nova geração da gestão odontológica. Software médico premium para clínicas que exigem velocidade, elegância e confiabilidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} ${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="w-full min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-200">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Toaster theme="system" position="bottom-right" richColors />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
