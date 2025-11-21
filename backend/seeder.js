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
  },
  {
    name: 'Americano',
    description: 'American-style diluted espresso with hot water, mild in flavor',
    price: 120,
    image: 'img/americano.png',
    category: 'coffee',
    available: true,
  },
  {
    name: 'Filter Coffee',
    description: 'South Indian strong coffee brewed in a metal filter with milk and sugar',
    price: 80,
    image: 'img/filter.png',
    category: 'coffee',
    available: true,
  },
  {
    name: 'Cappuccino',
    description: 'Italian coffee with espresso, steamed milk, and thick milk foam',
    price: 160,
    image: 'img/cappuccino.png',
    category: 'coffee',
    available: true,
  },
  {
    name: 'Mocha',
    description: 'Yemeni-origin coffee with chocolate, espresso, and steamed milk',
    price: 180,
    image: 'img/mocha.png',
    category: 'coffee',
    available: true,
  },
  {
    name: 'Flat White',
    description: 'Australian espresso topped with silky microfoam',
    price: 170,
    image: 'img/flat.png',
    category: 'coffee',
    available: true,
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
