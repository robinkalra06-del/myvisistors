/**
 * Request validation middleware
 */

export function validate(schema) {
  return (req, res, next) => {
    try {
      if (schema.body) {
        schema.body(req.body);
      }
      if (schema.query) {
        schema.query(req.query);
      }
      if (schema.params) {
        schema.params(req.params);
      }
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          message: err.message || 'Validation error',
          details: err.details || null,
          code: 'VALIDATION_ERROR'
        }
      });
    }
  };
}
