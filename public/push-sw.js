/* Push notifications for the POS web app.
 *
 * Loaded into the Workbox service worker with importScripts (vite.config.ts),
 * so the PWA keeps a single service worker. biggie_api sends pushes through
 * Firebase Cloud Messaging; each one arrives here as a push event whose JSON
 * is { notification: { title, body }, data: { type, title, body, … } }.
 *
 * When a tab of the app is open and focused, the push is handed to that tab
 * (src/services/pushNotifications.ts shows it in-app) instead of a system
 * notification. A click opens or focuses the app on the matching page.
 */

/* global self, clients */

// Keep in step with pushTargetUrl() in src/services/pushNotifications.ts
function pushTargetUrl(data) {
  var type = (data && data.type) || "";
  if (type === "omnichannel_message" && data.conversation_id) {
    return "/omnichannel?conversation=" + encodeURIComponent(data.conversation_id);
  }
  if (type.indexOf("leave_") === 0) return "/hr/leave";
  return "/notifications";
}

function readPush(event) {
  var payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { body: event.data ? event.data.text() : "" } };
  }
  var data = payload.data || {};
  var n = payload.notification || {};
  return {
    title: n.title || data.title || "Basepoint",
    body: n.body || data.body || "",
    data: data,
    // One notification per chat: a newer message replaces the older one
    tag: data.conversation_id ? "conv:" + data.conversation_id : data.notification_id || undefined,
  };
}

self.addEventListener("push", function (event) {
  var push = readPush(event);
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      var focused = list.find(function (c) {
        return c.focused && c.visibilityState === "visible";
      });
      if (focused) {
        focused.postMessage({ source: "base-push", push: push });
        return undefined;
      }
      return self.registration.showNotification(push.title, {
        body: push.body,
        icon: "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        tag: push.tag,
        renotify: !!push.tag,
        data: push.data,
      });
    })
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var target = new URL(pushTargetUrl(event.notification.data || {}), self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      var open = list.find(function (c) {
        return new URL(c.url).origin === self.location.origin;
      });
      if (open) {
        // Let the app route in place rather than reloading it
        open.postMessage({ source: "base-push", open: target });
        return open.focus();
      }
      return clients.openWindow(target);
    })
  );
});
