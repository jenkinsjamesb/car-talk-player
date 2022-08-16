// General read/write info
var mediaElement;
var i = 0;
var info = {
    id: 510208,
    range: null,
    playing: null,
    playState: true,
    isSeeking: false
};

// General-use functions
let secToStamp = (secs) => String(Math.floor(secs / 60)).padStart(2, 0) + ":" + String(Math.floor(secs % 60)).padStart(2, 0);

// Gets the number of available episodes through a binary-search like check, since there isn't an easy other way
let getRange = (last = 0, current = 500) => {
    return new Promise(resolve => {
        fetch("https://www.npr.org/get/" + info.id + "/render/partial/next?start=" + current)
            .then(response => response.text())
            .then(data => {
                let doc = new DOMParser().parseFromString(data, "text/html");
                let numLoaded = doc.querySelectorAll("body > div > article").length;
                if (numLoaded == 1) {
                    info.range = Math.floor(current);
                    resolve();
                    return;
                }
                if (numLoaded == 0) resolve(getRange(0, current / 2));
                else resolve(getRange(current, current + (current - last) / 2));
            });
    });
}

// Main function to fetch audio and write the source to the media element
let main = async () => {
    let link, src;
    let title, imgSrc;

    await fetch("https://www.npr.org/get/" + info.id + "/render/partial/next?start=" + info.playing)
        .then(response => response.text())
        .then(data => {
            let doc = new DOMParser().parseFromString(data, "text/html");
            let embed = new DOMParser().parseFromString(doc.querySelector("b.embed-url > code").innerText, "text/html");
            link = embed.querySelector("iframe").src;
            title = doc.querySelector(".title > a").innerText;
            document.getElementById("episode-title").value = title;
        });

    await fetch(link)
        .then(response => response.text())
        .then(data => {
            doc = new DOMParser().parseFromString(data, "text/html");
            let script = doc.querySelector("main script").innerText.replace("var apiDoc = ", "");
            let startIndex = script.indexOf("https:\\/\\/ondemand.npr.org\\/");
            let stopIndex = script.indexOf("\"", startIndex);
            src = script.substring(startIndex, stopIndex).replaceAll("\\", "");
            mediaElement.src = src;
            mediaElement.autoplay = true;
            startIndex = script.indexOf("https:\\/\\/media.npr.org\\/images\\/");
            stopIndex = script.indexOf("\"", startIndex);
            imgSrc = script.substring(startIndex, stopIndex).replaceAll("\\", "");
            console.log(imgSrc)
        });

    navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: 'NPR',
        artwork: [ { src: imgSrc, type: 'image/png' } ]
    });
}

// Update function that checks the values of all of the inputs
let updateButtonCallback = () => {
    info.id = document.getElementById("podcast-id").value;
    info.playing = info.range - document.getElementById("episode-number").value + 1;
    i = 0;
    main();
}

// Function to call after audio has ended, 
let autoplayCallback = () => {
    if (document.getElementById("autoplay-enabled").checked && info.playing > 1) {
        info.playing--;
        document.getElementById("episode-number").value = info.range - info.playing + 1;
        main();
        mediaElement.play();
    }
}

// Updates script-side audio states (nightmare due to incorporating external play/pause media inputs)
let togglePlayState = () => {
    document.getElementById("playpause-button").innerText = info.playState ? "Play":"Pause";
    info.playState = !info.playState;
}

// Plays/pauses from html element
let playButtonCallback = () => {
    if (info.playState) mediaElement.pause();
    else mediaElement.play();
}

// Calculates and concatenates the timestamp string next to the seek slider
let setTimestamp = () => { 
    let currentTime;
    if (!info.isSeeking) currentTime = mediaElement.currentTime;
    else currentTime = document.getElementById("seek-bar").value / 100 * mediaElement.duration;
    let stamp = !isNaN(mediaElement.duration) ? (secToStamp(currentTime) + " / " + secToStamp(mediaElement.duration)):"00:00 / 00:00"; 
    document.getElementById("timestamp-text").innerText = stamp;
};

// Updates seek bar, unless the user is actively seeking
let seekSliderUpdateCallback = () => {
    if (!info.isSeeking) {
        document.getElementById("seek-bar").value = mediaElement.currentTime / mediaElement.duration * 100;
        setTimestamp();
    }
    let titleLength = document.getElementById("episode-title").value.length + 1;
    let scrollIndex = i % (titleLength * 2) >= titleLength ? titleLength - (i % titleLength):(i % titleLength);
    document.getElementById("episode-title").scrollTo(scrollIndex , 0, true)
    i++;
}

// Sets the current time in media to the selected time on the seek slider
let setTimeCallback = () => {
    mediaElement.currentTime = document.getElementById("seek-bar").value / 100 * mediaElement.duration;
}

let defaultEnabledCallback = () => {
    mediaElement.style.display = document.getElementById("default-enabled").checked ? "unset":"none";
    document.getElementById("player").style.display = document.getElementById("default-enabled").checked ? "none":"unset";
}

// Initial setup to get range & such
let setup = async () => {
    await getRange();
    mediaElement = document.getElementById("audio");
    document.getElementById("episode-range-label").innerText = "(1-" + info.range + ")";
    document.getElementById("episode-number").max = info.range;
    setInterval(seekSliderUpdateCallback, 500); //could use accuracy improvement
}

// Various listeners
document.addEventListener("DOMContentLoaded", setup);

document.getElementById("default-enabled").addEventListener("click", defaultEnabledCallback);

document.getElementById("update-button").addEventListener("click", () => { updateButtonCallback(); mediaElement.play(); });

document.getElementById("audio").addEventListener("ended", autoplayCallback);
document.getElementById("audio").addEventListener("play", () => { info.playState = false; togglePlayState(); });
document.getElementById("audio").addEventListener("pause", () => { info.playState = true; togglePlayState(); });

document.getElementById("playpause-button").addEventListener("click", () => { mediaElement.play(); playButtonCallback();});

document.getElementById("seek-bar").addEventListener("input", setTimestamp);
document.getElementById("seek-bar").addEventListener("mousedown", () => { info.isSeeking = true; });
document.getElementById("seek-bar").addEventListener("touchstart", () => { info.isSeeking = true; });
document.getElementById("seek-bar").addEventListener("mouseup", () => { info.isSeeking = false; setTimeCallback(); });
document.getElementById("seek-bar").addEventListener("touchend", () => { info.isSeeking = false; setTimeCallback(); });

document.getElementById("volume-slider").addEventListener("input", () => { document.getElementById("audio").volume = document.getElementById("volume-slider").value / 100; });

//TODO: setTimestamp efficiency, fast forward/back
//transfer to car-talk-player, favicon to ico