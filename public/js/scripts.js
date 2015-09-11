var queue = []
var generateQueueHtml = function(songTitle, artist, albumCoverUrl, id) {
    return '<li class="collection-item avatar"><img src="' + albumCoverUrl + '" alt="n/a" class="circle"><span class="title">' + songTitle + '</span><p>' + artist + '</p><a href="" onclick="removeFromQueue(\''+id+'\');return false;" class="secondary-content"><i class="material-icons small">delete</i></a></li></ul>'
}

var generateSearchResultHtml = function(q, id) {
    return '<li class="collection-item avatar"><img src="' + q.album.images[0].url + '" alt="n/a" class="circle"><span class="title">' + q.name + '</span><p>' + q.artists.map(function(v) { return v.name }).join(", ") + '</p><a href="" onclick="addToQueue(\''+id+'\');return false;" class="secondary-content"><i class="material-icons small">add</i></a></li></ul>'
}

$(document).ready(function() {
    // the "href" attribute of .modal-trigger must specify the modal ID that wants to be triggered
    $('.modal-trigger').leanModal();
});

var refreshQueue = function() {
    window.html = ""
    $.ajax({
        url: "/queue"
    }).done(function(i) {
        console.log(queue)
        if (i.toString() !== queue.toString()) {
            queue = i
            $('#queueContainer').html("")
            for (var i = 0; i <queue.length; i++) {
                window.thing = queue[i]

                $.ajax({
                    url: "https://api.spotify.com/v1/tracks/" + queue[i]
                }).done(function(x) {
                    console.log(thing)
                    html += generateQueueHtml(x.name, x.artists.map(function(v) {
                        return v.name
                    }).join(", "), x.album.images[0].url, thing)
                    $('#queueContainer').html(html)
                });
            };
        }
    });
    $.ajax({url:"/nowplaying"}).done(function(i){
        console.log("now playing: "+i);
        window.nowplaying=i;
        if(i==="cat"){
            $("#playingContainer").html("NOTHING IS PLAYINGGGGGG");
        }else{
        $.ajax({
                    url: "https://api.spotify.com/v1/tracks/" + i
                }).done(function(x) {
                    var artist=x.artists.map(function(v) {
                        return v.name
                    }).join(", ");
                    var html='<li class="collection-item avatar"><img src="' + x.album.images[0].url + '" alt="n/a" class="circle"><span class="title">' + x.name + '</span><p>' + artist + '</p></li>';
                   $("#playingContainer").html(html);
                    console.log("now playing" + html);
                });
        }
    });
}

var removeFromQueue = function (obj) {
    $.ajax({
        url: "/queue/remove?id="+obj
    });
    return false
}

var addToQueue = function (obj) {
    $.ajax({
        url: "/queue/add?id="+obj
    });
    $('#add').closeModal();
    return false
}

var refresh = function() {
    refreshQueue();
}

var songSearch = function(query, callback) {
    $.ajax({
        url: "/search?q=" + query
    }).done(function(data){
        window.lol = data
        var html2 = ""
        $("#results").html("");
        for (var i = 0; i < data.length; i++) {
            window.lol2 = i
            $.ajax({
                url: "https://api.spotify.com/v1/tracks/" + data[i].substring(14)
            }).done(function(p){
                html += generateSearchResultHtml(p, p.id)
                console.log(p)
                $("#results").html(html);
            });
        };
    })
}

setInterval(function() {
    refresh();
}, 1000);

$('#song-search').keyup(function() {
    var value = document.getElementById('song-search').value;
    console.log(value)
    songSearch(value);
});
