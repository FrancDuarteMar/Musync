// const { all } = require("../musync");

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

    
    localStorage.setItem("sPlaylistAll", JSON.stringify(playlists))
    localStorage.setItem("sPlaylist", JSON.stringify(cleanData))
    var currPlaylist = cleanData[Object.keys(cleanData)[3]]["id"]
    localStorage.setItem("sPlaylistName",cleanData[Object.keys(cleanData)[3]]["name"])
    this.getPlaylistSongs(accessToken,currPlaylist)
    return cleanData
}

exports.getPlaylistSongs = async (accessToken, playlistID, trackList = []) =>{
    var cleanData = {}
    var songlist = []
    var songData = await getChunkSongs(accessToken, playlistID, 0, null ,songlist)
    
    localStorage.setItem("sSongsPlaylist", JSON.stringify(songData))
    console.log(JSON.parse(localStorage.getItem("sPlaylistAll")))

    localStorage.setItem('sSongList',JSON.stringify(songlist))


    return songlist
}

async function getChunkSongs( accessToken, playlistID,offset = 0, url=null, trackList = []){
    console.log("playlist id: "+ playlistID)
    if (url == null) {
        console.log("Null url :"+url )
        var response = await fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=50&fields=items(track(name,artists(name))),next`, {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        })
    } else {
        console.log("Not null url:" + url)
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
        console.log("data is not null!")
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