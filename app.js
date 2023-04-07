require('dotenv').config(); //This is the package we are using to hide our API keys.
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session'); //This is the package we are using to create sessions.
////////////////// Authentication 01 ///////////////////////
const passport = require('passport'); //This is the package we are using to authenticate users.
const passportLocalMongoose = require('passport-local-mongoose'); //The passport-local-mongoose plugin simplifies the process of adding username and password-based authentication to your Node.js application. It provides a convenient way to add local authentication (username and password) to your Mongoose models by extending the schema and adding methods for registering and authenticating users.
////////////////// Authentication 01 end ///////////////////////

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));  

////////////////// Authentication 02 ///////////////////////
//This should be placed after app.use and before mongoose.connect
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
})); //Telling app to use the session package.

app.use(passport.initialize()); //Telling app to use the passport package.
app.use(passport.session()); //Telling app to use the passport to deal with the sessions.
////////////////// Authentication 02 end ///////////////////////

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true})
.then(() => console.log('MongoDB connected...'))
.catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

////////////////// Authentication 03 ///////////////////////
userSchema.plugin(passportLocalMongoose); //This is the passport-local-mongoose plugin we are using. We are passing in the userSchema (The mongoose schema we created before) as a parameter to create our new mongoose model (User model). This is we are going to use to hash and salt our passwords and save them to our database.
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// passport-local-mongoose to define the authentication strategy for your application and to serialize and deserialize user sessions.

// passport.use(User.createStrategy()) - This line sets up the authentication strategy for your application using the createStrategy() method provided by passport-local-mongoose. It tells passport to use the username and password fields provided by passport-local-mongoose for authentication. This line of code should be placed after the passport-local-mongoose plugin has been added to your Mongoose schema.

// passport.serializeUser(User.serializeUser()) - This line sets up serialization of the user session. Serialization is the process of transforming user data into a format that can be stored in a session store. User.serializeUser() is a method provided by passport-local-mongoose that serializes the user data by storing the user's id in the session store.

// passport.deserializeUser(User.deserializeUser()) - This line sets up deserialization of the user session. Deserialization is the process of transforming serialized user data back into usable user data. User.deserializeUser() is a method provided by passport-local-mongoose that retrieves the user's id from the session store and retrieves the corresponding user object from the database.

// These three lines of code are essential for implementing authentication in a Node.js application using passport-local-mongoose. They define the authentication strategy, serialize and deserialize user sessions, and enable passport to authenticate users and maintain sessions across multiple requests.
////////////////// Authentication 03 end ///////////////////////

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", (req, res) => {
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.redirect("/login");
    // }
    User.find({"secret": {$ne:null}})
    .then((foundUser)=>{
      res.render("secrets",{usersWithSecrets: foundUser})
    })
    .catch((err)=>{
      console.log(err);
    });
});

app.get("/logout", (req, res) => {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});



app.get("/submit", (req, res) => {
  if(req.isAuthenticated()){
    res.render("submit");
}else{
    res.redirect("/login");
}
});

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;

  console.log(req.user.id);

  User.findById(req.user.id)
  .then((foundUser) => {
    if(foundUser){
      foundUser.secret=submittedSecret;
      foundUser.save()
      .then(result => {
        res.redirect("/secrets");
      })
      .catch(err => {
        console.log(err);
      });
    }
  })
  .catch((err) => {
    console.log(err);
  });
});

app.post("/register", (req, res) => {
    User.register({username: req.body.username}, req.body.password, function (err, user){
        if (err) {
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
    
    
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err) {
            console.log(err);
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    })

});





app.listen(3000, function() {
  console.log("Server started on port 3000");
});