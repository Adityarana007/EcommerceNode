const express = require('express')
const dotenv =  require('dotenv')
const connectDB =  require('./config/db');
const User = require('./models/User');
// const userRoute = require('./routes/auth')
// import { v4 as uuidv4 } from 'uuid';
const authRoute = require('./routes/auth');
const auth = require('./middlewares/authMiddleware');
const bcrypt = require("bcryptjs");
const Category = require('./models/Category');
const upload = require('./config/multer');
const path = require('path');
const Product = require('./models/Product');



dotenv.config();
connectDB();

const app = express();

// Get base URL from environment or use default
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Middleware

app.use(express.urlencoded({extended: false}))
app.use(express.json());    

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoute);

// Routes
// app.use('/api/auth', require('./routes/authRoutes'));
app.get('/api/user/:id', async (req, res) => {
    // console.log(req.params.id)
    const existingUser = await User.findOne({ userId: req.params.id });
    if(!existingUser) return res.status(404).json({error: 'user not found'})
    return res.json(existingUser);
  });

  app.get('/api/getusers', async (req, res) => {
    // const user = await User.findById(req.params.id);
    const user = await User.find({});
    if(!user) return res.status(404).json({error: 'user not found'})
    return res.json(user);
  })

  app.post('/api/register', async (req, res) => {
    const body = req.body;
    const email = body.email?.toLowerCase(); // Normalize to lowercase
    console.log('body__', body);

    try {
        if (body.password !== body.confirmPassword) {
            return res.status(400).json({ error: "Password and confirm password do not match.", statusCode: 400 });
        }

        // Check if the email already exists (case-insensitive)
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists.', statusCode: 400 });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(body.password, salt);
        const hashedConfirmPassword = await bcrypt.hash(body.confirmPassword, salt);

        // Find the highest userId in the database
        const lastUser = await User.findOne().sort({ userId: -1 });
        const newUserId = lastUser ? lastUser.userId + 1 : 1;

        // Create a new user with lowercase email
        const result = await User.create({
            email,
            password: hashedPassword,
            confirmPassword: hashedConfirmPassword,
            userId: newUserId
        });

        console.log('resultCreate', result);
        return res.status(201).json({
            message: 'User created successfully',
            statusCode: 201,
            user: result
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
});


// verify email in db
app.post('/api/verifyEmail', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required', statusCode: 400 });
    }

    try {
        const normalizedEmail = email.toLowerCase(); // normalize to lowercase
        const user = await User.findOne({ email: normalizedEmail });

        if (user) {
            return res.status(200).json({ message: 'Email verified', statusCode: 200 });
        } else {
            return res.status(404).json({ error: 'Email does not exist', statusCode: 404 });
        }
    } catch (error) {
        console.error('Error checking email:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
});


// update password
app.post('/api/updatepassword', async (req, res) => {

    let { email, password, confirmPassword } = req.body;
console.log(email, password)
    if (!email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'Email, password, and confirm password are required', statusCode: 400 });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Password and confirm password do not match', statusCode: 400 });
    }

    try {
        const normalizedEmail = email.toLowerCase(); // normalize to lowercase
        console.log('normalizedEmail__', normalizedEmail)
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ error: 'User with this email does not exist', statusCode: 404 });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const hashedConfirmPassword = await bcrypt.hash(confirmPassword, salt);

        user.password = hashedPassword;
        user.confirmPassword = hashedConfirmPassword;
        await user.save();

        return res.status(200).json({ message: 'Password updated successfully', statusCode: 200 });
    } catch (error) {
        console.error('Error updating password:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
});

app.post('/api/categories', upload.single('photo'), async (req, res) => {
    const { name, description } = req.body;
  
    if (!name) {
        return res.status(400).json({ error: 'Category name is required', statusCode: 400 });
    }
  
    try {
        // Check if category already exists
        const existingCategory = await Category.findOne({ name: name.trim().toLowerCase() });
        if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists', statusCode: 400 });
        }
    
        const category = await Category.create({
            name: name.trim().toLowerCase(),
            description,
            photo: req.file ? `/uploads/categories/${req.file.filename}` : null
        });

        // Transform the category to include full URL
        const categoryWithFullUrl = {
            ...category.toObject(),
            photo: category.photo ? `${BASE_URL}${category.photo}` : null
        };
    
        return res.status(201).json({ 
            message: 'Category created successfully', 
            category: categoryWithFullUrl, 
            statusCode: 201 
        });
    } catch (error) {
        console.error('Error creating category:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
});
  

  app.get('/api/getCategories', async (req, res) => {
    try {
        const categories = await Category.find({});
        // Transform the categories to include full URLs
        const categoriesWithFullUrls = categories.map(category => ({
            ...category.toObject(),
            photo: category.photo ? `${BASE_URL}${category.photo}` : null
        }));
        return res.status(200).json({ data: categoriesWithFullUrls, statusCode: 200 });
    } catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({ error: 'Internal server error', statusCode: 500 });
    }
  });
  

// Product APIs
app.post('/api/products', upload.array('images', 5), async (req, res) => {
    const {
        name,
        description,
        price,
        discount,
        category,
        stock,
        brand,
        specifications,
        isActive
    } = req.body;

    try {
        // Validate required fields
        if (!name || !description || !price || !stock) {
            return res.status(400).json({
                error: 'Missing required fields',
                statusCode: 400
            });
        }

        // console.log(Category.findOne({name: category}))

        // Find category by name (case-insensitive)
        // const categoryExists = await Category.findOne({ 
        //     name: category
        // });
        // console.log('categoryExists', categoryExists)

        // if (!categoryExists) {
        //     return res.status(400).json({
        //         error: 'Category does not exist',
        //         statusCode: 400
        //     });
        // }

        // Process images
        const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];
        console.log('specifications', specifications)
        // Create product
        const product = await Product.create({
            name,
            description,
            price: Number(price),
            discount: Number(discount) || 0,
            // category: categoryExists._id, // Use the found category's ID
            images,
            stock: Number(stock),
            brand,
            specifications: specifications ? specifications: {},
            isActive: isActive === 'true'
        });

        // Transform the product to include full URLs
        const productWithFullUrls = {
            ...product.toObject(),
            images: product.images.map(image => `${BASE_URL}${image}`)
        };

        return res.status(201).json({
            message: 'Product created successfully',
            product: productWithFullUrls,
            statusCode: 201
        });
    } catch (error) {
        console.error('Error creating product:', error);
        return res.status(500).json({
            error: 'Internal server error',
            statusCode: 500
        });
    }
});

