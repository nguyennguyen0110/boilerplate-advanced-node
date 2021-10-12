//Require and configure dotenv to use environment variables
require('dotenv').config();
//Import passport
const passport = require('passport');
//Import 'passport-local' to use local strategy for allowing users to authenticate based on locally saved information
const LocalStrategy = require('passport-local');
//Import GitHubStrategy for GitHub authentication
const GitHubStrategy = require('passport-github').Strategy;

module.exports = function (app, myDataBase) {

  // Serialization and deserialization here...
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    });
  });

  //Setup passport to use an instantiated LocalStrategy object
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({username: username}, (err, user) => {
      console.log('User '+ username +' attempted to log in.');
      if (err) return done(err);
      if (!user) return done(null, false);
      //Use bcrypt to compare because password is hash
      if (!bcrypt.compareSync(password, user.password)) return done(null, false);
      return done(null, user);
    });
  }));

  //Setup passport to use an instantiated GitHubStrategy
  //passport.use(new GitHubStrategy( {object}, callback() ));
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: 'https://boilerplate-advanced-node.nguyennguyen50.repl.co/auth/github/callback'
  },
  //This is callback function in passport.use
  (accessToken, refreshToken, profile, cb) => {
    //Database logic here with callback containing our user object:
    //  myDataBase.findOneAndUpdate(
    //    {id: profile.id},
    //    {$setOnInsert: {}, $set: {}, $inc: {}},
    //    {upsert: true, new: true},
    //    (err, doc) => { return cb(null, doc.value); }
    //  );
    myDataBase.findOneAndUpdate(
      { id: profile.id },
      {
        $setOnInsert: {
          id: profile.id,
          name: profile.displayName || 'John Doe',
          photo: profile.photos[0].value || '',
          email: Array.isArray(profile.emails)
            ? profile.emails[0].value
            : 'No public email',
          created_on: new Date(),
          provider: profile.provider || ''
        },
        $set: {
          last_login: new Date()
        },
        $inc: {
          login_count: 1
        }
      },
      { upsert: true, new: true },
      (err, doc) => {
        return cb(null, doc.value);
      }
    );
  }
  //End of callback function in passport.use
  ));
  
}
