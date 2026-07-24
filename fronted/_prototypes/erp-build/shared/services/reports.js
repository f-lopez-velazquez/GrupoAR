export const exportElementAsPng = async (element, filename = "reporte.png") => {
  if (!element) throw new Error("Elemento no encontrado.");
  const { toPng } = await import("https://unpkg.com/html-to-image@1.11.11/dist/html-to-image.esm.js");
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
  return dataUrl;
};
