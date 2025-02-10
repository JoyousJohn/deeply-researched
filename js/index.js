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

    checkVersion();

    if (window.location.href === 'https://joyousjohn.github.io/deeply-researched/') {
        $('.demo-disclaimer').show();
        $('.server-status').hide();
        return;
    }

    fetch('http://localhost:' + port)
        .then(response => {
            if (response.ok) {
                $('.server-status').fadeOut().text('Server connected!').fadeIn().css('color', '#70ff70');
                setTimeout(() => {
                    $('.server-status').fadeOut();
                }, 5000);
            }
        })
        .catch(error => {
            $('.server-status').fadeOut().text(`Couldn't connect to server`).fadeIn().css('color', '#ff5f5f'); 
            setTimeout(() => {
                $('.server-status').fadeOut();
            }, 5000);
        });

});

$('.settings').click(function() {
    $('.settings-wrapper').show();
})

function searchFocus() {
    $('textarea').focus().attr('placeholder', 'Research a topic');
    $('.search-wrapper').css('background-color', 'rgb(33, 78, 147)').css('width', '57%')
}

$('textarea').on('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        sendMessage();
    }
});

$(document).on('keydown', function(event) {
    if (event.altKey && event.key === 'c') {
        event.preventDefault();
        searchFocus();
    }
})


$('.search-wrapper').click(function(event) {
    if (searching) { return; }
    searchFocus();
});


$('textarea').on('blur', function() {
    $('.search-wrapper').css('background-color', 'rgb(73, 73, 73)')
});

let searching = false;

function disableBar() {
    searching = true;
    $('textarea').val('Deeply researching...').css('height', '').prop('disabled', true).css('pointer-events', 'none').css('text-align', 'center');
    $('.search-arrow').text('■').css('background-color', '#d4d4d4')
    $('.search-wrapper').css('cursor', 'default').css('background-color', 'rgb(52, 52, 52)')
    $('.throbber-wrapper').fadeIn();
}

function enableBar() {
    searching = false;
    $('textarea').val('').prop('disabled', false).css('pointer-events', 'all').attr('placeholder', 'Follow up').css('text-align', 'left').focus();
    $('.search-arrow').text('➜').css('background-color', 'white')
    $('.search-wrapper').css('cursor', '').css('background-color', 'rgb(33, 78, 147)')
    $('.throbber-wrapper').hide();
}


function newModelMessageElm(debug) {
    const $msgElm = $(`<div class="message-wrapper"></div>`)
    if (debug) {
        $msgElm.css('color', 'gray')
    }
    $('.chat-space').append($msgElm)
}


function checkVersion() {
    fetch('https://raw.githubusercontent.com/JoyousJohn/deeply-researched/refs/heads/main/js/ver.js')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            // Use Function to execute the code and retrieve the version
            const getVersion = new Function(data + '; return ver;');
            const latestVersion = getVersion();
            if (ver !== latestVersion) {
                console.log("New version available!")
                $('.github').append($(`<div class="text-1p2rem" style="color: #9397d7">New version available.</div>`))
            }
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}