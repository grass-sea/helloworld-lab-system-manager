const Joi = require("joi");
const registerSchema = Joi.object({

  fullName: Joi.string()
    .required(),

  email: Joi.string()
    .email()
    .required(),

  password: Joi.string()
    .min(6)
    .required(),

  role: Joi.string()
    .valid("ADMIN", "LECTURER", "STUDENT")
    .required()

});

const loginSchema = Joi.object({

  email: Joi.string()
    .email()
    .required(),
  password: Joi.string()
    .required()

});

module.exports = {
  registerSchema,
  loginSchema

};