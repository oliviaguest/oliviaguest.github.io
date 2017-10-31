$(document).ready(function() {
      fixAltmetric();
});

function fixAltmetric() {
      var $width = $(window).width();

      if ($width < 550+280) {
            $(".altmetric-embed").attr("data-badge-popover", "left");
      } else {
            $(".altmetric-embed").attr("data-badge-popover", "right");
      }
};
