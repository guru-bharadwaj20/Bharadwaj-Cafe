import mongoose from 'mongoose';

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['coffee', 'tea', 'snacks', 'pastries'],
      default: 'coffee',
    },
    available: {
      type: Boolean,
      default: true,
    },
    dietary: [{
      type: String,
      enum: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free']
    }],
    customizations: [{
      name: String,
      options: [{
        name: String,
        price: Number
      }]
    }],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    reviewCount: {
      type: Number,
      default: 0
    },
    tags: [{
      type: String
    }]
  },
  { timestamps: true }
);

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

export default MenuItem;
