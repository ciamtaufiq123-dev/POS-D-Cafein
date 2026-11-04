import { Router } from 'express';
import { createOrder, confirmMidtransPayment, getOrders, getDashboardSummary, } from '../controllers/order.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema } from '../schemas/order.schema';

const router = Router();

router.get('/summary', authenticate, authorize(['ADMIN']), getDashboardSummary);
router.get('/', authenticate, getOrders);
router.post('/', authenticate, validate(createOrderSchema), createOrder);
router.patch('/:id/pay', authenticate, confirmMidtransPayment);

export default router;