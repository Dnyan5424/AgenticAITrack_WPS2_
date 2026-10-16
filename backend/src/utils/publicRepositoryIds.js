const Repository = require('../models/Repository');

module.exports = userId => Repository.find({ user: userId, isPrivate: { $ne: true } }).distinct('_id');
