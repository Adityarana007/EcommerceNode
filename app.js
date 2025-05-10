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

// app.use("/user", userRoute);

app.use('/api/auth', authRoute);



app.get('/api/protected', auth, (req, res) => {
    res.json({ message: 'You are authorized', user: req.user });
});


// Routes
// app.use('/api/auth', require('./routes/authRoutes'));
app.get('/api/user/:id', async (req, res) => {
    console.log(req.params.id)
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
    console.log('BODY', body);

    try {
        // Check if the email already exists
        const existingUser = await User.findOne({ email: body.email });
        console.log('existingUser', existingUser);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists.', statusCode: 400 });
        }

        // Find the highest userId in the database
        const lastUser = await User.findOne().sort({ userId: -1 }); // Sort by userId in descending order
        const newUserId = lastUser ? lastUser.userId + 1 : 1; // Increment or start with 1

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(body.password, salt);
        const hashedConfirmPassword = await bcrypt.hash(body.confirmPassword, salt);


        // Create a new user with the incremented userId
        const result = await User.create({
            email: body.email,
            password: hashedPassword,
            confirmPassword: hashedConfirmPassword,
            userId: newUserId
        });

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


// server listen
app.listen(process.env.PORT || 3000 , () => {
    console.log(`Server running on port http://localhost:${process.env.PORT}`)
})