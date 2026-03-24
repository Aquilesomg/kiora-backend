'use strict';

const Redis   = require('ioredis');
const logger  = require('../config/logger');
const { sendEmail } = require('../services/emailService');

/**
 * Suscribe al canal Redis de notificaciones y despacha emails
 * cuando llega un evento.
 *
 * Formato esperado del mensaje publicado en el canal:
 * {
 *   "to"     : "destinatario@example.com",
 *   "subject": "Asunto del email",
 *   "html"   : "<p>Cuerpo HTML del email</p>",
 *   "text"   : "Cuerpo de texto plano (opcional)"
 * }
 *
 * Para publicar desde otro servicio (ej. users-service):
 *   redisClient.publish('kiora:notifications', JSON.stringify({ to, subject, html }));
 *
 * @param {{ host: string, port: number, password?: string, notificationsChannel: string }} redisConfig
 * @param {string} from - Dirección del remitente SMTP
 */
function startSubscriber(redisConfig, from) {
    const subscriber = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        // Reconexión automática con backoff exponencial
        retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    subscriber.on('connect', () => {
        logger.info('Subscriber Redis conectado', {
            host: redisConfig.host,
            port: redisConfig.port,
        });
    });

    subscriber.on('error', (err) => {
        logger.error('Error en subscriber Redis', { error: err.message });
    });

    subscriber.subscribe(redisConfig.notificationsChannel, (err, count) => {
        if (err) {
            logger.error('No se pudo suscribir al canal Redis', { error: err.message });
            return;
        }
        logger.info(`Escuchando ${count} canal(es)`, { channel: redisConfig.notificationsChannel });
    });

    subscriber.on('message', async (channel, rawMessage) => {
        logger.debug('Mensaje recibido en canal', { channel });

        let payload;
        try {
            payload = JSON.parse(rawMessage);
        } catch {
            logger.warn('Mensaje inválido (no es JSON), descartado', { rawMessage });
            return;
        }

        try {
            await sendEmail(payload, from);
        } catch (err) {
            logger.error('Error al enviar email', {
                to: payload.to,
                subject: payload.subject,
                error: err.message,
            });
        }
    });

    return subscriber;
}

module.exports = { startSubscriber };
