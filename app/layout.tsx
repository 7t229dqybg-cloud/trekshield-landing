import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrekShield Wax - Sáp bảo vệ đồ trekking",
  description:
    "TrekShield Wax giúp bảo vệ balô, quần áo, giày vải và đồ trekking với Premium Wax và Super Wax.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}