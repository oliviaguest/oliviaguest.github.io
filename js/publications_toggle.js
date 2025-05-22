 function togglePublications(s) {
    var ps = document.getElementsByClassName('deselected');
    var h = document.getElementById('publications');

    console.log(s.innerHTML);
    
    if (s.innerHTML == '(see full)') {
        for (var i=0;i<ps.length;i+=1){
            ps[i].style.display = "block";
        }


        s.innerHTML = "(see selected)";
        h.innerHTML = "Publications";
    } else {
            for (var i=0;i<ps.length;i+=1){
            ps[i].style.display = "none";
        }


        s.innerHTML = "(see full)";
        h.innerHTML = "Selected Publications";
    }



  };
