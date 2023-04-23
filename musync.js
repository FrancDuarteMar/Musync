const express = require("express")
const handlers = require("./lib/handlers")
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
localStorage.clear()
var redirect_uri = 'http://localhost:3000/auth/spotify/callback';
// var authCallbackPath = '/auth/spotify/callback';


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
            localStorage.setItem("spotify", {
                "accessToken": accessToken,
                "refreshToken": refreshToken,
                "expires": expires_in,
                "profile": profile

            });
            console.log(accessToken)
            console.log("spotify access token: "+accessToken)
            localStorage.setItem("sAccessToken", accessToken)
            localStorage.setItem("sRefreshToken", refreshToken)
            localStorage.setItem("sExpires", expires_in)
            localStorage.setItem("sProfile", JSON.stringify(profile))
            localStorage.setItem('sIDID',profile["id"])
            
            process.nextTick(function () {
                return done(null, profile);
            });

        }
    )
);



app.get('/', handlers.home)

app.get("/set-profile",function(req,res){

    res.cookie("appleToken",localStorage.getItem("appleToken"))
    res.cookie("sAccessToken",localStorage.getItem('sAccessToken'))
    res.cookie("sID",localStorage.getItem("sIDID"))
    localStorage.clear()

    // res.cookie("")
    // res.send("cookie set")
    res.redirect("/list")

})

app.get("/list", function (req, res) {
    // const spotifyData = await getProfile(localStorage.getItem("sAccessToken"))

    let playlists = Spotify.getPlaylists(req.cookies["sAccessToken"], req.cookies["sID"],playlistSpotify)
    playlists.then(()=>{
        localStorage.setItem(`${req.cookies["sID"]}-playlistArr`,JSON.stringify(playlistSpotify))
        res.render("playlists", {
                spotifyPlaylist: encodeURIComponent(localStorage.getItem(`${req.cookies["sID"]}-playlistArr`))

            })}
        ).catch(err => {
            console.log(err);
            res.sendStatus(501);
        })
})

app.get("/playlist/:id",function (req, res) {
    // console.log("choice id is " + req.params.id);
    let songs=[]
    localStorage.setItem(`${req.cookies['sID']}-spotifyPlaylistID`,req.params.id)
    let results = Spotify.getPlaylistSongs(req.cookies['sID'],req.cookies['sAccessToken'],req.params.id,songs)
    results.then(function(resData){

        localStorage.setItem(`${req.cookies['sID']}-spotifySongs`,JSON.stringify(resData))
        res.render('songs',{
            spotifyPlaylist: encodeURIComponent(JSON.stringify(resData)),
            id:req.params.id

        })
    })

  }
)

app.get('/sync/songs/',function(req,res){
    let uID = req.cookies['sID']
    let songs = Apple.searchSongs(credentials.apple.devToken, req.cookies["appleToken"],localStorage.getItem(`${uID}-spotifySongs`))
    songs.then(function(result){
        localStorage.setItem(`${uID}-aSongIDs`,JSON.stringify(result))
        return result
    }).then(function(result){
        localStorage.setItem(`${uID}-appleSongIDs`,JSON.stringify(result))
        let name = Spotify.getName(req.cookies['sAccessToken'],localStorage.getItem(`${uID}-spotifyPlaylistID`))
        name.then(function(resName){
            Apple.newPlaylist(credentials.apple.devToken, req.cookies["appleToken"],JSON.parse(localStorage.getItem(`${uID}-appleSongIDs`)),resName)
            res.render("done")
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
        showDialog: true,
    })
);


app.post("/applelogin", function (req, res) {
    // console.log(req.body)
    localStorage.setItem("appleToken", req.body.appleToken)
    res.sendStatus(200)

})
app.get("/auth/apple", function (req, res) {

    // console.log("Req: "+req.body["appleToken"])

    res.render("apple", {
        devToken: credentials.apple.devToken
    })
    // res.redirect('/');

})


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