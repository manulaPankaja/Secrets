//jshint esversion:6
require('dotenv').config(); //This is the package we are using to hide our API keys.
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
//const encrypt = require("mongoose-encryption"); //This is the encryption package we are using.
const md5 = require("md5"); //This is the md5 package we are using. npm i md5 

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true})
.then(() => console.log('MongoDB connected...'))
.catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    email:String,
    password:String
});


//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields:["password"] }); //This is the encryption plugin we are using. We are passing in the secret key we created above. It's important to add this plugin to the schema before creating the mongoose model. Because we are passing in the userSchema as a parameter to create our new mongoose model (User model). encryptedFields is an array of the fields we want to encrypt. In this case we only have one field which is the password field.

const User = new mongoose.model("User", userSchema);



app.get("/", (req, res) => {
    res.render("home");
});
app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: md5(req.body.password) // Use the md5 hash function to encrypt the password.
    });

    newUser.save()
    .then(() => res.render("secrets")) //Haven't created the secrets get route. Because we don't want to render that until the user is registered or logged in.
    .catch(err => console.log(err));
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = md5(req.body.password); //comparing the encrypted password to the encrypted password in the database. (using md5)

    User.findOne({email: username})
    .then((foundUser) => {
        if(foundUser){
            if(foundUser.password === password){
                res.render("secrets"); //
                //console.log(foundUser.password); This is the encrypted password.  
            }
        }
    })
    .catch(err => console.log(err));

});





app.listen(3000, function() {
  console.log("Server started on port 3000");
});