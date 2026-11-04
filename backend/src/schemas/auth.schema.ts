import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().min(1, 'Email minimal 1 karakter').email('Format email tidak valid'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
});

export type LoginInput = z.infer<typeof loginSchema>;