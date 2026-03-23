const express = require('express');
const router = express.Router();

// GET /api/graph/users — proxy to Microsoft Graph using the caller's delegated token
router.get('/users', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Authorization header required' });

  try {
    const response = await fetch('https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,jobTitle,department', {
      headers: { Authorization: authHeader },
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data.value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