// Get all products with filtering, sorting, and pagination
app.get('/api/products', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = '-createdAt',
            category,
            minPrice,
            maxPrice,
            search,
            brand,
            inStock
        } = req.query;

        // Build filter object
        const filter = {};

        // Category filter
        if (category) {
            filter.category = category;
        }

        // Price range filter
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // Brand filter
        if (brand) {
            filter.brand = new RegExp(brand, 'i');
        }

        // Stock filter
        if (inStock === 'true') {
            filter.stock = { $gt: 0 };
        }

        // Search filter
        if (search) {
            filter.$or = [
                { name: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') }
            ];
        }

        // Calculate skip value for pagination
        const skip = (Number(page) - 1) * Number(limit);

        // Get total count for pagination
        const total = await Product.countDocuments(filter);

        // Get products with filters, sorting, and pagination
        const products = await Product.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(Number(limit))
            .populate('category', 'name');

        // Transform products to include full URLs
        const productsWithFullUrls = products.map(product => ({
            ...product.toObject(),
            images: product.images.map(image => `${BASE_URL}${image}`)
        }));

        return res.status(200).json({
            data: productsWithFullUrls,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            },
            statusCode: 200
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({
            error: 'Internal server error',
            statusCode: 500
        });
    }
});

// Get product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name')
            .populate('reviews.user', 'email');

        if (!product) {
            return res.status(404).json({
                error: 'Product not found',
                statusCode: 404
            });
        }

        // Transform product to include full URLs
        const productWithFullUrls = {
            ...product.toObject(),
            images: product.images.map(image => `${BASE_URL}${image}`)
        };

        return res.status(200).json({
            data: productWithFullUrls,
            statusCode: 200
        });
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({
            error: 'Internal server error',
            statusCode: 500
        });
    }
});

// server listen
app.listen(process.env.PORT || 3000 , () => {
    console.log(`Server running on port http://localhost:${process.env.PORT}`)
})