// src/App.tsx
import AppRoutes from "./routes/AppRoutes";
import { AppProvider } from "./context/AppContext"; 
import { I18nProvider } from "./context/I18nContext";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <AppRoutes />
        <Toaster position="top-right" />
      </AppProvider>
    </I18nProvider>
  );
}

export default App;
