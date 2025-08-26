function updateChatLedger(bypass){
    var timestamp = new Date();
    // github url - updated to use refs/heads/master
    let githubUrl = "https://raw.githubusercontent.com/ocawarniment/ocawarniment.github.io/refs/heads/master/chatLedger.json" + "?timestamp=" + timestamp.toString();
    // get from github using fetch API
    fetch(githubUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            let newChatLedger = data;
            // data is chatLedger
            chrome.storage.local.get(null, result => {
                // check if already up to date
                let currentChatLedger = result.chatLedger || {};
                let currentVersion = currentChatLedger.version || 'unknown';
                let newVersion = newChatLedger.version || 'unknown';
                
                if(newVersion == currentVersion && bypass !== true) {
                    // Send notification request to background script
                    chrome.runtime.sendMessage({
                        type: 'showNotification',
                        title: 'CHAT Ledger Update',
                        message: `Already up to date at version: ${currentVersion}.`
                    });
                } else {
                    if(bypass !== true) {
                        chrome.runtime.sendMessage({
                            type: 'showNotification',
                            title: 'CHAT Ledger Update',
                            message: `Updated from version ${currentVersion} to ${newVersion}.`
                        });
                    }
                    chrome.storage.local.set({chatLedger: data});
                    refreshVersionNumbers();
                }
            });
        })
        .catch(error => {
            console.error('Error updating chat ledger:', error);
            chrome.runtime.sendMessage({
                type: 'showNotification',
                title: 'CHAT Ledger Update Error',
                message: 'Failed to update chat ledger. Please check your internet connection.'
            });
        });
}

function refreshVersionNumbers(){
    fetch("./manifest.json")
        .then(response => response.json())
        .then(extensionManifest => {
            document.querySelector('#extVersNum').innerText = extensionManifest.version;
        })
        .catch(error => {
            console.error('Error loading manifest:', error);
            document.querySelector('#extVersNum').innerText = 'Error';
        });

    chrome.storage.local.get(null, result => {
        document.querySelector('#chatVersNum').innerText = result.chatLedger.version;
    });
}