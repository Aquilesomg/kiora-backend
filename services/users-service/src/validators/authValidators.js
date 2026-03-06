const Joi = require('joi');

/**
 * authValidators
 * Esquemas Joi para las rutas de autenticación.
 * Centraliza las reglas de validación para login y register.
 */

const loginSchema = Joi.object({
    correo_usu: Joi.string().email().required().messages({
        'string.email': 'El correo no tiene un formato válido.',
        'any.required': 'El correo es obligatorio.',
    }),
    password: Joi.string().min(1).required().messages({
        'any.required': 'La contraseña es obligatoria.',
    }),
});

const registerSchema = Joi.object({
    nom_usu: Joi.string().min(2).max(60).required().messages({
        'any.required': 'El nombre es obligatorio.',
        'string.min': 'El nombre debe tener al menos 2 caracteres.',
    }),
    correo_usu: Joi.string().email().required().messages({
        'string.email': 'El correo no tiene un formato válido.',
        'any.required': 'El correo es obligatorio.',
    }),
    password: Joi.string().min(6).required().messages({
        'any.required': 'La contraseña es obligatoria.',
        'string.min': 'La contraseña debe tener al menos 6 caracteres.',
    }),
    rol_usu: Joi.string().valid('admin', 'cliente').default('cliente'),
    tel_usu: Joi.string().max(20).optional().allow('', null),
});

module.exports = { loginSchema, registerSchema };
