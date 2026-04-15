import "./globals.css";

import { Geist, Geist_Mono } from "next/font/google";

import type { Metadata } from "next";
import Header from "@/components/Header";
import React from "react";
import { RulesStoreProvider } from "@/context/providers/rules-store-provider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "SpendGate – Investec Rule Engine",
    description: "No-code rule engine for Investec programmable cards",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <main className="min-h-screen bg-slate-50">
                    <Header />
                    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
                        <RulesStoreProvider>{children}</RulesStoreProvider>
                    </div>
                </main>
            </body>
        </html>
    );
}
