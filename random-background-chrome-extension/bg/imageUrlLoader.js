// load all image urls using certain api structure
var imageUrlLoader = (function () {
    var curRule = null;
    function parseAndLoad(structure, imageList) {
        curRule = structure;
        var apis = structure.apis;
        var promises = [];
        for (var i = 0; i < apis.length; i++) {
            if (apis[i].enabled) {
                var p = getAll([{}], apis[i]).then(function (values) {
                    imageList.push.apply(imageList, values);
                });
                promises.push(p);
            }
        }
        return Promise.all(promises).then(function () {
            console.log(imageList);
            _shuffle(imageList);
        });
    }

    function getAllItems(item, rule) {
        if (rule.type === 'info_json') {
            var url = fillUrl(rule, item);
            var list = [];
            var itemPromise = getItemsList(rule, url, list);
            function afterPromise() {
                var finalList = _randomPick(list, rule.restrict);
                return finalList;
            }
            itemPromise = itemPromise.then(afterPromise, afterPromise);
            return itemPromise;
        } else if (rule.type === "image_json") {
            var srcLink = item.getLink;
            srcLink = srcLink ? srcLink : getLink(rule, item);
            //console.warn(srcLink);
            return Promise.resolve({ url: getValFromPath(item, rule.imageUrlPath), link: srcLink });
        } else {
            return Promise.resolve([]);
        }
    }

    function getAll(items, rule) {
        if (rule) {
            var promises = [];
            for (var i = 0; i < items.length; i++) {
                promises.push(getAllItems(items[i], rule));
            }
            return Promise.all(promises).then(function (values) {
                var newitems = [].concat.apply([], values);
                return getAll(newitems, rule.item);
            })
        } else {
            console.log("search finish");
            return Promise.resolve(items);
        }
    }

    function getItemsList(rule, url, list) {
        if (url) {
            return new Promise(function (resolve, reject) {
                $.getJSON(url, function (data) {
                    var link = getLink(rule, data);
                    var item = getValFromPath(data, rule.item.path);
                    if (item.length) {
                        list.push.apply(list, item);
                    } else {
                        list.push(item);
                    }
                    // if link is in parent, then bind link to all the children
                    list.forEach(function (it) { it.getLink = link })
                    var nextUrl = getValFromPath(data, rule.nextUrl);
                    if (nextUrl) {
                        getItemsList(rule, nextUrl, list).then(function () { resolve(list) });
                    } else {
                        resolve(list);
                    }
                }).fail(function () { resolve(list) });
            });
        } else {
            return Promise.resolve(list);
        }
    }
    function fillUrl(rule, obj) {
        var baseUrl = rule.url;
        if (rule.params) {
            for (var i = 0; i < rule.params.length; i++) {
                var paramdef = rule.params[i];
                var source = paramdef.localParam.source;
                var sourceObj = null;
                var value = null;
                if (source === 'localStorage') {
                    sourceObj = localStorage;
                }
                if (source === 'json') {
                    sourceObj = obj;
                }
                if (source === 'rule') {
                    sourceObj = curRule;
                }
                value = getValFromPath(sourceObj, paramdef.localParam.path);
                if (value !== undefined)
                    baseUrl = setUrlParam(baseUrl, paramdef.urlParam, value);
            }
        }
        return baseUrl;
    }

    // get reference link
    function getLink(rule, obj) {
        var link = rule.link;
        if (link) {
            if (typeof link === 'string') {
                return link;
            }
            if (typeof link === 'object') {
                if (link.url) {

                    return fillUrl(link, obj);
                }
                if (link.path) {
                    return getValFromPath(obj, link.path);
                }
            }
        }
        return null;
    }

    function setUrlParam(url, paramName, value) {
        var str = paramName + '=' + value;
        var idx = url.indexOf("?");
        if (idx < 0) {
            url = url + '?';
        }
        return url + '&' + str;
    }

    // TODO: handle path /*/abc/*/c
    function getValFromPath(obj, propertyPath) {
        if (!obj || !propertyPath) {
            return;
        }
        var pathArray = propertyPath.split('/');
        var currentObj = undefined;
        try {
            if (obj === localStorage) {
                var key = pathArray.shift();
                obj = localStorage.getItem(key);
                if (pathArray.length > 0) {
                    obj = JSON.parse(obj);
                }
            }
            currentObj = obj;
            for (var i = 0; i < pathArray.length; i++) {
                if (pathArray[i] === '' || pathArray[i] === "*") {
                    currentObj = currentObj;
                } else if (pathArray[i] === '[random]') {
                    var length = currentObj.length;
                    currentObj = currentObj[parseInt(Math.random() * length)];
                }
                else {
                    currentObj = currentObj[pathArray[i]];
                }
            }
        } catch (err) {
            console.error(err);
            currentObj = undefined;
        }
        return currentObj;
    }
    return { parseAndLoad }
})();