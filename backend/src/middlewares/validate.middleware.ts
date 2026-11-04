import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const result = await schema.safeParseAsync(req.body);

        if (!result.success) {
            res.status(400).json({
                message: "Data yang dikirim tidak valid",
                errors: result.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            });
            return;
        }

        req.body = result.data;
        next();
    };
};