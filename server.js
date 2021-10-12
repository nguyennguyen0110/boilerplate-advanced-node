 'use strict';
require('dotenv').config();
const express = require('express');
const app = express();
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
//Import 'passport' and 'session'
const passport = require('passport');
const session = require('express-session');
//Import ObjectID to use Mongo _id
const ObjectID = require('mongodb').ObjectID;
//Import 'passport-local' to use local strategy for allowing users to authenticate based on locally saved information
const LocalStrategy = require('passport-local');
//Import bcrypt to hash password to secure information
const bcrypt = require('bcrypt');
//Import module routes and auth
const routes = require('./routes.js');
const auth = require('./auth.js');
//Import socket.io for real-time communication between the server
//and connected clients, with http (comes built-in with Nodejs)
const http = require('http').createServer(app);
const io = require('socket.io')(http);
//NOTE: Now that the http server is mounted on the express app, you need to listen from the http server. Change the line with app.listen to http.listen

//Import these to authorize with Socket.IO
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

//Set 'pug' as view engine so express know pug is template engine
app.set('view engine', 'pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Setup express to use 'session' and 'passport.initialize()', 'passport.session()'
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));
app.use(passport.initialize());
app.use(passport.session());

const onAuthorizeSuccess = (data, accept) => {
  console.log('successful connection to socket.io');
  accept(null, true);
}
const onAuthorizeFail = (data, message, error, accept) => {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

//Tell Socket.IO to use passportSocketIo for authorization
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  store: store,
  success: onAuthorizeSuccess,
  fail: onAuthorizeFail
}));

//Connect to database then listen to request
myDB(async client => {
  const myDataBase = await client.db('database').collection('users');

  //Use module routes instead of write code for all the routes here
  routes(app, myDataBase);

  //Use module auth instead of write all the code for authentication here
  auth(app, myDataBase);

  let currentUsers = 0;
  //Use io.on() to listen for a new connection from the client
  io.on('connection', socket => {
    console.log('user ' + socket.request.user.name + ' connected');
    ++currentUsers;
    io.emit('user', {name: socket.request.user.name, currentUsers, connected: true});
    socket.on('disconnect', () => {
      console.log('user ' + socket.request.user.name + ' disconnected');
      --currentUsers;
      io.emit('user', {name: socket.request.user.name, currentUsers, connected: false});
    });
    socket.on('chat message', message => {
      io.emit('chat message', {name: socket.request.user.name, message});
    });
  });
  
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render(process.cwd() + '/views/pug', {title: e, message: 'Unable to login'});
  });
});

// app.listen out here...
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
