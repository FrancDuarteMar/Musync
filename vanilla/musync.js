const express = require("express")
const handlers = require("./lib/handlers")
const Spotify = require("./lib/spotify")
const Apple = require("./lib/apple")
const expressSession = require("express-session")
const {
    credentials
} = require("../config")
const passport = require('passport')
if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}
let playlistSpotify = []
const {
    engine: expressHandlebars
} = require("express-handlebars")
const SpotifyStrategy = require('passport-spotify').Strategy;
const app = express()
const port = process.env.PORT || 3000

const bodyParser = require('body-parser')

app.use(bodyParser.json())

app.set("view cache", true)
app.set('view engine', 'handlebars')
app.use(express.static(__dirname + '/public'))
app.disable("x-powered-by")

// localStorage.clear()

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
                "accessToken": accessToken,
                "refreshToken": refreshToken,
                "expires": expires_in,
                "profile": profile

            });
            
            localStorage.setItem("sAccessToken", accessToken)
            localStorage.setItem("sRefreshToken", refreshToken)
            localStorage.setItem("sExpires", expires_in)
            localStorage.setItem("sProfile", JSON.stringify(profile))

            process.nextTick(function () {
                return done(null, profile);
            });

        }
    )
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/', handlers.home)

app.use('/list/spotify', function (req, res, next) {

    next()
})


app.get("/list/spotify", function (req, res) {
    // const spotifyData = await getProfile(localStorage.getItem("sAccessToken"))

    Spotify.getProfile(localStorage.getItem("sAccessToken")).then(
        result => {
            localStorage.setItem("sID", result["id"])
        }).
    then((resultPlaylist) => {
        return Spotify.getPlaylists(localStorage.getItem("sAccessToken"), localStorage.getItem("sID"),playlistSpotify)
    }).
    then((resPlay) => {
            let jsonPlaylist = {}
            localStorage.setItem("https://open.spotify.com/playlist/0zi3jm9as2u0q0nOGJC2KC", JSON.stringify(resPlay))
            let count = 0
            for (const elem of playlistSpotify) {
                jsonPlaylist[count] = elem
                // console.log(elem)
            }
            // console.log("Json elem at 0: "+ JSON.stringify(jsonPlaylist[0]["name"]))
            // console.log("Array at 0: " + JSON.stringify(playlistSpotify[0]))
            // console.log()
            // console.log(JSON.stringify(localStorage.getItem("sPlaylist")))

        })
        .then(

            res.render("home", {
                accessToken: localStorage.getItem("sAccessToken"),
                refreshToken: localStorage.getItem("sRefreshToken"),
                expires_in: localStorage.getItem("sExpires"),
                profile: JSON.stringify(localStorage.getItem("sProfile")),
                id: localStorage.getItem("sID"),
                profileData: JSON.stringify((playlistSpotify[0])),
                spotifyPlaylist: encodeURIComponent(JSON.stringify(playlistSpotify))
            })
        ).catch(err => {
            console.log(err);
            res.sendStatus(501);
        })
})

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
        // scope: ["playlist-read-private"],

        scope: ['user-read-email', 'user-read-private', "playlist-read-private", 'user-library-read'],
        showDialog: true,
    })
);

app.get(
    authCallbackPath,
    passport.authenticate('spotify', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        res.redirect('/');
    }
);

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


app.post("/applelogin", function (req, res) {
    console.log(req.body)
    localStorage.setItem("appleToken", req.body.appleToken)
    res.sendStatus(400)

})
app.get("/auth/apple", function (req, res) {

    // console.log(req.body["apple"])

    res.render("apple", {
        devToken: credentials.apple.devToken
    })
})

async function appleMusicTest() {
    var response = await fetch(`https://api.music.apple.com/v1/catalog/us/search?types=songs&term=Soledad+y+el+mar`, {
        headers: {
            Authorization: 'Bearer ' + credentials.apple.devToken,
            "Media-User-Token": localStorage.getItem("appleToken")
        }
    })
    let thisResp = await response
    // let item = await thisResp.text() 
    let data = await thisResp.json();
    // playlists.push(data['items'])
    // for (const elem of data['items']) {
    //     playlists.push(elem)
    //     playlistSpotify.push(elem)
    // }

    console.log(data.results.songs.data[0])

    // console.log(data.results.songs.data[0].id)
    return data

}
app.get("/loadapple", function (req, res) {

    res.send(appleMusicTest())
})

app.get("/newplaylist", function (req,res) {
    
    let id = Apple.newPlaylist(credentials.apple.devToken, localStorage.getItem("appleToken"),JSON.parse(localStorage.getItem("aSongIDs")),localStorage.getItem("sPlaylistName"))
    id.then(function(result) {
        console.log(result)
    })
  })

app.get("/songs",function(req,res){
    let songs = Apple.searchSongs(credentials.apple.devToken, localStorage.getItem("appleToken"),null)
    songs.then(function(result){
        localStorage.setItem("aSongIDs",JSON.stringify(result))
        console.log(result)
    })
})
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