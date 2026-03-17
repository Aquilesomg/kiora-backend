const Joi = require('joi');

/**
 * authValidators
 * Esquemas Joi para las rutas de autenticación y gestión de usuarios.
 * Centraliza las reglas de validación.
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

// HU43 — Actualizar usuario: al menos un campo requerido
const updateUserSchema = Joi.object({
    nom_usu: Joi.string().min(2).max(60).messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres.',
    }),
    correo_usu: Joi.string().email().messages({
        'string.email': 'El correo no tiene un formato válido.',
    }),
    tel_usu: Joi.string().max(20).allow('', null),
}).min(1).messages({
    'object.min': 'Debes enviar al menos un campo para actualizar.',
});

// HU45 — Asignar rol: rol_usu requerido
const updateRoleSchema = Joi.object({
    rol_usu: Joi.string().valid('admin', 'cliente').required().messages({
        'any.required': 'El rol es obligatorio.',
        'any.only': 'El rol debe ser "admin" o "cliente".',
    }),
});

// HU05 — Solicitar recuperación de contraseña
const forgotPasswordSchema = Joi.object({
    correo_usu: Joi.string().email().required().messages({
        'string.email': 'El correo no tiene un formato válido.',
        'any.required': 'El correo es obligatorio.',
    }),
});

// HU05 — Restablecer contraseña con token
const resetPasswordSchema = Joi.object({
    token: Joi.string().required().messages({
        'any.required': 'El token es obligatorio.',
    }),
    new_password: Joi.string().min(6).required().messages({
        'any.required': 'La nueva contraseña es obligatoria.',
        'string.min': 'La nueva contraseña debe tener al menos 6 caracteres.',
    }),
});

// Cambiar contraseña estando autenticado
const changePasswordSchema = Joi.object({
    current_password: Joi.string().required().messages({
        'any.required': 'La contraseña actual es obligatoria.',
    }),
    new_password: Joi.string().min(6).invalid(Joi.ref('current_password')).required().messages({
        'any.required': 'La nueva contraseña es obligatoria.',
        'string.min': 'La nueva contraseña debe tener al menos 6 caracteres.',
        'any.invalid': 'La nueva contraseña no puede ser igual a la actual.',
    }),
});

module.exports = { loginSchema, registerSchema, updateUserSchema, updateRoleSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema };
