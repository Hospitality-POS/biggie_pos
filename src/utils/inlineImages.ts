/**
 * Inline every <img> inside `root` as a data: URL before an html2canvas capture.
 *
 * Logos are served from DigitalOcean Spaces. The on-screen preview loads them
 * as plain (non-CORS) images, and when html2canvas then asks for the same URL
 * with CORS the browser can answer from that cached non-CORS copy — the image
 * is rejected and the logo comes out blank in the PDF. Fetching each image
 * fresh in CORS mode (bypassing the cache) and swapping in a data URL leaves
 * html2canvas nothing cross-origin to load.
 *
 * Images that still can't be fetched are left as they are.
 */
const toDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });

const waitForLoad = (img: HTMLImageElement) =>
    img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
          });

export const inlineImages = async (root: HTMLElement): Promise<void> => {
    const imgs = Array.from(root.querySelectorAll("img"));
    await Promise.all(
        imgs.map(async (img) => {
            const src = img.currentSrc || img.src;
            if (!src || src.startsWith("data:") || src.startsWith("blob:")) return;
            try {
                const res = await fetch(src, { mode: "cors", cache: "no-store", credentials: "omit" });
                if (!res.ok) return;
                img.removeAttribute("srcset");
                img.src = await toDataUrl(await res.blob());
                await waitForLoad(img);
            } catch (err) {
                console.warn("[inlineImages] could not inline image for capture:", src, err);
            }
        })
    );
};
