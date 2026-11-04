export interface JwtPayLoadUser {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'CASHIER';
}

declare global {
    namespace Express{
        interface Request {
            user?: JwtPayLoadUser
        }
    }
}