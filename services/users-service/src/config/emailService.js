const { Resend } = require('resend');

/**
 * emailService
 * Responsabilidad única: envío de correos electrónicos via Resend.
 * La instancia de Resend se crea de forma lazy para no fallar al iniciar
 * el servidor si RESEND_API_KEY no está configurada.
 */

const FROM_EMAIL = process.env.FROM_EMAIL || 'no-reply@kiora.com';
const RESET_TOKEN_EXPIRY_MINUTES = 15;

/**
 * Devuelve la instancia de Resend. Se instancia la primera vez que se llama.
 * @throws {Error} si RESEND_API_KEY no está configurada
 */
const getResendClient = () => {
    if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY no está configurada. Agrega la variable de entorno para enviar emails.');
    }
    return new Resend(process.env.RESEND_API_KEY);
};

/**
 * Envía el correo de recuperación de contraseña.
 * @param {string} correo_usu - Dirección de email del destinatario
 * @param {string} token - Token de recuperación
 */
const sendPasswordReset = async (correo_usu, token) => {
    const resend = getResendClient();
    const resetLink = `${process.env.APP_URL}/reset-password?token=${token}`;

    await resend.emails.send({
        from: FROM_EMAIL,
        to: correo_usu,
        subject: 'Recuperación de contraseña — Kiora',
        html: `
            <h2>Recuperación de contraseña</h2>
            <p>Recibiste este correo porque solicitaste restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente enlace para continuar. El enlace expira en <strong>${RESET_TOKEN_EXPIRY_MINUTES} minutos</strong>:</p>
            <a href="${resetLink}" style="
                display: inline-block;
                padding: 12px 24px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                margin: 16px 0;
            ">Restablecer contraseña</a>
            <p>Si no solicitaste este cambio, ignora este correo.</p>
            <hr />
            <small>Este enlace expirará el ${new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000).toLocaleString('es-CO')}.</small>
        `,
    });
};

module.exports = { sendPasswordReset, RESET_TOKEN_EXPIRY_MINUTES };
