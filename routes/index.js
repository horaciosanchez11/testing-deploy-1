const express = require('express');
const router = express.Router();
// VIDEO 7
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

// VIDEO 11
const {catchErrors} = require('../handlers/errorHandlers');

//-router.get('/', storeController.homePage);

//- VIDEO 8
//router.get('/', storeController.myMiddleware, storeController.homePage);

// VIDEO 13
//router.get('/', storeController.homePage);
router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
//VIDEO 40
router.get('/stores/page/:page', catchErrors(storeController.getStores));

// VIDEO 10
router.get('/add',
	authController.isLoggedIn,
	storeController.addStore
);
//router.post('/add', storeController.createStore)

//VIDEO 11
//router.post('/add', catchErrors(storeController.createStore));
//VIDEO 18
router.post('/add', 
	storeController.upload,
	catchErrors(storeController.resize),
	catchErrors(storeController.createStore)
);

//VIDEO 14
//router.post('/add/:id', catchErrors(storeController.updateStore));

//VIDEO 18
router.post('/add/:id', 
	storeController.upload,
	catchErrors(storeController.resize),
	catchErrors(storeController.updateStore)
);

//VIDEO 14
router.get('/stores/:id/edit', catchErrors(storeController.editStore));

//VIDEO 19
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));

// Do work here
// VIDEO 4
/*router.get('/', (req, res) => {
  //res.send('Hey! It works!');
  console.log('Heey!');
  const hori = {name: 'Hori', age:31};
  //res.json(hori);
  //res.send(req.query.name);
  res.json(req.query);
});*/

// VIDEO 5
/*router.get('/', (req, res) => {
	res.render('hello', {
		name: 'Hori',
		age: 31,
		nameQuery: req.query.name,
		title: 'I love food' 
	});
});

router.get('/reverse/:name', (req, res) => {
	const reverse = [...req.params.name].reverse().join('');
	res.send(reverse);
});
*/

//VIDEO 21
router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

//VIDEO 23
router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/register', userController.registerForm);
// 1. Validate registration data
// 2. Register the user
// 3. Log them in
router.post('/register', 
	userController.validateRegister,
	userController.register,
	authController.login
);

router.get('/logout', authController.logout);

router.get('/account', 
	authController.isLoggedIn,
	userController.account
);
router.post('/account', 
	catchErrors(userController.updateAccount)
);

router.post('/account/forgot', catchErrors(authController.forgot));

router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token',
	authController.confirmedPassword,
	catchErrors(authController.update)
);

// VIDEO 31
// APIS
router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));

router.get('/map', storeController.mapPage);

router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview));

router.get('/top', catchErrors(storeController.getTopStores));

module.exports = router;
