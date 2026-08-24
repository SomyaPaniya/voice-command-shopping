const express = require('express');
const parseHandler = require('../api/parse');

module.exports = function(app) {
  // Parse JSON bodies for API requests so req.body is populated
  app.use(express.json());

  // Mount the serverless function locally
  app.post('/api/parse', (req, res) => {
    parseHandler(req, res);
  });
};
