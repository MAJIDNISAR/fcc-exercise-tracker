const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')

const shortid = require('shortid');


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// CREATE A NEW USER
app.post("/api/exercise/new-user", async (req, res) => {
  console.log("New user received: " + req.body.username);
  let newUser = new User({username: req.body.username});
  try {
    const results = await newUser.save();
    res.json({ _id: results._id, username: results.username });
  } catch (e) {
    console.log(e);
    res.send(e.code === 11000 ? "Username already exists" : "An error occurred");
  }
});

// GET LIST OF USERS
app.get("/api/exercise/users", async (req, res) => {
  try {
    const results = await User.find({}, { log: 0 });
    console.log(results);
    res.send(results);
  } catch(e) {
    console.log(e);
    res.send("An error occurred");
  }
});

// ADD NEW EXERCISE
app.post("/api/exercise/add", async (req, res) => {
  const user = await User.findById(req.body.userId);
  console.log(user);
  if(!user) {
    res.send("userId " + req.body.userId + " not found");
    return;
  } 
  const exercise = { 
    description: req.body.description,
    duration: req.body.duration
  }
  // if a date was provided, set it in the exercise
  if(req.body.date) exercise.date = req.body.date
  user.log.push(exercise);
  
  try {
    await user.save();
    res.json(user);
  } catch(e) {
    console.log(e);
    res.send("Sorry, there was an error saving the exercise.");
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})



const dbConfig = { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true};
const userSchema = new mongoose.Schema({
  _id: { type: String, default: shortid.generate },
  username: { type: String, required: true, unique: true },
  log: [{
    _id: false,
    description: String,
    duration: Number,
    date: { type: Date, default: Date.now }
  }]
});
const User = mongoose.model('User', userSchema);

mongoose
  .connect(process.env.MLAB_URI, dbConfig)
  .then(result => {
    // start the server
    const listener = app.listen(process.env.PORT || 3000, () => {
        console.log('App is listening on port ' + listener.address().port)
    });
  })
  .catch(err => {
    console.log(err);
  });


