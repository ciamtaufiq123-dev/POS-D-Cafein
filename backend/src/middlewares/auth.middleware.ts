import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayLoadUser } from '../types/express';

const JWT_SECRET =process.env.JWT_SECRET || 'rahasia_super_aman_pos_dcafein_2026';

export const authenticate = (req: Request, res: Response, next:NextFunction): void  => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized: Token tidak ditemukan'});
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayLoadUser;
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized: Token tidak valid atau kadaluarsa' });
    }
};

export const authorize = (allowedRoles: Array<'ADMIN' | 'CASHIER'>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            res.status(403).json({ message: 'Forbidden: Role Anda tidak memiliki akses ke fitur ini' });
        }
        next();
    };
};