const { RateLimit } = require('async-sema');

const limit = RateLimit(10)

exports.newPlaylist = async (devToken, musicToken, songs, nameString) => {
    if (nameString == null){
        nameString = "Musync Playlist"
    }
    
    console.log(nameString)
    // console.log(songs[0])
    dataSongs = []
    for (const elem of songs){
        dataSongs.push({
            "id": elem,
            "type": "songs"
        })
    }
    //postman code: 
    // var myHeaders = new Headers();
    // myHeaders.append("Media-User-Token", "AkYkeNe9TaqCh/7l5hhftEnnr5flmHIixZgnk54/p9R3YAvt1eSFCG1WpVPZ5hdhZD1xQMryDAPEX6KKeK2PSfZu33V4ifP3IfJ3Jtfoe/zzt1LC0U/x77Wzh3Y99Bl/DuNQScqXCXbiPWw/XU97XetkEyFmQnuzt93QVWq22uvu+ZlITJgBERqWzpL2QimpSc27GGudFqJ2IVrreZ2y9JX4EYpHQfbZqU+kqO/qyfPmmEI/lA==");
    
    // myHeaders.append("Content-Type", "application/json");
    // myHeaders.append("Authorization", "Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjYzOFo2V1hVOEIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJSRjI1TlNSMjdMIiwiZXhwIjoxNjk3MDAwMjAxLCJpYXQiOjE2ODEyMzIyMDF9.xx1175IzPeCJW0NUGbf4HV9NxMyFK2MQbRXg_pmEfdkVzMC3O_dDl73SgOBxmxWAbKilideqQxvDyNBZodNIKQ");

    // var raw = JSON.stringify({
    //     "attributes": {
    //       "name": nameString
    //     },
    //     "relationships": {
    //       "tracks": {
    //         "data": [
    //           {
    //             "id": "1222119875",
    //             "type": "songs"
    //           },
    //           {
    //             "id": "1440763127",
    //             "type": "songs"
    //           }
    //         ]
    //       }
    //     }
    //   });
      

    //   var requestOptions = {
    //     method: 'POST',
    //     headers: myHeaders,
    //     body: raw,
    //     redirect: 'follow'
    //   };
      
    //   fetch("https://api.music.apple.com/v1/me/library/playlists", requestOptions)
    //     .then(response => response.text())
    //     .then(result => console.log(result))
    //     .catch(error => console.log('error', error));
    
    //My code: 
    console.log(dataSongs)

    // var raw = JSON.stringify({
    //     "attributes": {
    //       "name": name
    //     },
    //     "relationships": {
    //       "tracks": {
    //         "data": dataSongs
    //       }
    //     }
    //   });

    //   console.log(raw)
    // POST https://api.music.apple.com/v1/me/library/playlists
    
    // await limit()
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
    
    console.log(data["data"][0]['id'])

    return data["data"][0]['id']
}

exports.searchSongs = async (devToken, musicToken, songlist) => {
    let songs = JSON.parse(localStorage.getItem("sSongList"))
    
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
        currID = await getSong(devToken, musicToken, new URLSearchParams({"term": search.trimEnd()}).toString())
        if (currID != null){
            console.log(currID) 
            appleSongs.push(currID)
        }
        // await new Promise(resolve => setTimeout(resolve, 5000));
 
        // console.log()
        // console.log(elem['track']["name"]) //get track name
        // console.log(elem["track"]["artists"][0]["name"]) // get first artist name 
    }
    
    return appleSongs
//     return Promise.all(appleSongs).then((blahhh)=> {
//         console.log(blahhh)
        
//     })
}


async function getSong(devToken, musicToken, searchParam) {
    await limit()
    //     https://api.music.apple.com/v1/catalog/us/search?term=Golpez En EL Corazon Paulina Rubio&types=songs&limit=2
    var response = await fetch(`https://api.music.apple.com/v1/catalog/us/search?${searchParam}&types=songs&limit=1`, {
        headers: {
            Authorization: 'Bearer ' + devToken,
            "Media-User-Token": musicToken
        }

    })
    let thisResp = await response
    let data = await thisResp.json();
    // let id = 
    // console.log(data)
    try{
        // console.log(data["results"]["songs"]["data"][0]["id"])
        return data["results"]["songs"]["data"][0]["id"]
    }
    catch{
        return 
        // console.log(searchParam)
        // console.log(data)
    }

    // return 

}

// exports.getPlaylists = async (accessToken, userID, playlists=[]) => {