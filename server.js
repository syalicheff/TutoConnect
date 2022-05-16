if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require("express")
const app = express()
const bcrypt = require("bcrypt")
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
// BDD
const db = require("./models");

const initializePassport = require("./passport-config")

db.mongoose
    .connect('mongodb+srv://App_Autoequip:Autoequip94@cluster0.kjbyh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("Successfully connect to MongoDB.");
    })
    .catch(err => {
        console.error("Connection error", err);
        process.exit();
    });
    getUsers(db).then((users) => {
        initializePassport(
            passport,
            email => users.find(user => user.email === email),
            id => users.find(user => user.id === id)
        )
        //console.log(users)
    })

    app.set('view-engine', 'ejs')
    app.use(express.urlencoded({extended: true}))
    app.use(flash())
    app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
    }))
    app.use(passport.initialize())
    app.use(passport.session())
    app.use(methodOverride('_method'))
    const checkRoles = (text) => {
        return (req, res, next) => {
          if(req.user.roles.includes(text)){
                next();
            }
            else{
                res.send("Vous ne possédez pas les permissions nécéssaires")
            } 
        };
      };
    app.get('/', checkAuthenticated , checkRoles('admin'), async(req, res) => {

        res.render('index.ejs', { name: req.user.username })
    })
    
    app.get('/login', checkNotAuthenticated, (req, res) => {
        res.render('login.ejs')
    })
    
    app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true
    }))
    
    app.get('/register', checkNotAuthenticated, (req, res) => {
        res.render('register.ejs')
    })
    app.get('/test', checkAuthenticated , checkRoles('admin'), (req, res) => {
        //res.render('register.ejs')
    })
    
    app.post('/register', checkNotAuthenticated, async (req, res) => {
        try {
            const hashedPassword = await bcrypt.hash(req.body.password, 10)
            var newUser = new db.user({ username: req.body.username, email: req.body.email,  password: hashedPassword ,roles: req.body.roles})
            newUser.save(function (err, user) {
                if (err) return console.error(err);
                console.log(user.username + " a été crée");
              });
            res.redirect('/login')
        } catch (err){
            console.log(err)
            res.redirect('/register')
        }
    })
    app.delete('/logout', (req, res) => {
        req.logOut()
        res.redirect('/login')
    })

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next()
    }
    res.redirect('/login')
}
function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/')
    }
    next()
}

async function getUsers(db){
    return new Promise(function(resolve, reject) {
        db.user.find({},'id email password username roles').then(function (users) {
            resolve(users)   
        });  
    })
}
app.listen(8080)