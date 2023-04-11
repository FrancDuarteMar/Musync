const express = require("express")
const handlers = require("./lib/handlers")
const expressSession = require("express-session")
const {
    credentials
} = require("./config")
const passport = require('passport')
const {
    engine: expressHandlebars
} = require("express-handlebars")
const SpotifyStrategy = require('passport-spotify').Strategy;
const app = express()
const port = process.env.PORT || 3000

app.set("view cache", true)
app.set('view engine', 'handlebars')
app.use(express.static(__dirname + '/public'))
app.disable("x-powered-by")

var authCallbackPath = '/auth/spotify/callback';

app.use(expressSession({
    resave: true,
    saveUninitialized: true,
    secret: credentials.cookieSecret,
}))


app.engine('handlebars', expressHandlebars({
    defaultLayout: 'main',
    helpers: {
        section: function (name, options) {
            if (!this._sections) this._sections = {}
            this._sections[name] = options.fn(this)
            return null
        },
    },
}))

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    done(null, obj);
});


passport.use(
    new SpotifyStrategy({
            clientID: credentials.spotify.client_id,
            clientSecret: credentials.spotify.client_secret,
            callbackURL: 'http://localhost:3000/auth/spotify/callback'
        },
        function (accessToken, refreshToken, expires_in, profile, done) {
            localStorage.setItem("spotify", {
                "accessToken":accessToken,
                "refreshToken": refreshToken,
                "expires":expires_in,
                "profile": profile
    
            });

            console.log("Access Token: "+accessToken)
            console.log("Refresh Token: "+refreshToken)
            console.log("Profile: "+ profile)

            process.nextTick(function () {
                // To keep the example simple, the user's spotify profile is returned to
                // represent the logged-in user. In a typical application, you would want
                // to associate the spotify account with a user record in your database,
                // and return that user instead.
                return done(null, profile);
              });
            // User.findOrCreate({
            //     spotifyId: profile.id
            // }, function (err, user) {
            //     return done(err, user);
            // });
        }
    )
);


app.use(passport.initialize());
app.use(passport.session());


app.get('/', handlers.home)

app.get('/auth/spotify', passport.authenticate('spotify'));

app.get(
    '/auth/spotify/callback',
    passport.authenticate('spotify', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/');
    }
);

app.get(
    '/auth/spotify',
    passport.authenticate('spotify', {
      scope: ['user-read-email', 'user-read-private','playlist-read-private','playlist-read-collaborative','user-top-read','user-library-read'],
      showDialog: true,
    })
  );

  app.get(
    authCallbackPath,
    passport.authenticate('spotify', {failureRedirect: '/login'}),
    function (req, res) {
      res.redirect('/');
    }
  );

  app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });


if (require.main === module) {
    app.listen(port, () => console.log(`Express started in ` +
        `${app.get('env')} mode at http://localhost:${port}` +
        `; press Ctrl-C to terminate.`))
} else {
    module.exports = app
}

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  }