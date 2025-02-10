$('.status-option').click(function() {
    if ($(this).hasClass('status-option-selected')) return;
    $('.status-option-selected').removeClass('status-option-selected')
    $(this).addClass('status-option-selected')

    const selectedTab = $(this).data('option');
    $('.sources, .activity, .outline').hide();
    $(`.${selectedTab}`).show();
})

$(document).keydown(function(e) {
    const selected = $('.status-option-selected').data('option');
    if ($('textarea').is(':focus')) return;
    if (e.key === 'ArrowLeft') {
        if (selected === 'sources') {
            $('.status-option[data-option="activity"]').click();
        } else if (selected === 'outline') {
            $('.status-option[data-option="sources"]').click();
        }
    } else if (e.key === 'ArrowRight') {
        if (selected === 'activity') {
            $('.status-option[data-option="sources"]').click();
        } else if (selected === 'sources') {
            $('.status-option[data-option="outline"]').click();
        }
    }
});

