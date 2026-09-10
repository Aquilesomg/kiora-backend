export const services: Record<string, string> = {
    users: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
    products: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:3002',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
    orders: process.env.ORDERS_SERVICE_URL || 'http://localhost:3004',
    notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3005',
    reports: process.env.REPORTS_SERVICE_URL || 'http://localhost:3006',
    activity: process.env.ACTIVITY_SERVICE_URL || 'http://localhost:3007',
    ai: process.env.AI_SERVICE_URL || 'http://localhost:3008',
    stores: process.env.STORES_SERVICE_URL || 'http://localhost:3009',
};
