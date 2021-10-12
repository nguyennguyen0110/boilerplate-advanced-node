const passport = require('passport');

//Create middleware ensureAuthenticated() to ensure
//user is authenticated else redirect to homepage '/'  
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

module.exports = function (app, myDataBase) {
  
  app.route('/').get((req, res) => {
    res.render(process.cwd() + '/views/pug', {
      title: 'Connected to Database',
      message: 'Please login',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  //Use passport.authenticate() middleware to authenticate
  //user before redirect to profile pug view
  app.post('/login', passport.authenticate('local', {failureRedirect: '/'}), (req, res) => {
    res.redirect('/profile');
  });

  //Use ensureAuthenticated() middleware to ensure user
  //is authenticated before render pug/profile view 
  app.get('/profile', ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/profile', {username: req.user.username});
  });

  //User log out, then redirect to home page '/'
  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });

  /*  
  Register new user, then authenticate, then redirect to '/profile' :
  app.post(
    '/register',
    (req, res, next) => {myDataBase.findOne()},
    passport.authenticate(),
    (req, res => {res.redirect()})
  );
  */
  app.post('/register', (req, res, next) => {
    //Hash password
    const hash = bcrypt.hashSync(req.body.password, 12);
    myDataBase.findOne({username: req.body.username}, (err, user) => {
      if (err) return next(err);
      //If user exist redirect to homepage
      else if (user) {
        res.redirect('/');
      }
      //else insert new user
      else {
        myDataBase.insertOne({
          username: req.body.username,
          //Use hash instead of req.body.password
          password: hash
        }, (err, doc) => {
          if (err) return next(err);
          // The inserted document is held within
          // the ops property of the doc
          else {
            next(null, doc.ops[0]);
          }
        });
      }
    });
  }, passport.authenticate('local', {failureRedirect: '/'}), (req, res) => {
    res.redirect('/profile');
  });

  //Authentication with GitHub
  app.get('/auth/github', passport.authenticate('github'));
  app.get('/auth/github/callback', passport.authenticate('github', {failureRedirect: '/'}), (req, res) => {
    req.session.user_id = req.user.id;
    res.redirect('/chat');
  });

  //Use ensureAuthenticated() middleware to ensure
  //user is authenticated before render pug/chat view 
  app.get('/chat', ensureAuthenticated, (req, res) => {
    res.render(process.cwd() + '/views/pug/chat', {user: req.user});
  });

  //Middleware handle missing pages (404)
  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });

}
