import './config/env';
import app from './app';
import { logger } from '@kiora/shared';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    logger.info(`Users Service ejecutándose en el puerto ${PORT}`);
});