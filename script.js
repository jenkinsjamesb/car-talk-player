var info = {
    id: 510208,
    range: 0,
    selected: 0
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
    let link, data;
    await getRange();
    console.log(info);

    await fetch("https://www.npr.org/get/" + info.id + "/render/partial/next?start=" + info.selected)
        .then(response => response.text())
        .then(data => {
            let doc = new DOMParser().parseFromString(data, "text/html");
            link = doc.querySelector("a.audio-module-listen").href;
        });

    console.log(link);
}

document.addEventListener("DOMContentLoaded", main);