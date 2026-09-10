import { createRedisClient } from '@kiora/shared';

const redisClient = createRedisClient({ name: 'orders-redis', lazyConnect: false });

export default redisClient;
