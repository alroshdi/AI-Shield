import { Route, HashRouter as Router, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LanguageProvider } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { Audit } from "./pages/Audit";
import { Corpus } from "./pages/Corpus";
import { Dashboard } from "./pages/Dashboard";
import { FindingDetail } from "./pages/FindingDetail";
import { ScanDetail } from "./pages/ScanDetail";
import { Scans } from "./pages/Scans";
import { Targets } from "./pages/Targets";

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/scans" element={<Scans />} />
              <Route path="/scans/:scanId" element={<ScanDetail />} />
              <Route path="/scans/:scanId/findings/:attackId" element={<FindingDetail />} />
              <Route path="/targets" element={<Targets />} />
              <Route path="/corpus" element={<Corpus />} />
              <Route path="/audit" element={<Audit />} />
            </Route>
          </Routes>
        </Router>
      </LanguageProvider>
    </ThemeProvider>
  );
}
