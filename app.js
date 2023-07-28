const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require('passport-local').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");
const axios = require("axios");
const date = require(__dirname + "/date.js");
require("dotenv").config();

const app = express();

app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: "My secret",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());


const URL = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@cluster0.mtwlrzs.mongodb.net/todoDB`;

mongoose.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Successfully connected to the database.");
    })
    .catch(err => {
        console.log("Error connecting to the database:", err);
    });

const itemSchema = {
    name: String
};

const userSchema = new mongoose.Schema({
    email: String,
    name: String,
    password: String,
    googleId: String,
    githubId: String,
    items: [itemSchema]
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id)
        .then(user => done(null, user))
        .catch(err => done(err, null));
});


passport.use(new LocalStrategy(User.authenticate()));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "https://todo-list-rfeb.onrender.com/auth/github/todo"
},
    function (accessToken, refreshToken, profile, done) {

        const { id, displayName } = profile;
        User.findOrCreate({ githubId: id, name: displayName }, function (err, user) {
            if (err) {
                return done(err);
            }
            return done(null, user);
        });

    }
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://todo-list-rfeb.onrender.com/auth/google/todo",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
}, (accessToken, refreshToken, profile, done) => {
    const { id, displayName } = profile;
    User.findOrCreate({ googleId: id, name: displayName }, function (err, user) {
        if (err) {
            return done(err);
        }
        return done(null, user);
    });
}));


const formatedDate = date.getDate();

app.get("/", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("signup");
});

app.get("/logout", (req, res) => {
    req.logout(() => {
        res.redirect("/");
    });
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/todo',
    passport.authenticate('google', { failureRedirect: "/" }),
    (req, res) => {
        // Successful authentication
        res.redirect("/todo");
    }
);

app.get('/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/auth/github/todo',
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => {
        // Successful authentication
        res.redirect('/todo');
    }
);

app.get('/todo', (req, res) => {

    if (req.isAuthenticated()) {

        User.findById(req.user.id)
            .then((foundUser) => {
                if (foundUser && foundUser.items.length === 0) {
                    const defaultItems = [
                        { name: "Hey👋 " + req.user.name },
                        { name: "Welcome to your todolist 💝" }
                    ];
                    foundUser.items = defaultItems;
                    foundUser.save()
                        .then(() => { console.log("Default Items Inserted Successfully") })
                        .catch(error => { console.log("Error Inserting Documents: ", error) });
                }
                res.render("list", { listTitle: formatedDate, listArray: foundUser.items });
            })
            .catch(err => {
                console.log("Error Finding Documents: ", err);
                res.redirect("/");
            });

    } else {
        // If not authenticated, redirect to the home page
        res.redirect("/");
    }
});


app.post('/todo', (req, res) => {
    const newItem = req.body.newItem;
    if (newItem === null || newItem === undefined || newItem.trim() === "") {
        res.redirect("/todo");
    } else {
        const item = { name: newItem };
        User.findOneAndUpdate(
            { _id: req.user.id },
            { $push: { items: item } },
            { new: true } // returns updated list
        )
            .then(updatedList => {
                if (updatedList) {
                    console.log("New Item Added");
                } else {
                    console.log("Cannot Add Item");
                }
                res.redirect('/todo');
            })
            .catch(err => {
                console.log("Error finding/updating Items:", err);
                res.redirect('/todo');
            });
    }
});

app.post('/delete', async (req, res) => {
    const userId = req.user.id;
    const checkboxID = req.body.checkboxID;

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { items: { _id: checkboxID } } },
            { new: true }
        );
        console.log("Item deleted from the database");
        res.redirect('/todo');
    } catch (err) {
        console.error('Error deleting item:', err);
        res.redirect('/todo');
    }
});

app.post("/login", passport.authenticate('local', {
    successRedirect: '/todo',
    failureRedirect: '/'
}));


app.post("/register", async (req, res) => {

    const { name, email, password } = req.body;

    // Validate email using ZeroBounce API
    try {
        const apiKey = process.env.ZEROBOUNCE_API_KEY;
        const response = await axios.get(`https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`);
        const { status } = response.data;

        if (status === 'valid') {

            User.register(new User({ email, name }), password, (err, user) => {
                if (err) {
                    console.error(err);
                    return res.redirect('/register');
                }

                req.login(user, function (err) {
                    if (err) {
                        console.error(err);
                        return res.redirect('/');
                    }
                    return res.redirect('/todo');
                });
            });

        } else {
            return res.status(400).json({ message: 'Invalid Email, Please Enter a Valid Email Address.' });
        }

    } catch (error) {
        console.error('Email validation error:', error);
        return res.status(500).json({ message: 'Email validation failed. Please try again later.' });
    }


});


// 404 error handler
app.use((req, res) => {
    res.status(404).send("Page not found");
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server Listening on port ${port}`);
});