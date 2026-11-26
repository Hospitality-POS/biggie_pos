/**
 * Get a file attached in the inbox into a shape WhatsApp will send.
 *
 * WhatsApp (Cloud API) accepts photos as JPG/PNG up to 5 MB and videos as
 * MP4/3GP up to 16 MB. Photos in other formats, or too big, are re-encoded
 * here as JPEG; videos can't be converted in the browser, so they're checked
 * and explained instead of failing at Meta.
 */

const MB = 1024 * 1024;
export const IMAGE_MAX = 5 * MB;
export const VIDEO_MAX = 16 * MB;
export const DOCUMENT_MAX = 100 * MB;
const IMAGE_TYPES = ["image/jpeg", "image/png"];
const VIDEO_TYPES = ["video/mp4", "video/3gpp"];
const MAX_EDGE = 2560;

export class MediaPrepError extends Error {}

const toJpegName = (name: string) => `${name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;

const encodeJpeg = (canvas: HTMLCanvasElement, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

// Re-encode a photo as a JPEG under the size limit (scaling down if needed).
const convertImage = async (file: File): Promise<File> => {
    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch {
        throw new MediaPrepError(
            "This photo format can't be opened here (for example HEIC from an iPhone). Save it as JPG or PNG and attach it again."
        );
    }
    let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 4; attempt++) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#fff"; // transparent PNG/WebP areas → white, not black
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await encodeJpeg(canvas, 0.85);
        if (blob && blob.size <= IMAGE_MAX) {
            bitmap.close();
            return new File([blob], toJpegName(file.name), { type: "image/jpeg" });
        }
        scale *= 0.75;
    }
    bitmap.close();
    throw new MediaPrepError("This photo is too large to send on WhatsApp, even after shrinking it. Try a smaller photo.");
};

export type PreparedMedia = { file: File; mediaType: "image" | "video" | "document" };

export const prepareMediaForWhatsApp = async (file: File): Promise<PreparedMedia> => {
    const type = (file.type || "").toLowerCase();

    if (type.startsWith("image/")) {
        if (IMAGE_TYPES.includes(type) && file.size <= IMAGE_MAX) return { file, mediaType: "image" };
        return { file: await convertImage(file), mediaType: "image" };
    }

    if (type.startsWith("video/")) {
        if (!VIDEO_TYPES.includes(type)) {
            const ext = file.name.includes(".") ? file.name.split(".").pop()!.toUpperCase() : type.replace("video/", "").toUpperCase();
            throw new MediaPrepError(
                `WhatsApp only sends MP4 or 3GP videos — this one is ${ext}. Convert it to MP4 and attach it again.`
            );
        }
        if (file.size > VIDEO_MAX) {
            throw new MediaPrepError(
                `This video is ${(file.size / MB).toFixed(1)} MB — WhatsApp allows up to 16 MB. Trim or compress it and try again.`
            );
        }
        return { file, mediaType: "video" };
    }

    if (file.size > DOCUMENT_MAX) {
        throw new MediaPrepError("This file is larger than WhatsApp's 100 MB limit.");
    }
    return { file, mediaType: "document" };
};

export const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new MediaPrepError("The file couldn't be read. Please attach it again."));
        reader.readAsDataURL(file);
    });
