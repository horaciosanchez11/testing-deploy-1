/* VIDEO 8
exports.myMiddleware = (req, res, next) => {
	req.name = 'Hori';
	next();
}
*/
//VIDEO11
const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');

const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
	storage: multer.memoryStorage(),
	fileFilter: function(req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/');
		if (isPhoto) {
			next(null, true);
		} else {
			next({message: 'That file type is not allowed!'}, false);
		}
	}
}

exports.homePage = (req, res) => {
	console.log(req.name);
	res.render('index', {title: 'Hello There'});
}

// VIDEO 10
exports.addStore = (req, res) => {
	//res.send('It Works!');
	res.render('editStore', {title: 'Add Store'});
}

//exports.createStore = (req, res) => {
//VIDEO 11
exports.createStore = async (req, res) => { 
	//res.json(req.body);
	//const store = new Store(req.body);
	// Not a great way to code:
	/*store.save(function(err, store) {
		if (!err) {
			console.log('It worked!');
			res.redirect('/');
		}
	});*/
	/*store
		.save()
		.then(store => {
			res.json(store);
		})
		.catch(err => {
			throw Error(err);
		})
		*/
	// there is something better:  VIDEO 11
	/*try {
		const store = new Store(req.body);
		await store.save();
		console.log('It Worked!');
	} catch Error (err) {
		e.getMessage();
	}*/

	// To get rid of the try catch block: we use error hanlder middleware catchErrors (changes in index and routes)
	// VIDEO 11
	//const store = new Store(req.body);
	//await store.save();
	//console.log('It Worked!');
	//req.flash('success', `<strong>Successfully</strong> created ${store.name}. Care to leave a review?`);
	//res.redirect('/');
	//VIDEO 29
	req.body.author = req.user._id;
	//VIDEO 12
	const store = await (new Store(req.body)).save();
	req.flash('success', `<strong>Successfully</strong> created ${store.name}. Care to leave a review?`);
	res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
	// 1. Query database for list of stores
	//VIDEO 40
	//const stores = await Store.find();
	const page = req.params.page || 1;
	const limit = 4;
	const skip = (page * limit) - limit;
	//const stores = await Store
	//						.find()
	//						.skip(skip)
	//						.limit(limit);
	const storesPromise = Store
							.find()
							.skip(skip)
							.limit(limit)
							.sort({created: 'desc'});
	const countPromise = Store.count();
	const [stores, count] = await Promise.all([storesPromise, countPromise]);
	const pages = Math.ceil(count / limit);
	if (!stores.length && skip) {
		req.flash('info', `Page ${page} doesn't exists. You are redirected to the last page`);
		res.redirect(`/stores/page/${pages}`);
		return;
	}
	//VIDEO 39
	//const stores = await Store.find().populate('reviews');
	//console.log(stores);
	//VIDEO 40
	//res.render('stores', {title: 'Stores', stores});
	res.render('stores', {title: 'Stores', stores, page, pages, count});
}

const confirmOwner = (store, user) => {
	if (!store.author.equals(user._id)) {
		throw Error('You must own the store to edit it.');
	}
}

exports.editStore = async (req, res) => {
	// 1. Find Store given an Id VIDEO 14
	//res.json(req.params);
	const store = await Store.findOne({_id: req.params.id});
	//res.json(store);
	// 2. Confirm they are owner of store VIDEO 29
	confirmOwner(store, req.user);
	// 3. Render out edit form so user can update store VIDEO 14
	res.render('editStore', {title: `Edit ${store.name}`, store});
}

exports.updateStore = async (req, res) => {
	req.body.location.type = 'Point';
	// find and update store
	const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
		new: true, // return the new store instead of the old one
		runValidators: true,
	}).exec();
	//Redirect them to the store
	req.flash('success', `Successfully updated ${store.name} <a href="/stores/${store.slug}">View Store</a>`);
	res.redirect(`/stores/${store._id}/edit`);
}

exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
	// check if there is no new file to resize
	if (!req.file) {
		next(); //skip to next middleware
		return;
	}
	console.log(req.file);
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`;

	// resize
	const photo = await jimp.read(req.file.buffer);
	await photo.resize(800, jimp.AUTO);
	await photo.write(`./public/uploads/${req.body.photo}`);

	// once written, keep going
	next();
}

exports.getStoreBySlug = async (req, res, next) => {
	//VIDEO 29
	//const store = await Store.findOne({slug: req.params.slug});
	const store = await Store.findOne({slug: req.params.slug}).populate('author reviews');
	if (!store) {
		return next();
	}
	res.render('store', {store, title:store.name});
}

//VIDEO 21
exports.getStoresByTag = async (req, res) => {
	const tag = req.params.tag;
	const tagQuery = tag || {$exists: true};
	//VIDEO 22
	//const tags = await Store.getTagsList();
	const tagsPromise = Store.getTagsList();
	const storesPromise = Store.find({tags: tagQuery});
	const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

	res.render('tag', {tags, title: 'Tags', tag, stores})
}

// VIDEO 31
exports.searchStores = async (req, res) => {
	
	const stores = await Store
	.find({
		$text: {
			$search: req.query.q
		}
	}, {
		score: { $meta: 'textScore' }
	})
	.sort({
		score: { $meta: 'textScore'}
	})
	.limit(5);
	res.json(stores);
}

exports.mapStores = async (req, res) => {
	const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
	const q = {
		location: {
			$near: {
				$geometry: {
					type: 'Point',
					coordinates
				},
				$maxDistance: 10000 //10KM
			}
		}
	}

	const stores = await Store.find(q).select('slug name description location photo').limit(10);
	res.json(stores);

};

exports.mapPage = (req, res) => {
	res.render('map', {title: 'Map'});
};

exports.heartStore = async (req, res) => {
	const hearts = req.user.hearts.map(obj => obj.toString());
	const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
	const user = await User.findByIdAndUpdate(req.user.id, {
			[operator]: {hearts: req.params.id}
		},
		{
			new: true
		}
	);
	res.json(user);
};

exports.getHearts = async (req, res) => {
	const stores = await Store.find({
		_id: { $in: req.user.hearts }
	});
	res.render('stores', {title: 'Hearted Stores', stores });
}

exports.getTopStores = async (req, res) => {
	const stores = await Store.getTopStores();
	res.render('topStores', {stores, title: 'Top Stores'})
}