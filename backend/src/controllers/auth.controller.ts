import { Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { LoginInput } from '../schemas/auth.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'rahasia_super_aman';

export const Login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body as LoginInput;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(401).json({ message: 'Email atau Password salah' });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ message: 'Email atau Password salah' });
            return;
        }

        const payload = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            message: 'Login Berhasil',
            token,
            user: payload,
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    }
};

export const getMe = async (req: Request, res: Response ): Promise<void> => {
    res.json({ user: req.user });
};