$(document).ready(function() {
   $('.btnTraduction').click(function() {

        let url = $(this).data('url');

        $.ajax({
            url: url,
            method: "get",
            success: function(lang) {

                location.reload();
            }
        });

        return false;
        
   });
});