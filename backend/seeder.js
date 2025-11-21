import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MenuItem from './models/MenuItem.js';
import connectDB from './config/db.js';

dotenv.config();

const menuItems = [
  {
    name: 'Latte',
    description: 'Italian-style espresso drink with steamed milk and a light foam layer',
    price: 150,
    image: 'img/latte.png',
    category: 'coffee',
    available: true,
    dietary: ['Vegetarian'],
    tags: ['coffee', 'espresso', 'milk'],
    customizations: [
      { name: 'Size', options: [{ name: 'Small', price: 0 }, { name: 'Medium', price: 20 }, { name: 'Large', price: 40 }] },
      { name: 'Milk', options: [{ name: 'Regular', price: 0 }, { name: 'Almond', price: 30 }, { name: 'Oat', price: 30 }] }
    ],
    rating: 4.5,
    reviewCount: 0,
  },
  {
    name: 'Americano',
    description: 'American-style diluted espresso with hot water, mild in flavor',
    price: 120,
    image: 'img/americano.png',
    category: 'coffee',
    available: true,
    dietary: ['Vegan', 'Dairy-Free'],
    tags: ['coffee', 'espresso', 'black'],
    customizations: [
      { name: 'Size', options: [{ name: 'Small', price: 0 }, { name: 'Medium', price: 20 }, { name: 'Large', price: 40 }] }
    ],
    rating: 4.2,
    reviewCount: 0,
  },
  {
    name: 'Filter Coffee',
    description: 'South Indian strong coffee brewed in a metal filter with milk and sugar',
    price: 80,
    image: 'img/filter.png',
    category: 'coffee',
    available: true,
    dietary: ['Vegetarian'],
    tags: ['coffee', 'traditional', 'south indian'],
    customizations: [
      { name: 'Sugar Level', options: [{ name: 'No Sugar', price: 0 }, { name: 'Less Sugar', price: 0 }, { name: 'Normal', price: 0 }, { name: 'Extra Sweet', price: 0 }] }
    ],
    rating: 4.7,
    reviewCount: 0,
  },
  {
    name: 'Cappuccino',
    description: 'Italian coffee with espresso, steamed milk, and thick milk foam',
    price: 160,
    image: 'img/cappuccino.png',
    category: 'coffee',
    available: true,
    dietary: ['Vegetarian'],
    tags: ['coffee', 'espresso', 'foam'],
    customizations: [
      { name: 'Size', options: [{ name: 'Small', price: 0 }, { name: 'Medium', price: 20 }, { name: 'Large', price: 40 }] },
      { name: 'Extra', options: [{ name: 'Extra Shot', price: 30 }, { name: 'Whipped Cream', price: 20 }] }
    ],
    rating: 4.6,
    reviewCount: 0,
  },
  {
    name: 'Mocha',
    description: 'Yemeni-origin coffee with chocolate, espresso, and steamed milk',
    price: 180,
    image: 'img/mocha.png',
    category: 'coffee',
    available: true,
    dietary: ['Vegetarian'],
    tags: ['coffee', 'chocolate', 'sweet'],
    customizations: [
      { name: 'Size', options: [{ name: 'Small', price: 0 }, { name: 'Medium', price: 20 }, { name: 'Large', price: 40 }] },
      { name: 'Chocolate', options: [{ name: 'Milk Chocolate', price: 0 }, { name: 'Dark Chocolate', price: 10 }, { name: 'White Chocolate', price: 10 }] }
    ],
    rating: 4.8,
    reviewCount: 0,
  },
  {
    name: 'Flat White',
    description: 'Australian espresso topped with silky microfoam',
    price: 170,
    image: 'img/flat.png',
    category: 'coffee',
    available: true,
    dietary: ['Vegetarian'],
    tags: ['coffee', 'espresso', 'smooth'],
    customizations: [
      { name: 'Size', options: [{ name: 'Small', price: 0 }, { name: 'Medium', price: 20 }] },
      { name: 'Milk', options: [{ name: 'Regular', price: 0 }, { name: 'Almond', price: 30 }, { name: 'Oat', price: 30 }] }
    ],
    rating: 4.4,
    reviewCount: 0,
  },
];

const importData = async () => {
  try {
    await connectDB();
    await MenuItem.deleteMany();
    await MenuItem.insertMany(menuItems);
    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();
    await MenuItem.deleteMany();
    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
