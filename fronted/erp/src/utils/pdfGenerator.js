/**
 * PDF and Image generation utilities with error handling
 */

import { handleError, showToast } from "./errorHandler";

// Dynamic import for html-to-image (if available)
let htmlToImage = null;

const loadHtmlToImage = async () => {
    if (!htmlToImage) {
        try {
            htmlToImage = await import("html-to-image");
        } catch (error) {
            console.warn("html-to-image not installed, using fallback");
            return null;
        }
    }
    return htmlToImage;
};

/**
 * Generate PNG image from HTML element
 */
export const elementToPng = async (element, options = {}) => {
    const lib = await loadHtmlToImage();

    if (!lib) {
        showToast("La función de captura de imagen no está disponible", "warning");
        return null;
    }

    try {
        const dataUrl = await lib.toPng(element, {
            quality: options.quality || 0.95,
            backgroundColor: options.backgroundColor || "#ffffff",
            pixelRatio: options.pixelRatio || 2,
            ...options
        });

        return dataUrl;
    } catch (error) {
        await handleError(error, { context: "elementToPng", options });
        return null;
    }
};

const loadJsPDF = async () => {
    try {
        const { jsPDF } = await import("jspdf");
        return jsPDF;
    } catch (error) {
        console.warn("jspdf not installed", error);
        return null;
    }
};

/**
 * Generate PNG image from HTML element
 */


/**
 * Generate PDF from HTML element (as image to preserve styles exactly)
 */
export const generatePdf = async (element, filename = "document.pdf") => {
    const jsPDF = await loadJsPDF();
    if (!jsPDF) {
        showToast("La función de generación de PDF no está disponible", "warning");
        return null;
    }

    try {
        // First generate high quality image
        const imgData = await elementToPng(element, {
            pixelRatio: 2,
            backgroundColor: "#ffffff"
        });

        if (!imgData) return null;

        // Calculate dimensions to fit in A4
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Use a temporary image to get dimensions
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;

        // Scale to fit width, maintaining aspect ratio
        const ratio = pdfWidth / imgWidth;
        const finalHeight = imgHeight * ratio;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight);

        // Multi-page support if content is too long
        if (finalHeight > pdfHeight) {
            // Basic implementation just cuts off or scales. 
            // For simple quotes, usually 1 page is enough or we scale.
            // Future improvement: slice image into pages.
        }

        pdf.save(filename);
        return true;
    } catch (error) {
        await handleError(error, { context: "generatePdf", filename });
        return false;
    }
};

/**
 * Generate JPEG image from HTML element
 */
export const elementToJpeg = async (element, options = {}) => {
    const lib = await loadHtmlToImage();

    if (!lib) {
        showToast("La función de captura de imagen no está disponible", "warning");
        return null;
    }

    try {
        const dataUrl = await lib.toJpeg(element, {
            quality: options.quality || 0.9,
            backgroundColor: options.backgroundColor || "#ffffff",
            ...options
        });

        return dataUrl;
    } catch (error) {
        await handleError(error, { context: "elementToJpeg", options });
        return null;
    }
};

/**
 * Download image from data URL
 */
export const downloadImage = (dataUrl, filename = "image.png") => {
    if (!dataUrl) {
        showToast("No hay imagen para descargar", "error");
        return false;
    }

    try {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
        return true;
    } catch (error) {
        handleError(error, { context: "downloadImage", filename });
        return false;
    }
};

/**
 * Generate and download ticket as image
 */
export const downloadTicketImage = async (ticketElement, ticketId) => {
    showToast("Generando imagen del ticket...", "info", 2000);

    const dataUrl = await elementToPng(ticketElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 2
    });

    if (dataUrl) {
        const success = downloadImage(dataUrl, `ticket-${ticketId}.png`);
        if (success) {
            showToast("Ticket descargado correctamente", "success");
        }
        return dataUrl;
    }

    return null;
};

/**
 * Simple PDF generation using print dialog
 */
export const printToPdf = (element, title = "Documento") => {
    try {
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            showToast("No se pudo abrir la ventana de impresión. Verifica que los popups estén permitidos.", "error");
            return false;
        }

        const styles = Array.from(document.styleSheets)
            .map(styleSheet => {
                try {
                    return Array.from(styleSheet.cssRules)
                        .map(rule => rule.cssText)
                        .join("\n");
                } catch (e) {
                    return "";
                }
            })
            .join("\n");

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            ${styles}
            @media print {
              body { margin: 0; padding: 20px; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);

        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        };

        return true;
    } catch (error) {
        handleError(error, { context: "printToPdf", title });
        return false;
    }
};

/**
 * Share image via Web Share API
 */
export const shareImage = async (dataUrl, title = "Imagen", text = "") => {
    if (!navigator.share) {
        showToast("Compartir no está disponible en este navegador", "warning");
        return false;
    }

    try {
        // Convert data URL to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${title}.png`, { type: "image/png" });

        await navigator.share({
            title,
            text,
            files: [file]
        });

        return true;
    } catch (error) {
        if (error.name !== "AbortError") {
            await handleError(error, { context: "shareImage", title });
        }
        return false;
    }
};

/**
 * Copy image to clipboard
 */
export const copyImageToClipboard = async (dataUrl) => {
    if (!navigator.clipboard?.write) {
        showToast("Copiar imagen no está disponible en este navegador", "warning");
        return false;
    }

    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();

        await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
        ]);

        showToast("Imagen copiada al portapapeles", "success");
        return true;
    } catch (error) {
        await handleError(error, { context: "copyImageToClipboard" });
        return false;
    }
};

/**
 * Generate QR code data URL (uses external service)
 */
export const generateQRCode = async (data, size = 200) => {
    const encodedData = encodeURIComponent(data);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to generate QR code");

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        await handleError(error, { context: "generateQRCode", data });
        return null;
    }
};

/**
 * Compress image file
 */
export const compressImage = async (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: "image/jpeg" }));
                        } else {
                            reject(new Error("Failed to compress image"));
                        }
                    },
                    "image/jpeg",
                    quality
                );
            };

            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
    });
};

/**
 * Validate image file
 */
export const validateImageFile = (file, options = {}) => {
    const { maxSize = 5 * 1024 * 1024, allowedTypes = ["image/jpeg", "image/png", "image/webp"] } = options;

    const errors = [];

    if (!allowedTypes.includes(file.type)) {
        errors.push(`Tipo de archivo no permitido. Usa: ${allowedTypes.map(t => t.split("/")[1]).join(", ")}`);
    }

    if (file.size > maxSize) {
        errors.push(`Archivo muy grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
};
