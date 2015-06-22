var simbook = {
    content_id: "#content",
    sidebar_id: "#sidebar",
    siderbar_file: "./TOC.md",
    content_file: "./Readme.md"
};

simbook.execute = function(){
    if(sidebar){
        this.updateSidebar();
    }

    if(content){
        this.updateContent();
    }
}

simbook.updateSidebar = function(){
    d3.text(simbook.siderbar_file,function(error, toc){

        var md = marked(toc);

        var sidebar_div = d3.select(simbook.sidebar_id)
                        .html(function(){
                            return md;
                        });

        sidebar_div.selectAll("li a")
            .on("click",function(){
                var path = d3.select(this).attr("href");
                simbook.content_file = "./" + path.slice(1, path.length);
                simbook.updateContent();
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
