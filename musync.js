const express = require("express")
const handlers = require("./lib/handlers")
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

app.set("view cache", true)
app.set('view engine', 'handlebars')
app.use(express.static(__dirname + '/public'))
app.disable("x-powered-by")

var authCallbackPath = '/auth/spotify/callback';

function printArr(arr) {
    let str = "";
    for (let item of arr) {
        if (Array.isArray(item)) str += printArr(item);
        else str += item + ", ";
    }
    return str;
}
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

            // console.log("local Storage access token: "+ localStorage.getItem("sAccessToken"))
            // console.log("Access Token: " + accessToken)
            // console.log("Refresh Token: " + refreshToken)
            // console.log("Profile: " + profile)

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
    // res.redirect('/')
    next()
})

async function getProfile(accessToken) {

    let response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    });

    let data = await response.json();
    return data;
}


async function getPlaylists(accessToken, userID, offset = 0, url, playlists = []) {
    // console.log(userID)
    // console.log(accessToken)

    if (url == null) {
        var response = await fetch(`https://api.spotify.com/v1/users/${userID}/playlists?offset=${offset}&limit=50`, {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
    } else {
        var response = await fetch(url, {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
    }

    let thisResp = await response
    // let item = await thisResp.text() 
    let data = await thisResp.json();
    // playlists.push(data['items'])
    for (const elem of data['items']) {
        playlists.push(elem)
        playlistSpotify.push(elem)
    }

    // console.log("Size of playlist data stuff: " + playlists.length)
    // console.log("Type: "+ typeof data["items"])
    // console.log("Length: "+ data["items"].length)

    // if(offset = 0){
    //     localStorage.setItem("sPlaylist", data["items"])
    //     console.log("Type: "+ typeof localStorage.getItem("sPlaylist"))
    // }
    // else{
    //     console.log("Type: "+typeof localStorage.getItem("sPlaylist"))
    //     // localStorage.getItem("sPlaylist").push(data['items'])
    // }
    if (data['next'] != null) {
        // console.log("MORE!!!!!!!!!!!!!!!!!!!!")
        getPlaylists(accessToken, userID, offset + data['limit'], url, playlists)
    } else {
        localStorage.setItem("sPlaylist", JSON.stringify(playlists))
    }
    // console.log(data)
    // console.log("Playlist: ", data)
    return data;
}

app.get("/list/spotify", function (req, res) {
    // const spotifyData = await getProfile(localStorage.getItem("sAccessToken"))

    getProfile(localStorage.getItem("sAccessToken")).then(
        result => {
            localStorage.setItem("sID", result["id"])
        }).
    then((resultPlaylist) => {
        return getPlaylists(localStorage.getItem("sAccessToken"), localStorage.getItem("sID"))
    }).
    then((resPlay) => {
            let jsonPlaylist = {}
            localStorage.setItem("sPlaylistRet", JSON.stringify(resPlay))
            let count = 0
            for(const elem of playlistSpotify){
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
                spotifyPlaylist:  encodeURIComponent(JSON.stringify(playlistSpotify))
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