function fixAltmetric() {
  var $width = $(window).width();

  if ($width < (550 + 280)) {
    $('.altmetric-embed').attr('data-badge-popover', 'left');
  } else {
    $('.altmetric-embed').attr('data-badge-popover', 'right');
  }
};

$(document).ready(function() {
  fixAltmetric();
});


// This doesn't work as one might expect:
// $(window).on('resize', function () {
//   fixAltmetric();
// });