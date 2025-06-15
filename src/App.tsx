import { useEffect } from "react";
import Routers from "@routes/Routers";

const App = () => {
  useEffect(() => {
    // Service Worker Registration
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
          console.log('ServiceWorker registered with scope:', registration.scope);
        }).catch((error) => {
          console.error('ServiceWorker registration failed:', error);
        });
      });

      // Reload when a new service worker takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload(); // Reload when a new SW takes control
      });
    }

    // Set primary color based on tenant settings
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
