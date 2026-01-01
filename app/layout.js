import "./globals.css";
import RoleShell from "./role-shell";

export const metadata = {
  title: "Worksite Secure",
  description:
    "Worksite Secure — Pilotage de la sécurité des chantiers en temps réel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <RoleShell>{children}</RoleShell>
      </body>
    </html>
  );
}
