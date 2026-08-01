import dotenv from 'dotenv';
import MenuItem, { type IMenuItem } from './models/MenuItem.js';
import connectDB from './config/db.js';

dotenv.config();

const menuItems: Partial<IMenuItem>[] = [
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
      {
        name: 'Size',
        options: [
          { name: 'Small', price: 0 },
          { name: 'Medium', price: 20 },
          { name: 'Large', price: 40 },
        ],
      },
      {
        name: 'Milk',
        options: [
          { name: 'Regular', price: 0 },
          { name: 'Almond', price: 30 },
          { name: 'Oat', price: 30 },
        ],
      },
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
      {
        name: 'Size',
        options: [
          { name: 'Small', price: 0 },
          { name: 'Medium', price: 20 },
          { name: 'Large', price: 40 },
        ],
      },
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
      {
        name: 'Sugar Level',
        options: [
          { name: 'No Sugar', price: 0 },
          { name: 'Less Sugar', price: 0 },
          { name: 'Normal', price: 0 },
          { name: 'Extra Sweet', price: 0 },
        ],
      },
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
      {
        name: 'Size',
        options: [
          { name: 'Small', price: 0 },
          { name: 'Medium', price: 20 },
          { name: 'Large', price: 40 },
        ],
      },
      {
        name: 'Extra',
        options: [
          { name: 'Extra Shot', price: 30 },
          { name: 'Whipped Cream', price: 20 },
        ],
      },
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
      {
        name: 'Size',
        options: [
          { name: 'Small', price: 0 },
          { name: 'Medium', price: 20 },
          { name: 'Large', price: 40 },
        ],
      },
      {
        name: 'Chocolate',
        options: [
          { name: 'Milk Chocolate', price: 0 },
          { name: 'Dark Chocolate', price: 10 },
          { name: 'White Chocolate', price: 10 },
        ],
      },
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
      {
        name: 'Size',
        options: [
          { name: 'Small', price: 0 },
          { name: 'Medium', price: 20 },
        ],
      },
      {
        name: 'Milk',
        options: [
          { name: 'Regular', price: 0 },
          { name: 'Almond', price: 30 },
          { name: 'Oat', price: 30 },
        ],
      },
    ],
    rating: 4.4,
    reviewCount: 0,
  },
  {
    // Beans are a consumable, so they belong on the Order page rather than
    // on the merchandise shelf, where they used to sit.
    name: 'Coffee Beans - Premium Blend',
    description: 'Our signature house blend, roasted in small batches. 250g pack of whole beans',
    price: 499,
    image: 'img/filter.png',
    category: 'coffee',
    kind: 'drink',
    available: true,
    stock: 40,
    dietary: ['Vegan', 'Gluten-Free', 'Dairy-Free'],
    tags: ['coffee', 'beans', 'whole bean', 'take home'],
    customizations: [
      {
        name: 'Grind',
        options: [
          { name: 'Whole Bean', price: 0 },
          { name: 'Coarse (French Press)', price: 0 },
          { name: 'Medium (Filter)', price: 0 },
          { name: 'Fine (Espresso)', price: 0 },
        ],
      },
    ],
    rating: 4.7,
    reviewCount: 0,
  },
];

/**
 * The merchandise shelf.
 *
 * Real documents rather than a hardcoded array in the React bundle, so each
 * one has a genuine ObjectId that /api/orders can price. Nothing consumable
 * belongs here — beans moved to the menu above.
 */
