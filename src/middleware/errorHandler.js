export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const statusCode = error.statusCode || res.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed.',
      errors: Object.values(error.errors).map((item) => item.message)
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate record.',
      fields: Object.keys(error.keyPattern || {})
    });
  }

  console.error(error);

  return res.status(statusCode >= 400 ? statusCode : 500).json({
    message: error.message || 'Internal server error.',
    stack: isProduction ? undefined : error.stack
  });
};
