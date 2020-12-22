var express = require('express');
var router = express.Router();
var { authLogin } = require('../middleware/auth');
/* ROUTER FOR USER */
const userController = require("../controllers/userController.js")

router.get('/info', authLogin, userController.getInfo);

router.get('/:id', userController.findUser);

router.get('/', userController.findAll);

router.post('/', userController.create);

router.put('/:id', userController.update);

router.delete('/:id', userController.delete);

router.post('/authenticate', userController.authenticate);

router.post('/auth/google/', userController.authenticateGoogleToken);

module.exports = router;