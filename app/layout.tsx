import type { Metadata } from "next";
import { Poppins, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

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
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8F9FA] text-slate-800">
        <Toaster theme="light" position="bottom-right" richColors />
        {children}
      </body>
    </html>
  );
}
