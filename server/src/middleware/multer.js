import multer from "multer";

const storage = multer.memoryStorage(); // keep file in memory buffer
export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // limit to 50MB 
});
