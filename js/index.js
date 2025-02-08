let overallTokens = {
    'input': 0,
    'output': 0,
    'cost': 0,
    'requests': 0
}

let stats = {
    'start_time': undefined,
    'end_time': undefined
}

document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.querySelector('textarea');
    
    // Function to adjust height with a maximum limit of 40vh
    function adjustHeight() {
        textarea.style.height = 'auto';  // Reset height so that scrollHeight is correctly computed
        const maxHeight = window.innerHeight * 0.40; // 40% of viewport height
        
        // Check if the content is less than or equal to maxHeight
        if (textarea.scrollHeight <= maxHeight) {
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.style.overflowY = 'hidden';
        } else {
            // Limit the height and add scrolling
            textarea.style.height = maxHeight + 'px';
            textarea.style.overflowY = 'scroll';
        }
    }
    
    // Adjust on input
    textarea.addEventListener('input', adjustHeight);
    
    // Initial adjustment
    adjustHeight();

    $('textarea').val('')

    newActivity('Awaiting instructions')

});

$('.settings').click(function() {
    $('.settings-wrapper').show();
})

$('textarea').on('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

$('.search-wrapper').click(function(event) {
    $('textarea').focus(); // Focus on the textarea
    $('.search-wrapper').css('background-color', 'rgb(33, 78, 147)').css('width', '57%')
});


$('textarea').on('blur', function() {
    $('.search-wrapper').css('background-color', 'rgb(73, 73, 73)')
});

function disableBar() {
    $('textarea').val('Deeply researching...').css('height', '').prop('disabled', true).css('pointer-events', 'none').css('text-align', 'center');
    $('.search-arrow').text('■')
    $('.search-wrapper').css('cursor', 'default').css('background-color', 'rgb(52, 52, 52)')
}

function enableBar() {
    $('textarea').val('').prop('disabled', false).css('pointer-events', 'all').attr('placeholder', 'Enter a message').css('text-align', 'left').focus();
    $('.search-arrow').text('➜')
    $('.search-wrapper').css('cursor', '').css('background-color', 'rgb(33, 78, 147)')
}

function newModelMessageElm(debug) {
    const $msgElm = $(`<div class="message-wrapper"></div>`)
    if (debug) {
        $msgElm.css('color', 'gray')
    }
    $('.chat-space').append($msgElm)
}