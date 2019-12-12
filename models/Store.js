//VIDEO 9
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: 'Please enter a Store Name'
	},
	slug: String,
	description: {
		type: String,
		trim: true
	},
	tags: [String],
	created: {
		type: Date,
		default: Date.now
	},
	location: {
		type: {
			type: String,
			default: 'Point'	
		},
		coordinates: [{
			type: Number,
			required: 'You must supply coordinates'
		}],
		address: {
			type: String,
			required: 'You must supply an address'
		}
	},
	photo: String,
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'You must supply an author'
	} 
}, 
{
	toJSON: {virtuals: true},
	toObject: {virtuals: true}
});

//VIDEO 31 Define indexes
storeSchema.index({
	name: 'text',
	description: 'text'
});

//VIDEO 33
storeSchema.index({
	location: '2dsphere'
});

//VIDEO 20
/*storeSchema.pre('save', function(next) {
	if (!this.isModified('name')) {
		next();
		return;
	}
	this.slug = slug(this.name);
	next();
	// TODO make more resilient so slugs are unique
});*/
storeSchema.pre('save', async function(next) {
	if (!this.isModified('name')) {
		next();
		return;
	}
	this.slug = slug(this.name);
	// find other stores that the same slug name
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
	const storesWithSLug = await this.constructor.find({slug: slugRegEx});
	if (storesWithSLug.length) {
		this.slug = `${this.slug}-${storesWithSLug.length + 1}`;
	}
	next();
});

storeSchema.statics.getTagsList = function() {
	return this.aggregate([
		{$unwind: '$tags'},
		{$group: {_id: '$tags', count: {$sum: 1}}},
		{$sort: {count: -1}}
	]);
}

storeSchema.virtual('reviews', {
	ref: 'Review',  // what model to link
	localField: '_id',  // which field on the store
	foreignField: 'store' // which field on the review
});

storeSchema.statics.getTopStores = function() {
	return this.aggregate([
		// Lookup stores and populate reviews
		{ $lookup: 
			{ 
				from: 'reviews', 
				localField: '_id', 
				foreignField: 'store', 
				as: 'reviews' 
			} 
		},
		// filter for only items that have 2 or more reviews
		{
			$match:
				{
					'reviews.1': { 
						$exists: true 
					}
				}
		},
		// add the average reviews field
		//{
		//	$addField:
		//		{
		//			averageRating: {
		//				$avg: '$reviews.rating'
		//			}
		//		}
		//},
		{
			$project:
				{
					photo: '$$ROOT.photo',
					name: '$$ROOT.name',
					reviews: '$$ROOT.reviews',
					slug: '$$ROOT.slug',
					averageRating: {
						$avg: '$reviews.rating'
					}
				}
		},
		
		// sort it out by the new field, highest review first
		{
			$sort: 
				{
					averageRating: -1	
				}
		},
		// limit to 10
		{
			$limit: 10
		}
	]);
};

function autopopulate(next) {
	this.populate('reviews');
	next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);