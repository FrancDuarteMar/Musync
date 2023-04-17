passport.authenticate('spotify', {
    failureRedirect: '/login'
}),
function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
}