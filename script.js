// General read/write info
var mediaElement;
var info = {
    id: 510208,
    range: null,
    episode: null,
    playState: true,
    isSeeking: false
};
const proxy = "https://corsproxy.io/?";

// General-use functions
const secToStamp = (secs) => String(Math.floor(secs / 60)).padStart(2, 0) + ":" + String(Math.floor(secs % 60)).padStart(2, 0);

const toggleVisibilityforClass = (classList) => {
    Array.from(document.getElementsByClassName(classList)).forEach((element) => {
        element.style.display =  element.style.display == "none" ? "unset":"none";
    });
}

addMultipleEventListener = (element, typeList, callback) => {
    let types = typeList.split(" ");
    types.forEach((type) => {
        element.addEventListener(type, callback);
    });
}

// Gets the number of available episodes through a binary-search like check, since there isn't an easy other way
const getEpisodeRange = (podcastID, last = 0, current = 500) => {
    return new Promise(resolve => {
        for (let i = 0; i < 5; i++) {
            try {
                fetch(proxy + "https://www.npr.org/get/" + podcastID + "/render/partial/next?start=" + current)
                    .then(response => response.text())
                    .then(data => {
                        let doc = new DOMParser().parseFromString(data, "text/html");
                        let numLoaded = doc.querySelectorAll("body > div > article").length;
                        if (numLoaded == 1) {
                            resolve(Math.floor(current));
                            return;
                        }
                        if (numLoaded == 0) resolve(getEpisodeRange(podcastID, 0, current / 2));
                        else resolve(getEpisodeRange(podcastID, current, current + (current - last) / 2));
                    });
                break;
            } catch (err) {
                document.getElementById("standby-text").innerHTML = "<b>Fetch failed. " + (i >= 4 ? "Try again later.":"Retrying.") + "</b>";
            }
        }
    });
}

// Fetches down to an embed and pulls an audio source link for the media element.
const getEpisodeDataObject = async (podcastID, episodeNumber) => {
    return new Promise(async (resolve, reject) => {
        var episodeDataObject = {
            title: null,
            audioSrc: null,
            imgSrc: null
        };

        try {
            await fetch(proxy + "https://www.npr.org/get/" + podcastID + "/render/partial/next?start=" + episodeNumber)
                .then(response => response.text())
                .then(async data => {
                    let dom = new DOMParser().parseFromString(data, "text/html");
                    let embed = new DOMParser().parseFromString(dom.querySelector("b.embed-url > code").innerText, "text/html");
                    let link = embed.querySelector("iframe").src;
                    episodeDataObject.title = dom.querySelector(".title > a").innerText;

                    //document.getElementById("episode-title").value = title; // remove/factor out?

                    await fetch(proxy + link)
                        .then(response => response.text())
                        .then(data => {
                            let dom = new DOMParser().parseFromString(data, "text/html");
                            let script = dom.querySelector("main script").innerText.replace("var apiDoc = ", "");
                            let audioModel = JSON.parse(script.substring(script.indexOf("{"), script.indexOf(";")));
                            console.log(audioModel)
                            episodeDataObject.audioSrc = audioModel.audioSrc;
                            
                            //mediaElement.src = src;
                            //mediaElement.autoplay = true;
                            // remove/factor out?

                            startIndex = script.indexOf("https:\\/\\/media.npr.org\\/");
                            stopIndex = script.indexOf("\"", startIndex);
                            episodeDataObject.imgSrc = script.substring(startIndex, stopIndex).replaceAll("\\", "");
                        });
                });

            resolve(episodeDataObject);
        } catch (err) {
            // TODO: Display error to user
            reject(err);
        }
    });
}

// START Main functions
// Main function to handle fetching audio and writing the source to the media element
const main = async () => {
    info.episode = info.range - document.getElementById("episode-number").value + 1;
    let ep = await getEpisodeDataObject(info.id, info.episode);
    console.log(ep);

    mediaElement.src = ep.audioSrc;
    mediaElement.autoplay = true;
    document.getElementById("episode-title").value = ep.title;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: ep.title,
        artist: 'NPR',
        artwork: [ { src: ep.imgSrc, type: 'image/png' } ]
    });
}

