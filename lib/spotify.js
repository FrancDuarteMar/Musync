const { all } = require("../musync");

exports.getProfile = async (accessToken) => {
    let response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    });
    let data = await response.json();
    return data;
}

exports.getPlaylists = async (accessToken, userID, playlists=[]) => {
    var allPlaylistData = []
    var cleanData = {}
    var data = await getChunkPlaylists(accessToken, userID, 0, url = null, playlists)
    // console.log("Access Token: "+ accessToken)
    //Create data with relevant information
    for (const elem of playlists) {
        cleanData[elem["id"]] = {
            "id": elem["id"],
            "name": elem["name"],
            "image": elem["images"][0]["url"],
            'tracks': elem["tracks"]["href"],
            "tracksNum,": elem["tracks"]["total"]
        }
    }
    // console.log(localStorage.getItem("sPlaylist"))
    //  console.log(cleanData)
    localStorage.setItem("sPlaylistAll", JSON.stringify(playlists))
    localStorage.setItem("sPlaylist", JSON.stringify(cleanData))
    // console.log(cleanData[Object.keys(cleanData)[3]])

    var songlist = []
    var currPlaylist = cleanData[Object.keys(cleanData)[3]]
    var songData = await getChunkSongs(accessToken, currPlaylist['id'], 0, url = null ,songlist )
    
    console.log(songlist)

    return cleanData
}

exports.getPlaylistSongs = async (accessToken, playlistID, trackList = []) =>{
    var cleanData = {}
    var data = await getChunkSongs(accessToken, playlistID, url, trackList)
    // ?limit=100&fields=items(track(name,artists(name)))
    // https://api.spotify.com/v1/playlists/5CZXWOrCqwOD5Hcdk3VWMf/tracks?limit=10&fields=items(track(name,artists(name))),next
    console.log(data)
}

async function getChunkSongs( accessToken, playlistID, url, trackList = []){
    if (url == null) {
        var response = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=100&fields=items(track(name,artists(name)))`, {
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
    let data = await thisResp.json()

    for (const elem of data['items']){
        trackList.push(elem)
    }
    if(data['next'] != null){
        await getChunkSongs(accessToken,playlistID,offset+data["limit"], data['next'], trackList)
    }

    return data
}

async function getChunkPlaylists(accessToken, userID, offset = 0, url, playlists = []) {
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
    let data = await thisResp.json()
    
    for (const elem of data['items']) {
        playlists.push(elem)
    }
    if (data['next'] != null) {
       await getChunkPlaylists(accessToken, userID, offset + data['limit'], url, playlists)
    } 

    return data;
}