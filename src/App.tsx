import { useEffect } from "react";
import Routers from "@routes/Routers";
import { db } from "../src/db/index";

const App = () => {
  useEffect(() => {
    const pruneExpiredCache = async () => {
      const now = Date.now();
      await db.cache.where("expiresAt").below(now).delete();
    };
    pruneExpiredCache();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          console.log('ServiceWorker registered with scope:', registration.scope);
        }).catch((error) => {
          console.error('ServiceWorker registration failed:', error);
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    const storedTenant = localStorage.getItem("tenant");
    const tenant = storedTenant ? JSON.parse(storedTenant) : null;
    if (tenant && tenant.color_scheme.primary) {
      document.documentElement.style.setProperty('--primary-color', tenant.color_scheme.primary);
    }
  }, []);

  return (
    <>
      <Routers />
    </>
  );
};

export default App;