import "dotenv/config";

export const config = {
    puerto: Number(process.env.PUERTO ?? 3000),
    jwtSecret: process.env.JWT_SECRET!,
}
