window.onSpotifyWebPlaybackSDKReady = () => {
    let REDIRECT = window.location.href;
    if (REDIRECT[REDIRECT.length - 1] === "/") {
        REDIRECT = window.location.href.slice(0, -1);
    }

    console.log(REDIRECT);


    const exchangeCodeForToken = (code) => {

        const spotify_client_secret = document.querySelector("#client-secret").value;
        const spotify_client_id = document.querySelector("#client-id").value;

        const base64EncodedCreds = btoa(`${spotify_client_id}:${spotify_client_secret}`);
        const authHeader = `Basic ${base64EncodedCreds}`;

        const myHeaders = new Headers();
        myHeaders.append("Authorization", authHeader);
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

        const urlencoded = new URLSearchParams();
        urlencoded.append("grant_type", "authorization_code");
        urlencoded.append("code", code);
        urlencoded.append("redirect_uri", REDIRECT);

        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: urlencoded,
            redirect: 'follow'
        };

        return fetch("https://accounts.spotify.com/api/token", requestOptions)
            .then(response => response.json())
            .then(result => result.access_token)
            .catch(error => console.log('error', error));
    }

    const playSong = (device_id) => {

        //Get token out of local storage
        const token = localStorage.getItem("token");

        var myHeaders = new Headers();
        myHeaders.append("Authorization", `Bearer ${token}`);
        myHeaders.append("Content-Type", "application/json");

        //Set the song to play. Also make sure the volume is up.
        var raw = JSON.stringify({ "uris": ["spotify:track:4uLU6hMCjMI75M1A2tKUQC"], "volume": 100 });

        var requestOptions = {
            method: 'PUT',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };

        //Call the 'play' endpoint
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, requestOptions)
            .then(response => response.text())
            .then(result => console.log(result))
            .catch(error => console.log('error', error));
    }


    const player = new Spotify.Player({
        name: 'Web Playback SDK Quick Start Player',
        getOAuthToken: cb => {

            //This code is to get the users oAuth Token
            document.querySelector('#button').addEventListener("click", (e) => {
                e.preventDefault();

                //App client Id and required scopes
                const client_id = document.querySelector("#client-id").value;
                const scopes = ['app-remote-control', 'user-modify-playback-state', 'user-read-currently-playing', 'user-read-playback-position', 'streaming', 'user-read-recently-played', 'user-read-playback-state', "streaming", "user-read-email", "user-read-private"];

                //Open a popup window to ask user to verify with Spotify. Save a ref to the popup in a variable so we can query it later
                const popup = window.open(`https://accounts.spotify.com/authorize?client_id=${client_id}&scope=${scopes}&redirect_uri=${REDIRECT}&response_type=code&show_dialog=true`, "", "height=800px, width=800px");


                //Every 500ms we check the popup to see if the user has accepted the permissions
                const interval = setInterval(async () => {
                    console.log("trying to read code");
                    try {
                        const url = popup.location.search
                        if (!url) throw "couldn't read";

                        //If they have accepted the permissions spotify does a redirect with a code parameter
                        const code = new URLSearchParams(url).get("code");
                        console.log(code);

                        //Close the popup and cleanup the interval
                        popup.close();
                        clearInterval(interval);

                        //Exchange the code for a token and put it in local storage (Probably bad idea)
                        const token = await exchangeCodeForToken(code);
                        localStorage.setItem("token", token);

                        //Finally when we have the token we can call the callback function provided by the spotify sdk
                        //This creates a websocket connection with the spotify server and allows us to initialize the player.
                        cb(token);
                    } catch (err) {
                        console.log(err)
                    }
                }, 500);



            });
        }
    });

    // Error handling
    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });

    // Playback status updates
    player.addListener('player_state_changed', state => { console.log(state); });

    // Ready
    player.addListener('ready', ({ device_id }) => {

        //This only runs after the player has been initialized in the above steps
        console.log('Ready with Device ID', device_id);

        //When player ready play a song
        playSong(device_id);
    });

    // Not Ready
    player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
    });

    // Connect to the player!
    player.connect();
};