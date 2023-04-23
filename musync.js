const express = require("express")
const Spotify = require("./lib/spotify")
const Apple = require("./lib/apple")
const expressSession = require("express-session")
const {
    credentials
} = require("./config")
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
const cookieParser = require('cookie-parser');

app.use(bodyParser.json())
app.use(cookieParser());
app.use(expressSession({
    resave: true,
    saveUninitialized: true,
    secret: credentials.cookieSecret,
}))
app.set("view cache", true)
app.set('view engine', 'handlebars')
app.use(express.static(__dirname + '/public'))
app.disable("x-powered-by")

app.use(passport.initialize());
app.use(passport.session());
// localStorage.clear()
var redirect_uri = 'http://localhost:3000/auth/spotify/callback';

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
            callbackURL: redirect_uri
        },
        function (accessToken, refreshToken, expires_in, profile, done) {

            // console.log(accessToken)
            // console.log("spotify access token: "+accessToken)
            localStorage.setItem("sAccessToken", accessToken)
            localStorage.setItem("sRefreshToken", refreshToken)
            localStorage.setItem("sExpires", expires_in)
            localStorage.setItem("sProfile", JSON.stringify(profile))
            localStorage.setItem('sIDID', profile["id"])

            process.nextTick(function () {
                return done(null, profile);
            });

        }
    )
);

app.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
        res.redirect('/'); //Inside a callback… bulletproof!
    });
})


app.get('/', function (req, res) {
    console.log("AUTH INFO: " + req.isAuthenticated())
    if (req.isAuthenticated()) {
        res.render("home", {
            newID: req.cookies["aPlaylist"]
        })
    } else {
        res.render("home", {
            auth: true,
            newID: req.cookies["aPlaylist"]
        })
    }

})
app.get('/finished', function (req, res) {
    res.render("home", {
        newID: req.cookies["aPlaylist"]
    })
})

app.get("/set-profile", function (req, res) {

    res.cookie("appleToken", localStorage.getItem("appleToken"))
    res.cookie("sAccessToken", localStorage.getItem('sAccessToken'))
    res.cookie("sID", localStorage.getItem("sIDID"))

    localStorage.removeItem("appleToken")
    localStorage.removeItem("sAccessToken")
    localStorage.removeItem("sRefreshToken")
    localStorage.removeItem("sExpires")
    localStorage.removeItem("sProfile")
    localStorage.removeItem('sIDID')

    res.redirect("/playlists")
})

app.get("/playlists", function (req, res) {
    // const spotifyData = await getProfile(localStorage.getItem("sAccessToken"))

    let playlists = Spotify.getPlaylists(req.cookies["sAccessToken"], req.cookies["sID"], playlistSpotify)
    playlists.then(() => {
        localStorage.setItem(`${req.cookies["sID"]}-playlistArr`, JSON.stringify(playlistSpotify))
        res.render("playlists", {
            spotifyPlaylist: encodeURIComponent(localStorage.getItem(`${req.cookies["sID"]}-playlistArr`))

        })
    }).catch(err => {
        console.log(err);
        res.sendStatus(501);
    })
})

app.get("/playlist/:playlistID&:title", function (req, res) {
    // console.log("choice id is " + req.params.playlistID);
    // console.log("Title is :"+decodeURIComponent(req.params.title))
    let songs = []
    localStorage.setItem(`${req.cookies['sID']}-spotifyPlaylistID`, req.params.playlistID)
    let results = Spotify.getPlaylistSongs(req.cookies['sID'], req.cookies['sAccessToken'], req.params.playlistID, songs)
    results.then(function (resData) {

        localStorage.setItem(`${req.cookies['sID']}-spotifySongs`, JSON.stringify(resData))
        res.render('songs', {
            spotifyPlaylist: encodeURIComponent(JSON.stringify(resData)),
            id: req.params.playlistID,
            name: decodeURIComponent(req.params.title)

        })
    })

})

app.get('/sync/songs/', function (req, res) {
    let uID = req.cookies['sID']
    let songs = Apple.searchSongs(credentials.apple.devToken, req.cookies["appleToken"], localStorage.getItem(`${uID}-spotifySongs`))
    songs.then(function (result) {
        localStorage.setItem(`${uID}-aSongIDs`, JSON.stringify(result))
        return result
    }).then(function (result) {
        localStorage.setItem(`${uID}-appleSongIDs`, JSON.stringify(result))
        let name = Spotify.getName(req.cookies['sAccessToken'], localStorage.getItem(`${uID}-spotifyPlaylistID`))
        name.then(function (resName) {
            let newPlaylist = Apple.newPlaylist(credentials.apple.devToken, req.cookies["appleToken"], JSON.parse(localStorage.getItem(`${uID}-appleSongIDs`)), resName)
            newPlaylist.then(function (playlist) {
                // console.log(playlist[0]["id"])
                res.cookie("aPlaylist", playlist[0]["id"])
                res.redirect("/#finished")

            })
        })
    })
})

app.get(
    '/auth/spotify/callback',
    passport.authenticate('spotify', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // res.cookie("sID",localStorage.getItem("sID"))
        res.redirect('/auth/apple');
    }
);

app.get(
    '/auth/spotify',
    passport.authenticate('spotify', {
        scope: ['user-read-email', 'user-read-private', "playlist-read-private", 'user-library-read'],
        showDialog: false,
    })
);


app.post("/applelogin", function (req, res) {
    localStorage.setItem("appleToken", req.body.appleToken)
    res.sendStatus(200)

})
app.get("/auth/apple", function (req, res) {
    res.render("apple", {
        devToken: credentials.apple.devToken
    })
})


app.get("/newplaylist", function (req, res) {
    let id = Apple.newPlaylist(credentials.apple.devToken, localStorage.getItem("appleToken"), JSON.parse(localStorage.getItem("aSongIDs")), localStorage.getItem("sPlaylistName"))
    id.then(function (result) {
        console.log(result)
    })
})

app.get("/songs", function (req, res) {
    let songs = Apple.searchSongs(credentials.apple.devToken, localStorage.getItem("appleToken"), null)
    songs.then(function (result) {
        localStorage.setItem("aSongIDs", JSON.stringify(result))
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
    res.redirect('/auth/spotify');
}