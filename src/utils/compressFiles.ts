/**
 * Client-side image compression for document uploads.
 *
 * Resizes images to a sane maximum dimension and re-encodes them with
 * reasonable quality so the multipart upload doesn't exceed the API's
 * body-size limit (413 Content Too Large).
 */

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const JPEG_QUALITY = 0.85;

const SUPPORTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const isImageFile = (file: File): boolean => file.type.startsWith("image/");

const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
        const imageUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(imageUrl);

            let { width, height } = img;
            if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
                width = Math.round(width * scale);
                height = Math.round(height * scale);
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                resolve(file);
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            const outputType = SUPPORTED_IMAGE_TYPES.includes(file.type)
                ? file.type
                : "image/jpeg";

            const quality = outputType === "image/png" ? undefined : JPEG_QUALITY;

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }

                    const extension =
                        outputType === "image/png"
                            ? ".png"
                            : outputType === "image/webp"
                            ? ".webp"
                            : ".jpg";
                    const baseName = file.name.replace(/\.[^/.]+$/, "");
                    const compressedFile = new File([blob], `${baseName}${extension}`, {
                        type: outputType,
                    });

                    // Fall back to the original if the compressed version is somehow larger.
                    resolve(compressedFile.size < file.size ? compressedFile : file);
                },
                outputType,
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(imageUrl);
            resolve(file);
        };

        img.src = imageUrl;
    });
};

/**
 * Compress an optional list of files. Non-image files pass through unchanged.
 */
export const compressFiles = async (files?: File[]): Promise<File[]> => {
    if (!files || files.length === 0) return [];

    const result: File[] = [];
    for (const file of files) {
        result.push(isImageFile(file) ? await compressImage(file) : file);
    }
    return result;
};
