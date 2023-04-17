// const express = require("express")
// const handlers = require("./lib/handlers")
const Spotify = require("../lib/spotify")
const Apple = require("../lib/apple")
const {
    credentials
} = require("../../config")
const passport = require('passport')

import { LocalStorage } from "node-localstorage";

global.localStorage = new LocalStorage('./scratch');


let playlistSpotify = []

const SpotifyStrategy = require('passport-spotify').Strategy;

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

passport.initialize()
passport.session()
