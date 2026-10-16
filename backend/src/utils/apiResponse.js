function success(res, data, message = undefined, status = 200) {
  return res.status(status).json({ data, ...(message ? { message } : {}) });
}

module.exports = { success };