const merchandiseItems: Partial<IMenuItem>[] = [
  {
    name: "Bharadwaj's Cafe T-Shirt",
    description: 'Premium combed-cotton tee with the house bean mark on the chest',
    price: 599,
    image: 'img/merch/tshirt.svg',
    category: 'apparel',
    kind: 'merch',
    stock: 40,
    tags: ['apparel', 'tshirt', 'cotton'],
    rating: 4.6,
  },
  {
    name: 'Hoodie - Black',
    description: 'Heavyweight brushed-fleece hoodie with a kangaroo pocket and drawstring hood',
    price: 1299,
    image: 'img/merch/hoodie.svg',
    category: 'apparel',
    kind: 'merch',
    stock: 22,
    tags: ['apparel', 'hoodie', 'winter'],
    rating: 4.8,
  },
  {
    name: 'Sweatshirt - Grey',
    description: 'Classic crew-neck sweatshirt with ribbed cuffs and a vintage cafe print',
    price: 999,
    image: 'img/merch/sweatshirt.svg',
    category: 'apparel',
    kind: 'merch',
    stock: 25,
    tags: ['apparel', 'sweatshirt'],
    rating: 4.5,
  },
  {
    name: 'Cap - Embroidered Logo',
    description: 'Six-panel cotton cap with an adjustable strap and embroidered bean mark',
    price: 399,
    image: 'img/merch/cap.svg',
    category: 'apparel',
    kind: 'merch',
    stock: 50,
    tags: ['apparel', 'cap', 'accessories'],
    rating: 4.3,
  },
  {
    name: 'Coffee Mug - Classic',
    description: 'Chunky 350ml stoneware mug, dishwasher and microwave safe',
    price: 299,
    image: 'img/merch/mug.svg',
    category: 'drinkware',
    kind: 'merch',
    stock: 60,
    tags: ['drinkware', 'mug', 'ceramic'],
    rating: 4.7,
  },
  {
    name: 'Travel Tumbler',
    description: 'Vacuum-insulated steel tumbler that keeps a flat white hot for six hours',
    price: 799,
    image: 'img/merch/tumbler.svg',
    category: 'drinkware',
    kind: 'merch',
    stock: 35,
    tags: ['drinkware', 'tumbler', 'insulated'],
    rating: 4.9,
  },
  {
    name: 'Water Bottle',
    description: 'BPA-free 1L bottle with a leak-proof lid and the cafe wordmark',
    price: 549,
    image: 'img/merch/bottle.svg',
    category: 'drinkware',
    kind: 'merch',
    stock: 45,
    tags: ['drinkware', 'bottle', 'reusable'],
    rating: 4.4,
  },
  {
    name: 'Tote Bag',
    description: 'Heavy canvas tote with reinforced handles, roomy enough for a laptop',
    price: 449,
    image: 'img/merch/tote.svg',
    category: 'accessories',
    kind: 'merch',
    stock: 55,
    tags: ['accessories', 'tote', 'canvas'],
    rating: 4.6,
  },
  {
    name: 'Keychain',
    description: 'Solid brass keychain with an enamelled miniature cup charm',
    price: 149,
    image: 'img/merch/keychain.svg',
    category: 'accessories',
    kind: 'merch',
    stock: 80,
    tags: ['accessories', 'keychain', 'brass'],
    rating: 4.2,
  },
  {
    name: 'Notebook - Coffee Lover',
    description: 'A5 ruled notebook, 160 pages of thick cream paper with a lay-flat binding',
    price: 249,
    image: 'img/merch/notebook.svg',
    category: 'stationery',
    kind: 'merch',
    stock: 40,
    tags: ['stationery', 'notebook', 'a5'],
    rating: 4.5,
  },
  {
    name: 'Coaster Set',
    description: 'Set of four turned-acacia coasters, branded and finished with food-safe oil',
    price: 199,
    image: 'img/merch/coasters.svg',
    category: 'home-decor',
    kind: 'merch',
    stock: 38,
    tags: ['home', 'coasters', 'wood'],
    rating: 4.4,
  },
];

const importData = async (): Promise<void> => {
  try {
    await connectDB();
    await MenuItem.deleteMany();
    await MenuItem.insertMany([...menuItems, ...merchandiseItems]);
    console.log(`Data Imported! ${menuItems.length} menu items, ${merchandiseItems.length} merch`);
    process.exit();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

const destroyData = async (): Promise<void> => {
  try {
    await connectDB();
    await MenuItem.deleteMany();
    console.log('Data Destroyed!');
    process.exit();
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  void destroyData();
} else {
  void importData();
}
