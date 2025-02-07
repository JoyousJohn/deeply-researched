$('.status-option').click(function() {
    if ($(this).hasClass('status-option-selected')) return;
    $('.status-option-selected').removeClass('status-option-selected')
    $(this).addClass('status-option-selected')
})