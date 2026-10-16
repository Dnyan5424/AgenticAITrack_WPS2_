module.exports = schema => (req, res, next) => {
  const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!parsed.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.details = parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message }));
    return next(error);
  }
  req.validated = parsed.data;
  next();
};
