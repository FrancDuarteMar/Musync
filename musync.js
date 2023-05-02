const express = require("express")
const Spotify = require("./lib/spotify")
const Apple = require("./lib/apple")
const expressSession = require("express-session")
const {credentials} = require("./config")
const passport = require('passport')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser');
const {engine: expressHandlebars} = require("express-handlebars")
const SpotifyStrategy = require('passport-spotify').Strategy;

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');}

const app = express()
const port = process.env.PORT || 3000


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
// var redirect_uri = 'http://localhost:3000/auth/spotify/callback';
var redirect_uri = "http://musync.franciscoduartem.com/auth/spotify/callback"

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

            localStorage.setItem("sAccessToken", accessToken)
            localStorage.setItem("sRefreshToken", refreshToken)
            localStorage.setItem("sExpires", expires_in)
            localStorage.setItem('sIDID', profile["id"])

            process.nextTick(function () {
                return done(null, profile);
            });

        }
    )
);

function isAuthenticated(req, res, next) {
    let spotifyCookie = req.cookies["sAccessToken"]
    let appleCookie = req.cookies["appleToken"]

    if (req.isAuthenticated() && (spotifyCookie != undefined || spotifyCookie == "j:null") && (appleCookie != undefined || appleCookie == "j:null")) {
        return next();
    }
    res.redirect('/unauthorized');
}


app.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
        res.redirect('/'); 
    });
})

app.get("/unauthorized", function (req, res) {
    res.render("unauth", {
        unauth: true
    })
})

app.get("/about", function (req, res) {
    res.render("about")
})

app.get('/', function (req, res) {
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
    localStorage.removeItem('sIDID')

    res.redirect("/playlists")
})

app.get("/playlists", isAuthenticated, function (req, res) {

    let thisPlaylists = []
    let playlists = Spotify.getPlaylists(req.cookies["sAccessToken"], req.cookies["sID"], thisPlaylists)
    
    playlists.then(() => {
        localStorage.setItem(`${req.cookies["sID"]}-playlistArr`, JSON.stringify(thisPlaylists))
        res.render("playlists", {
            spotifyPlaylist: encodeURIComponent(localStorage.getItem(`${req.cookies["sID"]}-playlistArr`))
        })
    }).catch(err => {
        console.log(err);
        res.sendStatus(501);
    })
})

app.get("/playlist/:playlistID&:title", isAuthenticated, function (req, res) {

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

app.get('/sync/songs/', isAuthenticated, function (req, res) {
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
                res.cookie("aPlaylist", playlist[0]["id"])
                res.redirect("/#finished")

            })
        })
    })
})

app.get(
    '/auth/spotify/callback',
    passport.authenticate('spotify', {
        failureRedirect: '/auth/spotify'
    }),
    function (req, res) {
        res.redirect('/auth/apple');
    }
);

app.get('/auth/spotify',
    passport.authenticate('spotify', {
        scope: ['user-read-email', "playlist-read-private", 'user-library-read'],
        showDialog: true
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


app.get('*', function (req, res) {
    res.render("unauth")
});

if (require.main === module) {
    app.listen(port, () => console.log(`Express started in ` +
        `${app.get('env')} mode at http://localhost:${port}` +
        `; press Ctrl-C to terminate.`))
} else {
    module.exports = app
}