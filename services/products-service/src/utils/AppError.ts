export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code?: string;
    public readonly details?: any;

    constructor(message: string, statusCode: number, code?: string, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }
}
