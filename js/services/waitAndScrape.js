result = scrapeValue(cssSelector);

function scrapeValue(selector){
    if(document.querySelector(`${selector}`).nodeName.toLowerCase() == 'input') {  
        console.log(selector);
        console.log(document.querySelector(`${selector}`).value);
        return document.querySelector(`${selector}`).value;
    } else {
        console.log(selector);
        console.log(document.querySelector(`${selector}`).innerText);
        return document.querySelector(`${selector}`).innerText;
    }
}

function checkLoaded(selector) {
    console.log(selector);
    // check if its ready
    if(document.querySelector(selector) === null) {
        // wait 2 seconds and try again
        console.log('wait 2 sec');
        setTimeout((function(){ checkLoaded(); }), 2000);
    } else {
        scrapeValue(selector);
    }
}