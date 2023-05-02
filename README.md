# Musync
A spotify to apple musyc syncing utility


<h2 class="subHeader">
    The inspiration
</h2>
<p class="longText">
Due to platform restrictions, playlists are locked into their respective music streaming services so they can't be accessed from some devices or their performance is degraded. For example, when asking Siri to play a playlist from the Homepod, the only playlists it can access are Apple Music playlists. In order to play Spotify playlists, the user needs to airplay songs but there is a substantial 5+ second delay due to Spotify's use of Airplay 1 instead of the modern Airplay 2. As a result, the user experience is not enjoyable due to those problems. There are various paid tools that do the same as this tool but the advanced features and lengthy playlist coversions are hidden behind subscription based models. As talked about in the book <i>Hactivism and Cyberwars: Rebels with a Cause</i> by Tim Jordan, creating software that goes around restrictions and creates more accessible online content should be the goal of digital creators. As a result, this website was created to create a free, and possible open source, tool that can be used to sync Spotify to Apple Music playlists with various other features easily implementable. 
</p>
<br>


<h2 class="subHeader">
    About the design

</h2>
<p class="longText">
    This website takes design inspiration from the various online music services
    by mimicking their playlist enumerating features and enhancing them to
    create a playlist syncing utility.
</p>
<br>

<h2 class="subHeader">
    About the utility
</h2>
<p class="longText">
    This utility uses the Spotify API to request a users playlist and then
    creates a new playlist by searching each for each song in the Apple Music
    catalog through the MusicKit API. After every song has been found, the
    playlist is then created and the user is given a link and they're able to
    see it in their own playlists.
</p>

<p class="longText">
    The API calls are done in the backend with data being presented to the user
    in the front end through Handlebars templeting. Authentication is handled by
    PassportJS and MusicKit(in the front end) with cookies being saved to keep
    track of the authentication levels.
</p>

<h2 class="subHeader">
    Links
</h2>

<a href="https://docs.google.com/presentation/d/1Wk2NQS4-IcWinUcOQSeZFVttzBz29e61XabD016HvnM/edit#slide=id.ga073618e60_0_16"
    target="_blank" rel="noopener noreferrer">Original Presentation</a>
<br>
<a href="https://www.figma.com/file/3nalVFATf8ASe7AVf2EgwL/Musync-Dig-345--Utility?node-id=112%3A3&t=6sjvdZekCRW5rhpn-1"
    target="_blank" rel="noopener noreferrer"> Figma Designs</a>
