  window.onload = function() {
    var s = localStorage["s"];
    console.log('top', s);
    if (typeof s !== 'undefined' && s !== null && s !== 'null') {
      console.log('if', s);
      myFunction(s);
    }
    // becasue I load the moon icon as default, if the user has darkmode as default in their own setttings, this now needs to be a sun
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        myFunction('dark');
        console.log('user setting');
    }
  // };

  //   window.onload = function() {
        const images = ['url("../images/page3.png")', 'url("../images/page4.png")', 'url("../images/page6.png")', 'url("../images/page8.png")'];
        const randomImage = images[Math.floor(Math.random() * images.length)];

        const locations = ['top', 'center', 'bottom'];
        const randomLocation = locations[Math.floor(Math.random() * locations.length)];

        document.getElementById("header").style.backgroundImage = randomImage;
        document.getElementById("header").style.backgroundPosition = randomLocation;

        document.getElementById("deco-footer").style.backgroundImage = randomImage;
        document.getElementById("deco-footer").style.backgroundPosition = randomLocation;
    };



  function myFunction(s) {
      localStorage["s"] = s; // save in local storage the preference just selected
      // localStorage["s"] = null; // save in local storage the preference just selected

      // root = document.querySelector(":root");


      console.log('func', s);

      // no matter what, we know the user requested s as the dark or light option, so set body to that class
      document.body.className = s; // NB: this makes a strong assumption that body has no other classes, since it overwrites them

      // it could be the case this preference is not reflected in the icon/page etc.
      try {
        // get the icon
        var e = document.getElementById(s);

        // if the selected setting is dark, then the icon should now switch to the sun, so as to be able to revert back to light
        if (s == 'dark') {
          e.classList.remove("fa-moon");
          e.classList.add("fa-sun");
          e.id = 'light';

          // root.classList.remove('light');
          // root.classList.add('dark');

        }
        // otherwise the opposite
        else if (s == 'light') {
          e.classList.add("fa-moon");
          e.classList.remove("fa-sun");
          e.id = 'dark';
          // root.classList.remove('dark');
          // root.classList.add('light');

        }
      } catch (e) {
          // catch here because there is a chance the user is on a page that has no such button to change from light to dark
          // console.log(e instanceof TypeError); // true
          // console.log(e.message); // "null has no properties"
          // console.log(e.name); // "TypeError"
          // console.log(e.stack); // Stack of the error
      }
  };
