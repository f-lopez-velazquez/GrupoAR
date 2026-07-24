import { db } from "../firebase/firebase";

const getCloudinaryPreset = () =>
    import.meta?.env?.VITE_CLOUDINARY_UPLOAD_PRESET
    || window.CLOUDINARY_UPLOAD_PRESET
    || localStorage.getItem("cloudinaryUploadPreset")
    || "GRUPO_AR";

export const uploadToCloudinary = async (file, folder = "grupo-ar/uploads") => {
    if (!file) return null;
    const preset = getCloudinaryPreset();
    if (!preset) throw new Error("Cloudinary upload preset no configurado.");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", preset);
    formData.append("folder", folder);

    const response = await fetch("https://api.cloudinary.com/v1_1/dblcojzhm/upload", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("Cloudinary Error Details:", errorData);
        throw new Error(errorData.error?.message || "Error al subir archivo a Cloudinary.");
    }

    const data = await response.json();
    return {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        originalName: file.name
    };
};
