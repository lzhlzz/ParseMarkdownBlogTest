var simbook = {
    content_id: "#content",
    sidebar_id: "#sidebar",

    siderbar_file: "./TOC.md",
    content_file: "./README.md",

    siderbar_txt: "",
    content_txt: ""
};

simbook.execute = function(){

    var initPath = location.hash;
    if(initPath != ""){
        simbook.content_file = initPath.replace("#", "./");
    }

    if(simbook.sidebar_id){
        simbook.updateSidebar();
    }

    if(simbook.content_id){
        simbook.updateContent();
    }

    $(window).on('hashchange', function(){
        var path = location.hash.replace("#", "./");
        if(path != ""){
            simbook.content_file = path;
            simbook.updateContent();
        }
    });

}

simbook.updateSidebar = function(){
    d3.text(simbook.siderbar_file,function(error, toc){

        var md = marked(toc);
        
        var sidebar_div = d3.select(simbook.sidebar_id)
                        .html(function(){
                            return md;
                        });
    });
}


simbook.updateContent = function(){

    d3.text(simbook.content_file,function(error, content){

        marked.setOptions({
          langPrefix: ''
        });

       var md = marked(content);
        
        var ctx = d3.select(simbook.content_id)
                        .html(function(){
                            return md;
                        });

        $(simbook.content_id + ' pre code').each(function(i, block) {
            hljs.highlightBlock(block);
        });

    });
}

