const express = require('express');
const { getTheme, FONTS } = require('../theme');

const router = express.Router();

// Public: the login page needs the theme before anyone signs in.
router.get('/', async (req, res, next) => {
  try {
    res.json({ theme: await getTheme(), fonts: FONTS });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
