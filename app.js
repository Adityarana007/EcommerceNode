const express = require('express')
const dotenv =  require('dotenv')
const connectDB =  require('./config/db');
const User = require('./models/User');
// const userRoute = require('./routes/auth')
// import { v4 as uuidv4 } from 'uuid';
const authRoute = require('./routes/auth');
const auth = require('./middlewares/authMiddleware');
const bcrypt = require("bcryptjs");



dotenv.config();
connectDB();

const app = express();

// Middleware

app.use(express.urlencoded({extended: false}))
app.use(express.json());    

app.use('/api/auth', authRoute);

app.get('/api/protected', auth, (req, res) => {
    res.json({ message: 'You are authorized', user: req.user });
});


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

    if (!email || !password || !confirmPassword) {
        return res.status(400).json({ error: 'Email, password, and confirm password are required', statusCode: 400 });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Password and confirm password do not match', statusCode: 400 });
    }

    try {
        const normalizedEmail = email.toLowerCase(); // normalize to lowercase
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





// server listen
app.listen(process.env.PORT || 3000 , () => {
    console.log(`Server running on port http://localhost:${process.env.PORT}`)
})