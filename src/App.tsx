import { useEffect } from "react";
import Routers from "@routes/Routers";
import { db } from "../src/db/index";
import { CurrencyProvider } from "@components/Currency";

const App = () => {
  useEffect(() => {
    const pruneExpiredCache = async () => {
      const now = Date.now();
      await db.cache.where("expiresAt").below(now).delete();
    };
    pruneExpiredCache();

    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant?.color_scheme?.primary) {
      document.documentElement.style.setProperty('--primary-color', tenant.color_scheme.primary);
    }
  }, []);

  return (
    <CurrencyProvider>
      <Routers />
    </CurrencyProvider>
  );
};

export default App;