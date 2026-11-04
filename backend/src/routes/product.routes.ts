import { Router } from 'express';
import {
    getCategories,
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
} from '../controllers/product.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadImage } from '../middlewares/upload.middleware';
import { validate } from '../middlewares/validate.middleware';
import { productSchema } from '../schemas/product.schema';

const router = Router();

router.get('/catgories', authenticate, getCategories);
router.get('/', authenticate, getProducts);

router.post(
    '/',
    authenticate,
    authorize(['ADMIN']),
    uploadImage.single('image'),
    validate(productSchema),
    createProduct
);

router.put(
    '/:id',
    authenticate,
    authorize(['ADMIN']),
    uploadImage.single('image'),
    updateProduct
);

router.delete('/:id', authenticate, authorize(['ADMIN']), deleteProduct);

export default router;