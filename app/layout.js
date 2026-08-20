import "./globals.css";
import Sidebar from "../components/Sidebar";

export const metadata = {
  title: "Fieldnote — Social Campaign Studio",
  description: "AI-assisted social media campaign planning.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          <Sidebar />
          <main style={{ flex: 1, padding: "30px 40px", maxWidth: 1100 }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
