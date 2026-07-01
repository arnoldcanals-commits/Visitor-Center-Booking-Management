import imageCompression from "browser-image-compression";

export const compressImage = async (file) => {
  const options = { maxSizeMB: 1, maxWidthOrHeight: 1024, useWebWorker: true };
  return await imageCompression(file, options);
};
