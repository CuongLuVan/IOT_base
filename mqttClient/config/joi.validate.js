/**
 * Utility helper for Joi validation.
 *
 * @param  {object}  schema
 * @return {null|object}
 */
function validate(schema) {
  return function (req, res, next) {
    const { error } = schema.validate(req['body'], { abortEarly: false });
    if (error) {
      return next(error);
    }
    return next();
  };
}

module.exports =  validate;
