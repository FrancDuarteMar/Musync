const { RateLimit } = require('async-sema');

const limit = RateLimit(10)

exports.newPlaylist = async (devToken, musicToken, songs, nameString) => {
    if (nameString == null){
        nameString = "Musync Playlist"
    }
    
    dataSongs = []
    for (const elem of songs){
        dataSongs.push({
            "id": elem,
            "type": "songs"
        })
    }

    // console.log(dataSongs)
    
    var response = await fetch(`https://api.music.apple.com/v1/me/library/playlists`, {
        method: "POST",
        headers: {
            Authorization: 'Bearer ' + devToken,
            "Media-User-Token": musicToken,
            "Content-Type": "application/json"
        },
        body:JSON.stringify({
            "attributes": {
              "name": nameString
            },
            "relationships": {
              "tracks": {
                "data": dataSongs
              }
            }
          })

    })
    let thisResp = await response
    let data = await thisResp.json();
    
    // console.log(data["data"][0]['id'])

    return data["data"]
}

exports.searchSongs = async (devToken, musicToken, songlist) => {
    // let songs = JSON.parse(localStorage.getItem("sSongList"))
    let songs = JSON.parse(songlist)
    
    // console.log(songs)
    let appleSongs = []
    for (const elem of songs) {

        let track = elem["track"]['name']
        let artists = " "
        for (const art of elem["track"]["artists"]) {
            artists += art["name"]
            artists += " "
        }
        let search = track + artists     
        currID = await getSongID(devToken, musicToken, new URLSearchParams({"term": search.trimEnd()}).toString())
        if (currID != null){
            // console.log(currID) 
            appleSongs.push(currID)
        }
 
    }
    
    return appleSongs
}


async function getSongID(devToken, musicToken, searchParam) {
    await limit()

    var response = await fetch(`https://api.music.apple.com/v1/catalog/us/search?${searchParam}&types=songs&limit=1`, {
        headers: {
            Authorization: 'Bearer ' + devToken,
            "Media-User-Token": musicToken
        }

    })
    let thisResp = await response
    let data = await thisResp.json();

    try{
        return data["results"]["songs"]["data"][0]["id"]
    }
    catch{
        return 

    }

}

