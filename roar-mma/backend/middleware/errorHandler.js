function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }

  if (err.name === 'ValidationError' || err.status === 400) {
    return res.status(400).json({ error: 'Bad request' });
  }
  if (err.status === 401 || err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (err.status === 403) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (err.status === 404) {
    return res.status(404).json({ error: 'Not found' });
  }
  if (err.status === 422) {
    return res.status(422).json({ error: 'Unprocessable entity' });
  }

  res.status(500).json({ error: 'Internal server error' });
}

module.exports = { errorHandler };
