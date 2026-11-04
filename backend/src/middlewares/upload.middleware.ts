import multer from 'multer';
import pathb from 'path';

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, pathb.join(__dirname, '../../uploads'));
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = pathb.extname(file.originalname);
        cb(null, `product-${uniqueSuffix}${ext}`);
    },
});

export const uploadImage = multer ({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const isExtvalid = allowedTypes.test(pathb.extname(file.originalname).toLowerCase());
        const isMimeValid = allowedTypes.test(file.mimetype);

        if (isExtvalid && isMimeValid) {
            cb(null, true);
        } else {
            cb(new Error('Format gambar harus JPG, JPEG, PNG, atau WEBP'));
        }
    },
});