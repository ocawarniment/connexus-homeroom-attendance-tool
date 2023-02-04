function updateChatLedger(bypass){
    var timestamp = new Date();
    // github url
    let githubUrl = "https://raw.githubusercontent.com/ocawarniment/ocawarniment.github.io/master/chatLedger.json" + "?timestamp=" + timestamp.toString();
    // get from github
    $.getJSON(githubUrl, data => { 
        let newChatLedger = data;
        // data is chatLedger
        chrome.storage.local.get(null, result => {
            // check if already up to date
            let currentChatLedger = result.chatLedger;
            if(newChatLedger.version == currentChatLedger.version && bypass !== true) {
                window.alert(`Already up to date at version: ${currentChatLedger.version}.`);
            } else {
                bypass !== true ? window.alert(`Updated to new version: ${newChatLedger.version}.`) : false;
                chrome.storage.local.set({chatLedger: data});
                refreshVersionNumbers();
            }
        })
    })
}

function refreshVersionNumbers(){
    $.getJSON("./manifest.json", (extensionManifest) => { 
        document.querySelector('#extVersNum').innerText = extensionManifest.version;
    })

    chrome.storage.local.get(null, result => {
        document.querySelector('#chatVersNum').innerText = result.chatLedger.version;
    })
}