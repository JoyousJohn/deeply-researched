const defaultSettings = {
    'braveKey': null,
    'reasoningModelId': '',
    'reasoningBase': null,
    'reasoningKey': null,

    'decoderModelId': '',
    'decoderBase': null,
    'decoderKey': null
}

let settings = {}
let decoderModelId, decoderBase, decoderKey
let braveKey

$(document).ready(function() {
    if (!localStorage.getItem('settings')) {
        localStorage.setItem('settings', JSON.stringify(defaultSettings));
    }
    settings = JSON.parse(localStorage.getItem('settings'));

    // Load saved settings into input fields
    $('.api-key-input').each(function() {
        const inputKey = $(this).data('key');
        if (inputKey && settings[inputKey]) {
            $(this).val(settings[inputKey]);
        } else {
            $(this).val('');
        }
    });

    $('.confirm-button').on('click', function() {
        const apiKeyInputs = $(this).siblings('.api-key-input');
        
        apiKeyInputs.each(function() {
            const inputKey = $(this).data('key');
            const value = $(this).val();
            if (inputKey) {
                settings[inputKey] = value;
                console.log(`Saving ${inputKey}:`, value);
            }
        });

        localStorage.setItem('settings', JSON.stringify(settings));

        $('.saved-message').slideDown('fast');
        setTimeout(function() {
            $('.saved-message').slideUp('fast');
        }, 3000);

    });

    decoderModelId = settings['decoderModelId']
    decoderBase = settings['decoderBase']
    decoderKey = settings['decoderKey']
    braveKey = settings['braveKey']

    $('.model-name').text(decoderModelId.replaceAll('-', ' '))

})

$(document).keydown(function(event) {
    if (event.key === "Escape") {
        $('.settings-wrapper').hide();
    }
});
