// src/App.tsx
import AppRoutes from "./routes/AppRoutes";
import { AppProvider } from "./context/AppContext"; 
import { I18nProvider } from "./context/I18nContext";

function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </I18nProvider>
  );
}

export default App;
