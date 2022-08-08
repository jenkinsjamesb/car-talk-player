var info = {
    id: 510208,
    range: null,
    playing: null,
    autoplayEnabled: true
};

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

let main = async () => {
    let link, src;

    await fetch("https://www.npr.org/get/" + info.id + "/render/partial/next?start=" + info.playing)
        .then(response => response.text())
        .then(data => {
            let doc = new DOMParser().parseFromString(data, "text/html");
            let embed = new DOMParser().parseFromString(doc.querySelector("b.embed-url > code").innerText, "text/html");
            link = embed.querySelector("iframe").src;
            document.getElementById("episode-title").innerText = doc.querySelector(".title > a").innerText;
        });

    fetch(link)
        .then(response => response.text())
        .then(data => {
            doc = new DOMParser().parseFromString(data, "text/html");
            let script = doc.querySelector("main script").innerText.replace("var apiDoc = ", "");
            let startIndex = script.indexOf("https:\\/\\/ondemand.npr.org\\/");
            let stopIndex = script.indexOf("\"", startIndex);
            src = script.substring(startIndex, stopIndex).replaceAll("\\", "");
            document.querySelector("#player > audio").src = src;
        })
}

let update = () => {
    info.id = document.getElementById("podcast-id").value;
    info.playing = info.range - document.getElementById("episode-number").value + 1;
    info.autoplayEnabled = document.getElementById("autoplay-enabled").checked;
    main();
}

let autoplay = () => {
    if (info.autoplayEnabled && info.playing > 1) {
        info.playing--;
        document.getElementById("episode-number").value = info.range - info.playing + 1;
        main();
    }
}

let setup = async () => {
    await getRange();
    document.getElementById("episode-range-label").innerText = " (1-" + info.range + ")";
    document.getElementById("episode-number").max = info.range;
}

document.addEventListener("DOMContentLoaded", setup);
document.getElementById("update-button").addEventListener("click", update);
document.getElementById("update-button").addEventListener("touchstart", update);
document.getElementById("audio").addEventListener("ended", autoplay);