// Initial setup to get range & such
const setup = async () => {
    document.getElementById("episode-range-label").innerText = "(Fetching...)";
    toggleVisibilityforClass("swap");
    info.range = await getEpisodeRange(info.id);
    toggleVisibilityforClass("swap");
    mediaElement = document.getElementById("audio");
    document.getElementById("episode-range-label").innerText = "(1-" + info.range + ")";
    document.getElementById("episode-number").max = info.range;
    setInterval(seekSliderUpdateCallback, 500); //could use accuracy improvement
}

// END Main functions

// Function to call after audio has ended, 
const autoplayCallback = () => {
    if (document.getElementById("autoplay-enabled").checked && info.episode > 1) {
        info.episode--;
        document.getElementById("episode-number").value = info.range - info.episode + 1;
        main();
        mediaElement.play();
    }
}

// Updates script-side audio states (nightmare due to incorporating external play/pause media inputs)
const togglePlayState = () => {
    document.getElementById("playpause-button").innerText = info.playState ? "Play":"Pause";
    info.playState = !info.playState;
}

// Plays/pauses from html element
const playButtonCallback = () => {
    if (info.playState) mediaElement.pause();
    else mediaElement.play();
}

// START Player callbacks
// Calculates and concatenates the timestamp string next to the seek slider
const setTimestamp = () => { 
    let currentTime;
    if (!info.isSeeking) currentTime = mediaElement.currentTime;
    else currentTime = document.getElementById("seek-bar").value / 100 * mediaElement.duration;
    let stamp = !isNaN(mediaElement.duration) ? (secToStamp(currentTime) + " / " + secToStamp(mediaElement.duration)):"00:00 / 00:00"; 
    document.getElementById("timestamp-text").innerText = stamp;
};

// Updates seek bar, unless the user is actively seeking
const seekSliderUpdateCallback = () => {
    if (!info.isSeeking) {
        document.getElementById("seek-bar").value = mediaElement.currentTime / (isNaN(mediaElement.duration) ? 10:mediaElement.duration) * 100;
        setTimestamp();
    }
}

// Sets the current time in media to the selected time on the seek slider
const setTimeCallback = () => {
    mediaElement.currentTime = document.getElementById("seek-bar").value / 100 * mediaElement.duration;
}

const defaultEnabledCallback = () => {
    toggleVisibilityforClass("default-enabled-vis");
}
// END Player callbacks

const headerCallback = (e) => {
    let info = document.getElementById("info-div");
    info.style.height = "100%";
    toggleVisibilityforClass("info");
    e.target.innerText = (info.style.display != "none" ? "\u25be":"\u25b8") + "// uNPR Car Talk Player //";
}

// Various listeners
document.addEventListener("DOMContentLoaded", setup);

addMultipleEventListener(document.getElementById("header"), "click touchstart", headerCallback);

addMultipleEventListener(document.getElementById("default-enabled"), "click touchstart", defaultEnabledCallback);

document.getElementById("podcast-id").addEventListener("change", (e) => { info.id = e.target.value; getEpisodeRange(info.id); setup();});

addMultipleEventListener(document.getElementById("update-button"), "click touchstart", () => { main(); mediaElement.play(); });

document.getElementById("audio").addEventListener("ended", autoplayCallback);
document.getElementById("audio").addEventListener("play", () => { info.playState = false; togglePlayState(); });
document.getElementById("audio").addEventListener("pause", () => { info.playState = true; togglePlayState(); });

document.getElementById("playpause-button").addEventListener("click", () => { mediaElement.play(); playButtonCallback();});

document.getElementById("seek-bar").addEventListener("input", setTimestamp);
addMultipleEventListener(document.getElementById("seek-bar"), "mousedown touchstart", () => { info.isSeeking = true; });
addMultipleEventListener(document.getElementById("seek-bar"), "mouseup touchend", () => { info.isSeeking = false; setTimeCallback(); });

document.getElementById("volume-slider").addEventListener("input", (e) => { document.getElementById("audio").volume = e.target.value / 100; });

//TODO: setTimestamp efficiency, fast forward/back
//transfer to car-talk-player, favicon to ico