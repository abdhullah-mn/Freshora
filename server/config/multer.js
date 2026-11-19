import multer from 'multer';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 5 },
    fileFilter: (req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        callback(allowed.includes(file.mimetype) ? null : new Error('Upload JPG, PNG, or WebP images only.'), allowed.includes(file.mimetype));
    },
});
export default upload;
