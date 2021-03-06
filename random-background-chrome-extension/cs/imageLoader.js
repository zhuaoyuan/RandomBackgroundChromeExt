chrome.runtime.sendMessage({ type: 'QUERY' }, function (response) {
    console.log(response);
    onloadImage(response);
})

var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
var img = new Image();
var base64Url, imageType;

function onloadImage(data) {
    vm.image = data;
    console.log(data);
    var imageSrc = data.url;
    if (data.data) {
        imageSrc = getImageSrcFromBase64(data.url, data.data);
        base64Url = imageSrc;
        imageType = mapImageType(data.url);
    }
    $(`<style id="rbkstyle" type="text/css">body{ background-image:url(${imageSrc}) !important;background-size:cover !important; }  </style>`).appendTo($('body'));
    img.onload = function () {
        afterRendered();
    }
    if (data.data) {
        img.src = getImageSrcFromBase64(data.url, data.data);
        afterRendered();
    } else {
        var oReq = new XMLHttpRequest();
        oReq.open("GET", data.url, true);
        oReq.responseType = "arraybuffer";
        oReq.onload = function (oEvent) {
            var arrayBuffer = oReq.response; // Note: not oReq.responseText
            var base64str = _arrayBufferToBase64(arrayBuffer);
            img.src = getImageSrcFromBase64(data.url, base64str);
            afterRendered();
        };
        oReq.send();
        oReq.onerror = function (e) {
            console.error(e);
        };
    }
}


function mapImageType(url) {
    var jpg = /\.(jpg)|(jpeg)/;
    var png = /\.png/;
    var gif = /\.gif/;
    if (jpg.test(url)) {
        return 'jpg';
    } else if (png.test(url)) {
        return 'png';
    } else if (gif.test(url)) {
        return 'gif';
    } else {
        return 'png';
    }
}

function getImageSrcFromBase64(url, data) {
    return `data:image/${mapImageType(url)};base64,` + data;
}

function afterRendered() {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    watchDom();
    var interval = setInterval(function () {
        watchDom();
        setTimeout(function () {
            clearInterval(interval)
        }, MINUTE);
    }, 1000)
    $(window).on('resize', watchDom);
}

// check and change the corner text to white if background is dark
function watchDom() {
    changeElementFontColor($('#mngb > div > div > div'));
    changeElementFontColor($('#setting-panel > .mdl-button'));
}

function changeElementFontColor(elm) {
    var rect = element2ImageRect(elm);
    if (rect && rect.width && rect.height) {
        var imageData = ctx.getImageData(rect.left, rect.top, rect.width, rect.height);
        var total = imageData.height * imageData.width;
        var red = 0;
        var green = 0;
        var blue = 0;
        for (var i = 0; i < total; i++) {
            red += imageData.data[i * 4];
            green += imageData.data[i * 4 + 1];
            blue += imageData.data[i * 4 + 2];
        }
        red = red / total;
        green = green / total;
        blue = blue / total;
        var average = red * 0.299 + green * 0.587 + blue * 0.114;
        var jqElm = $(elm);
        // If greyscale of background in the rect area is low then change the font color to white
        if (average < 128) {
            jqElm.css('color', 'white');
            jqElm.css('fill', 'white');
            jqElm.find('a').css('color', 'white');
            jqElm.find('span').css('color', 'white');
        } else {
            jqElm.css('color', '');
            jqElm.css('fill', '');
            jqElm.find('a').css('color', '');
            jqElm.find('span').css('color', '');
        }
    }
}

// Change the client rect of element to the rect of background image
function element2ImageRect(elm) {
    var elm = $(elm);
    if (elm.length > 0) {
        var elmRect = elm[0].getClientRects()[0];
        var windowHeight = window.innerHeight;
        var windowWidth = window.innerWidth;
        var imgWidth = img.width;
        var imgHeight = img.height;
        var rect = {};
        var scale = windowWidth / imgWidth;
        rect.left = elmRect.left / scale;
        rect.top = elmRect.top / scale;
        rect.width = elmRect.width / scale;
        rect.height = elmRect.height / scale;
        return rect;
    }
    return null;
}
